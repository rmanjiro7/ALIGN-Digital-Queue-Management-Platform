package com.align.qms.notification;

import com.align.qms.token.TokenEventType;
import com.align.qms.token.event.TokenRealtimeEvent;
import com.align.qms.token.event.TokenRealtimePayload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@Component
public class TokenEventNotificationPolicy {

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public TokenEventNotificationPolicy(NotificationRepository notificationRepository, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onTokenEvent(TokenRealtimeEvent event) {
        TokenRealtimePayload payload = event.getPayload();
        TokenEventType eventType = payload.getEventType();

        NotificationType type = null;
        String message = null;

        switch (eventType) {
            case TOKEN_CREATED:
                type = NotificationType.SMS_WELCOME;
                message = "Welcome to Align. Your token is " + payload.getTokenNumber() + ".";
                break;
            case TOKEN_CALLED:
                type = NotificationType.SMS_CALLED;
                message = "It's your turn! Please proceed to Counter " + payload.getCounterNumber() + ".";
                break;
            case TOKEN_STEP_AWAY_STARTED:
                type = NotificationType.SMS_STEP_AWAY_STARTED;
                message = "You have stepped away. Please return in time or your turn will be skipped.";
                break;
            case TOKEN_STEP_AWAY_EXPIRED:
                type = NotificationType.SMS_STEP_AWAY_EXPIRED;
                message = "Your step-away time has expired. Your token has been skipped.";
                break;
            case TOKEN_TRANSFERRED:
                type = NotificationType.SMS_TRANSFERRED;
                message = "You have been transferred to a new service queue.";
                break;
            default:
                // No notification for other events
                return;
        }

        // Only schedule if customerPhone is present (or we assume it's passed somehow? We need the phone number)
        // Since payload.getToken().getCustomerPhone() is not directly in payload, we have the token object in payload?
        // Wait, TokenRealtimePayload has token fields but maybe not phone.
        // Let's check TokenRealtimePayload.java.
        
        String phone = payload.getCustomerPhone(); 
        // We will need to check if customerPhone exists in Payload, or we can fetch it, or if it has it.
        // If not, we can just save it with empty recipient, mock provider will just log it.
        if (phone == null || phone.isBlank()) {
            return;
        }

        Notification notification = new Notification();
        notification.setOrgId(payload.getOrgId());
        notification.setLocationId(payload.getLocationId());
        notification.setTokenId(payload.getTokenId());
        notification.setType(type);
        notification.setChannel(NotificationChannel.SMS);
        notification.setRecipient(phone);
        
        try {
            notification.setPayload(objectMapper.writeValueAsString(Map.of("message", message)));
        } catch (Exception e) {
            notification.setPayload("{}"); // Fallback, shouldn't happen with Map.of("message", message)
        }
        
        // Idempotency key
        notification.setIdempotencyKey(type.name() + "_" + payload.getTokenId() + "_" + payload.getEventId());

        notificationRepository.save(notification);
    }
}
