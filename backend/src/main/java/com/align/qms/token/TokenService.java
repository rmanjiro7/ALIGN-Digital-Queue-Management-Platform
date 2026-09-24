package com.align.qms.token;

import com.align.qms.exception.InvalidTokenStateException;
import com.align.qms.exception.QueueFullException;
import com.align.qms.exception.QueuePausedException;
import com.align.qms.exception.StepAwayAlreadyUsedException;
import com.align.qms.exception.TokenNotFoundException;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.queue.QueueStatus;
import com.align.qms.security.UserPrincipal;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenPositionResponse;
import com.align.qms.token.dto.TokenResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;

@Service
public class TokenService {

    private final TokenRepository tokenRepository;
    private final TokenEventService tokenEventService;
    private final QueueRepository queueRepository;
    private final com.align.qms.security.JwtService jwtService;
    
    @Autowired
    @Lazy
    private TokenService self;

    public TokenService(TokenRepository tokenRepository, 
                        TokenEventService tokenEventService, 
                        QueueRepository queueRepository,
                        com.align.qms.security.JwtService jwtService) {
        this.tokenRepository = tokenRepository;
        this.tokenEventService = tokenEventService;
        this.queueRepository = queueRepository;
        this.jwtService = jwtService;
    }

    public TokenResponse joinQueue(TokenJoinRequest request) {
        if (request.getIdempotencyKey() != null) {
            Optional<Token> existingToken = tokenRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existingToken.isPresent()) {
                Token t = existingToken.get();
                return TokenResponse.from(t, jwtService.generateCustomerRealtimeToken(t));
            }
        }

