package com.align.qms.token;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterRepository;
import com.align.qms.exception.CounterAlreadyServingException;
import com.align.qms.exception.CounterMismatchException;
import com.align.qms.exception.CounterNotAvailableException;
import com.align.qms.exception.CounterNotFoundException;
import com.align.qms.exception.NoWaitingTokensException;
import com.align.qms.exception.TokenNotFoundException;
import com.align.qms.exception.UnauthorizedTenantAccessException;
import com.align.qms.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StaffOperationsService {

    private final TokenRepository tokenRepository;
    private final CounterRepository counterRepository;
    private final TokenEventService tokenEventService;

    public StaffOperationsService(TokenRepository tokenRepository,
                                  CounterRepository counterRepository,
                                  TokenEventService tokenEventService) {
        this.tokenRepository = tokenRepository;
        this.counterRepository = counterRepository;
        this.tokenEventService = tokenEventService;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Token callNext(UUID counterId) {
        // 1. Lock counter row FOR UPDATE
        Counter counter = counterRepository.findByIdForUpdate(counterId)
                .orElseThrow(() -> new CounterNotFoundException(counterId));

        // 2. Validate Counter and Tenant
        validateCounterAndTenant(counter);

        if (counter.getCurrentServingTokenId() != null) {
            throw new CounterAlreadyServingException("Counter is currently serving a token.");
        }
        if (counter.getAvailability() != CounterAvailability.ONLINE) {
            throw new CounterNotAvailableException("Counter must be ONLINE to call next.");
        }

        // 3. Select next WAITING token FOR UPDATE SKIP LOCKED
        Token token = tokenRepository.findNextWaitingTokenWithLock(counter.getLocationId())
                .orElseThrow(NoWaitingTokensException::new);

        // 4. Mutate token
        TokenState previousState = token.getState();
        token.transitionTo(TokenState.CALLED);
        token.setCalledAt(Instant.now());
        token.setCounterId(counterId);
        token.setCalledByStaffId(TenantContext.getCurrentUserId());
        tokenRepository.save(token);

        // 5. Mutate counter
        counter.setCurrentServingTokenId(token.getId());
        counterRepository.save(counter);

        // 6. Create TOKEN_CALLED event
        tokenEventService.recordEvent(token, TokenEventType.TOKEN_CALLED, previousState, null);

        return token;
    }

    @Transactional
    public Token recall(UUID tokenId, UUID counterId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));

        validateTokenTenant(token);

        if (!counterId.equals(token.getCounterId())) {
            throw new CounterMismatchException("Token is assigned to a different counter.");
        }

        TokenState previousState = token.getState();
        // State remains CALLED. Just update calledAt.
        // We still check if it can be recalled, typically it must be in CALLED state.
        if (token.getState() != TokenState.CALLED) {
            throw new IllegalStateException("Token must be in CALLED state to be recalled.");
        }

        token.setCalledAt(Instant.now());
        tokenRepository.save(token);

        tokenEventService.recordEvent(token, TokenEventType.TOKEN_RECALLED, previousState, null);

        return token;
    }

    @Transactional
    public Token startService(UUID tokenId, UUID counterId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));

        validateTokenTenant(token);
        validateCounterMatch(token, counterId);

        TokenState previousState = token.getState();
        token.transitionTo(TokenState.IN_SERVICE);
        token.setServedAt(Instant.now());
        tokenRepository.save(token);

        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new CounterNotFoundException(counterId));
        counter.setServiceStartTime(Instant.now());
        counterRepository.save(counter);

        tokenEventService.recordEvent(token, TokenEventType.TOKEN_SERVING_STARTED, previousState, null);

        return token;
    }

    @Transactional
    public Token completeService(UUID tokenId, UUID counterId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));

        validateTokenTenant(token);
        validateCounterMatch(token, counterId);

        TokenState previousState = token.getState();
        token.transitionTo(TokenState.COMPLETED);
        token.setCompletedAt(Instant.now());
        tokenRepository.save(token);

        clearCounterServingState(counterId);

        tokenEventService.recordEvent(token, TokenEventType.TOKEN_COMPLETED, previousState, null);

        return token;
    }

    @Transactional
    public Token noShow(UUID tokenId, UUID counterId) {
        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));

        validateTokenTenant(token);
        validateCounterMatch(token, counterId);

        TokenState previousState = token.getState();
        token.transitionTo(TokenState.NO_SHOW);
        token.setCompletedAt(Instant.now());
        tokenRepository.save(token);

        clearCounterServingState(counterId);

        tokenEventService.recordEvent(token, TokenEventType.TOKEN_NO_SHOW, previousState, null);

        return token;
    }

    @Transactional(readOnly = true)
    public List<Token> getWaitingTokens(UUID queueId) {
        // Validation could be added to check queue ownership
        return tokenRepository.findByQueueIdAndStateOrderByJoinedAtAsc(queueId, TokenState.WAITING);
    }

    private void validateCounterAndTenant(Counter counter) {
        UUID currentUserOrgId = TenantContext.getCurrentOrgId();
        if (currentUserOrgId != null && !counter.getOrgId().equals(currentUserOrgId)) {
            throw new UnauthorizedTenantAccessException("Staff must belong to the same organization as the counter.");
        }
    }

    private void validateTokenTenant(Token token) {
        UUID currentUserOrgId = TenantContext.getCurrentOrgId();
        if (currentUserOrgId != null && !token.getOrgId().equals(currentUserOrgId)) {
            throw new UnauthorizedTenantAccessException("Staff must belong to the same organization as the token.");
        }
    }

    private void validateCounterMatch(Token token, UUID counterId) {
        if (!counterId.equals(token.getCounterId())) {
            throw new CounterMismatchException("Token is assigned to a different counter.");
        }
    }

    private void clearCounterServingState(UUID counterId) {
        Counter counter = counterRepository.findByIdForUpdate(counterId)
                .orElseThrow(() -> new CounterNotFoundException(counterId));
        counter.setCurrentServingTokenId(null);
        counter.setServiceStartTime(null);
        // Explicit rule: availability remains ONLINE. It does NOT go offline.
        counterRepository.save(counter);
    }
}
