package com.align.qms.token.event;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TokenRealtimeDispatcher {

    private final SimpMessagingTemplate messagingTemplate;

    public TokenRealtimeDispatcher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTokenRealtimeEvent(TokenRealtimeEvent event) {
        TokenRealtimePayload payload = event.getPayload();
        
        // Legacy topic (for backward compatibility during Phase 6.4 transition)
        messagingTemplate.convertAndSend("/topic/location." + payload.getLocationId(), payload);
        
        // New Option B topics
        messagingTemplate.convertAndSend(
            String.format("/topic/tenant/%s/location/%s/public", payload.getOrgId(), payload.getLocationId()), 
            payload
        );
        messagingTemplate.convertAndSend(
            String.format("/topic/tenant/%s/location/%s/staff", payload.getOrgId(), payload.getLocationId()), 
            payload
        );
        messagingTemplate.convertAndSend(
            String.format("/topic/token/%s", payload.getTokenId()), 
            payload
        );
    }
}
