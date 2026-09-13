package com.align.qms.token;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterRepository;
import com.align.qms.token.event.TokenRealtimePayload;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

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
        event.setEventType(eventType);
        event.setFromState(fromState);
        event.setToState(token.getState());
        event.setCounterId(token.getCounterId());
        
        // For Phase 3 Token Engine, actor is typically customer (unauthenticated or implicit).
        // If staff actions are added (Phase 4), we can extract actor from TenantContext.
        event.setActorId(null);
        event.setActorName(null);
        
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
