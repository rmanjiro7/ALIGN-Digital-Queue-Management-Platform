package com.align.qms.queue.event;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class QueueRealtimeDispatcher {

    private final SimpMessagingTemplate messagingTemplate;

    public QueueRealtimeDispatcher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleQueueWarningEvent(QueueWarningEvent event) {
        QueueWarningPayload payload = event.getPayload();

        // Dispatch ONLY to the authenticated staff/operational location channel
        messagingTemplate.convertAndSend(
            String.format("/topic/tenant/%s/location/%s/staff", payload.getOrgId(), payload.getLocationId()),
            payload
        );
    }
}
