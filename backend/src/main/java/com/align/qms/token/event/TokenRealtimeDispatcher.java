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
        messagingTemplate.convertAndSend("/topic/location." + payload.getLocationId(), payload);
    }
}
