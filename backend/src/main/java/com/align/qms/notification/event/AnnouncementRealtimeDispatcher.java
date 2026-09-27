package com.align.qms.notification.event;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

@Component
public class AnnouncementRealtimeDispatcher {

    private final SimpMessagingTemplate messagingTemplate;

    public AnnouncementRealtimeDispatcher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAnnouncementRealtimeEvent(AnnouncementRealtimeEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ANNOUNCEMENT");
        payload.put("text", event.getText());
        payload.put("tokenId", event.getTokenId());
        payload.put("tokenNumber", event.getTokenNumber());
        payload.put("counterId", event.getCounterId());
        payload.put("counterNumber", event.getCounterNumber());
        
        // Broadcast to location public display
        messagingTemplate.convertAndSend(
            String.format("/topic/tenant/%s/location/%s/public", event.getOrgId(), event.getLocationId()), 
            payload
        );
        
        // Broadcast to location staff
        messagingTemplate.convertAndSend(
            String.format("/topic/tenant/%s/location/%s/staff", event.getOrgId(), event.getLocationId()), 
            payload
        );
        
        // Optionally target specific customer if token is provided
        if (event.getTokenId() != null) {
            messagingTemplate.convertAndSend(
                String.format("/topic/token/%s", event.getTokenId()), 
                payload
            );
        }
    }
}
