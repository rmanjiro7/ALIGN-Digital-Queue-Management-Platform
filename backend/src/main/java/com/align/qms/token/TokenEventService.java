package com.align.qms.token;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterRepository;
import com.align.qms.token.event.TokenRealtimePayload;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class TokenEventService {

    private final TokenEventRepository tokenEventRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final CounterRepository counterRepository;

    public TokenEventService(TokenEventRepository tokenEventRepository,
                             ApplicationEventPublisher applicationEventPublisher,
                             CounterRepository counterRepository) {
        this.tokenEventRepository = tokenEventRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.counterRepository = counterRepository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordEvent(Token token, TokenEventType eventType) {
        recordEvent(token, eventType, null, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordEvent(Token token, TokenEventType eventType, TokenState fromState, Map<String, Object> metadata) {
        TokenEvent event = new TokenEvent();
        event.setTokenId(token.getId());
        event.setOrgId(token.getOrgId());
        event.setEventType(eventType);
        event.setFromState(fromState);
        event.setToState(token.getState());
        event.setCounterId(token.getCounterId());
        
        // Phase 6.1 Actor attribution
        UUID actorId = null;
        try {
            actorId = com.align.qms.security.TenantContext.getCurrentUserId();
        } catch (IllegalStateException e) {
            // Unauthenticated context (e.g., customer or system)
        }
        event.setActorId(actorId);
        event.setActorName(null); // Optional: Could be populated if added to context or queried, but null is safe
        
        event.setMetadata(metadata);
        
        tokenEventRepository.save(event);
        
        Integer counterNumber = null;
        if (token.getCounterId() != null) {
            counterNumber = counterRepository.findById(token.getCounterId())
                .map(Counter::getNumber)
                .orElse(null);
        }
        
        // Publish realtime event snapshot
        TokenRealtimePayload payload = new TokenRealtimePayload(event, token, counterNumber);
        applicationEventPublisher.publishEvent(new com.align.qms.token.event.TokenRealtimeEvent(this, payload));
    }
}
