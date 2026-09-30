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
    private final com.align.qms.queue.QueueRepository queueRepository;
    private final com.align.qms.audit.AdminAuditService adminAuditService;
    private final com.align.qms.location.LocationScheduleService locationScheduleService;

    public StaffOperationsService(TokenRepository tokenRepository,
                                  CounterRepository counterRepository,
                                  TokenEventService tokenEventService,
                                  com.align.qms.queue.QueueRepository queueRepository,
                                  com.align.qms.audit.AdminAuditService adminAuditService,
                                  com.align.qms.location.LocationScheduleService locationScheduleService) {
        this.tokenRepository = tokenRepository;
        this.counterRepository = counterRepository;
        this.tokenEventService = tokenEventService;
        this.queueRepository = queueRepository;
        this.adminAuditService = adminAuditService;
        this.locationScheduleService = locationScheduleService;
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
        Token token = tokenRepository.findNextAssignedWaitingTokenWithLock(counter.getLocationId(), counterId)
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
        if (previousState == TokenState.CALLED) {
            token.transitionTo(TokenState.IN_SERVICE);
            token.setServedAt(Instant.now());
            // Record implicit start event
            tokenEventService.recordEvent(token, TokenEventType.TOKEN_SERVING_STARTED, previousState, null);
            previousState = TokenState.IN_SERVICE;
        }

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

    @Transactional
    public com.align.qms.token.dto.TokenResponse transferToken(UUID tokenId, com.align.qms.token.dto.TokenTransferRequest request) {
        if (request.getIdempotencyKey() != null) {
            java.util.Optional<Token> existingToken = tokenRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existingToken.isPresent()) {
                Token t = existingToken.get();
                // Validate it represents the same transfer operation
                if (t.getTransferredToTokenId() == null && t.getServiceId().equals(request.getTargetServiceId())) {
                    return com.align.qms.token.dto.TokenResponse.from(t); // Already transferred
                }
            }
        }

        com.align.qms.queue.Queue targetQueue = queueRepository.findByServiceIdForUpdate(request.getTargetServiceId())
                .orElseThrow(() -> new IllegalArgumentException("Target service has no queue"));

        if (!locationScheduleService.isLocationOpen(targetQueue.getLocationId(), Instant.now())) {
            throw new com.align.qms.exception.LocationClosedException(targetQueue.getLocationId());
        }

        if (targetQueue.getStatus() != com.align.qms.queue.QueueStatus.ACTIVE) {
            throw new IllegalStateException("Target queue is not ACTIVE");
        }

        Token oldToken = tokenRepository.findByIdForUpdate(tokenId)
                .orElseThrow(() -> new TokenNotFoundException(tokenId));

        validateTokenTenant(oldToken);

        if (oldToken.getQueueId().equals(targetQueue.getId())) {
            throw new IllegalArgumentException("Cannot transfer to the same queue");
        }
        if (!oldToken.getOrgId().equals(targetQueue.getOrgId()) || !oldToken.getLocationId().equals(targetQueue.getLocationId())) {
            throw new IllegalArgumentException("Cross-tenant or cross-location transfer not allowed");
        }
        if (oldToken.getState() != TokenState.WAITING && oldToken.getState() != TokenState.CALLED && oldToken.getState() != TokenState.IN_SERVICE) {
            throw new com.align.qms.exception.InvalidTokenStateException("Token must be WAITING, CALLED, or IN_SERVICE to transfer");
        }

        // Active count check
        long activeCount = tokenRepository.countByQueueIdAndStateIn(
                targetQueue.getId(),
                java.util.EnumSet.of(TokenState.WAITING, TokenState.AWAY, TokenState.CALLED, TokenState.IN_SERVICE)
        );
        if (targetQueue.getMaxCapacity() > 0 && activeCount >= targetQueue.getMaxCapacity()) {
            throw new com.align.qms.exception.QueueFullException(targetQueue.getId(), targetQueue.getName(), activeCount, targetQueue.getMaxCapacity());
        }

        TokenState previousState = oldToken.getState();

        Token newToken = new Token(
                targetQueue.getOrgId(),
                targetQueue.getLocationId(),
                targetQueue.getServiceId(),
                targetQueue.getId(),
                targetQueue.getTokenPrefix() + "-" + String.format("%03d", targetQueue.getNextTokenNumber()),
                oldToken.getCustomerName(),
                oldToken.getCustomerPhone(),
                request.getIdempotencyKey(),
                oldToken.getSmsConsent()
        );
        newToken.setJourneyStageId(oldToken.getJourneyStageId());
        targetQueue.setNextTokenNumber(targetQueue.getNextTokenNumber() + 1);
        queueRepository.save(targetQueue);

        newToken.setPriorityTimestamp(oldToken.getPriorityTimestamp() != null ? oldToken.getPriorityTimestamp() : oldToken.getJoinedAt());
        tokenRepository.save(newToken);

        oldToken.transitionTo(TokenState.TRANSFERRED);
        oldToken.setTransferredToTokenId(newToken.getId());

        if (previousState == TokenState.CALLED || previousState == TokenState.IN_SERVICE) {
            if (oldToken.getCounterId() != null) {
                Counter counter = counterRepository.findByIdForUpdate(oldToken.getCounterId()).orElse(null);
                if (counter != null && oldToken.getId().equals(counter.getCurrentServingTokenId())) {
                    counter.setCurrentServingTokenId(null);
                    counter.setServiceStartTime(null);
                    counterRepository.save(counter);
                }
            }
        }
        tokenRepository.save(oldToken);

        adminAuditService.logEvent(oldToken.getOrgId(), oldToken.getId(), "TOKEN", "TRANSFER", oldToken, oldToken); // simplistic for now

        // Wait, "If the existing dispatcher cannot safely target the customer token topic with the credential, STOP and report the architecture issue instead of weakening security."
        // We will NOT emit the JWT in the payload. We will just emit the standard token events.
        tokenEventService.recordEvent(oldToken, TokenEventType.TOKEN_TRANSFERRED, previousState, null);
        tokenEventService.recordEvent(newToken, TokenEventType.TOKEN_CREATED, null, null);

        return com.align.qms.token.dto.TokenResponse.from(newToken);
    }

    @Transactional(readOnly = true)
    public List<Token> getWaitingTokens(UUID queueId) {
        // Validation could be added to check queue ownership
        return tokenRepository.findByQueueIdAndStateOrderByPriorityTimestampAscJoinedAtAsc(queueId, TokenState.WAITING);
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
