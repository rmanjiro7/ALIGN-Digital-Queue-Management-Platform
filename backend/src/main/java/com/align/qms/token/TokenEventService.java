package com.align.qms.token;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class TokenEventService {

    private final TokenEventRepository tokenEventRepository;

    public TokenEventService(TokenEventRepository tokenEventRepository) {
        this.tokenEventRepository = tokenEventRepository;
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
    }
}