        try {
            return self.joinQueueTx(request);
        } catch (DataIntegrityViolationException ex) {
            if (request.getIdempotencyKey() != null) {
                return tokenRepository.findByIdempotencyKey(request.getIdempotencyKey())
                        .map(t -> TokenResponse.from(t, jwtService.generateCustomerRealtimeToken(t)))
                        .orElseThrow(() -> ex);
            }
            throw ex;
        }
    }

    @Transactional
    public TokenResponse joinQueueTx(TokenJoinRequest request) {
        Queue queue = queueRepository.findByServiceIdForUpdate(request.getServiceId())
                .orElseThrow(() -> new IllegalArgumentException("Queue not found for service: " + request.getServiceId()));

        if (queue.getStatus() == QueueStatus.PAUSED || queue.getStatus() == QueueStatus.CLOSED) {
            throw new QueuePausedException(queue.getId(), "Queue is currently " + queue.getStatus());
        }

        EnumSet<TokenState> activeStates = EnumSet.of(
            TokenState.WAITING, TokenState.AWAY, TokenState.CALLED, TokenState.IN_SERVICE
        );
        long activeCount = tokenRepository.countByQueueIdAndStateIn(queue.getId(), activeStates);

        if (activeCount >= queue.getMaxCapacity()) {
            if (queue.isAutoPauseAtCapacity() && queue.getStatus() == QueueStatus.ACTIVE) {
                queue.setStatus(QueueStatus.PAUSED);
                queueRepository.save(queue);
            }
            throw new QueueFullException(queue.getId(), queue.getName(), activeCount, queue.getMaxCapacity());
        }

        long nextNumber = queueRepository.allocateNextTokenNumber(queue.getId());
        String tokenString = String.format("%s%03d", queue.getTokenPrefix(), nextNumber);

        Token token = new Token(
                queue.getOrgId(),
                queue.getLocationId(),
                queue.getServiceId(),
                queue.getId(),
                tokenString,
                request.getCustomerName(),
                request.getCustomerPhone(),
                request.getIdempotencyKey()
        );

        token = tokenRepository.saveAndFlush(token);
        
        tokenEventService.recordEvent(token, TokenEventType.TOKEN_CREATED, null, null);

        return TokenResponse.from(token, jwtService.generateCustomerRealtimeToken(token));
    }

    private void validateTenantAccess(Token token) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            if (!"PLATFORM_ADMIN".equals(principal.getRole().name()) && !principal.getOrgId().equals(token.getOrgId())) {
                throw new AccessDeniedException("Cannot access token from a different organization");
            }
        }
    }

    @Transactional(readOnly = true)
    public TokenResponse getToken(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));
        validateTenantAccess(token);
        return TokenResponse.from(token);
    }

    @Transactional(readOnly = true)
    public TokenPositionResponse getTokenPosition(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));
        validateTenantAccess(token);

        long tokensAhead = 0;
        if (token.getState() == TokenState.WAITING) {
            tokensAhead = tokenRepository.countTokensAhead(
                    token.getQueueId(),
                    EnumSet.of(TokenState.WAITING, TokenState.AWAY),
                    token.getPriorityTimestamp(),
                    token.getJoinedAt()
            );
        }

        int estimatedWaitTimeMinutes = calculateEstimatedWaitTime(tokensAhead);

        return new TokenPositionResponse(token.getTokenNumber(), token.getState(), tokensAhead, estimatedWaitTimeMinutes);
    }

    @Transactional(readOnly = true)
    public TokenResponse transferRecovery(UUID oldTokenId) {
        Token oldToken = tokenRepository.findById(oldTokenId)
                .orElseThrow(() -> new TokenNotFoundException(oldTokenId));

        validateTenantAccess(oldToken);

        if (oldToken.getState() != TokenState.TRANSFERRED) {
            throw new InvalidTokenStateException("Token is not in TRANSFERRED state");
        }

        if (oldToken.getTransferredToTokenId() == null) {
            throw new IllegalStateException("Transfer target not found");
        }

        Token newToken = tokenRepository.findById(oldToken.getTransferredToTokenId())
                .orElseThrow(() -> new IllegalStateException("New token not found"));

        return TokenResponse.from(newToken, jwtService.generateCustomerRealtimeToken(newToken));
    }

    @Transactional
    public TokenResponse cancelToken(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));
        validateTenantAccess(token);
        
        TokenState oldState = token.getState();
        token.transitionTo(TokenState.CANCELLED);
        
        token = tokenRepository.save(token);
        tokenEventService.recordEvent(token, TokenEventType.TOKEN_CANCELLED, oldState, null);

        return TokenResponse.from(token);
    }

    @Transactional
    public TokenResponse stepAway(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));
        validateTenantAccess(token);

        if (token.getStepAwayExpiresAt() != null) {
            throw new StepAwayAlreadyUsedException("Step-away allowance has already been used.");
        }

        TokenState oldState = token.getState();
        token.transitionTo(TokenState.AWAY);
        token.setStepAwayExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));

        token = tokenRepository.save(token);
        tokenEventService.recordEvent(token, TokenEventType.TOKEN_STEP_AWAY_STARTED, oldState, null);

        return TokenResponse.from(token);
    }

    @Transactional(noRollbackFor = InvalidTokenStateException.class)
    public TokenResponse returnFromStepAway(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));
        validateTenantAccess(token);

        if (token.getStepAwayExpiresAt() != null && token.getStepAwayExpiresAt().isBefore(Instant.now())) {
            TokenState oldState = token.getState();
            token.transitionTo(TokenState.EXPIRED);
            token = tokenRepository.save(token);
            tokenEventService.recordEvent(token, TokenEventType.TOKEN_STEP_AWAY_EXPIRED, oldState, null);
            throw new InvalidTokenStateException("Step-away allowance has expired.");
        }

        TokenState oldState = token.getState();
        token.transitionTo(TokenState.WAITING);
        token.setStepAwayExpiresAt(null);

        token = tokenRepository.save(token);
        tokenEventService.recordEvent(token, TokenEventType.TOKEN_STEP_AWAY_RETURNED, oldState, null);

        return TokenResponse.from(token);
    }

    private int calculateEstimatedWaitTime(long tokensAhead) {
        return (int) (tokensAhead * 5);
    }
}
