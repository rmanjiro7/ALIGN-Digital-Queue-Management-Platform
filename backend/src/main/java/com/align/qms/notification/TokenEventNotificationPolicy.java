package com.align.qms.notification;

import com.align.qms.token.TokenEventType;
import com.align.qms.token.event.TokenRealtimeEvent;
import com.align.qms.token.event.TokenRealtimePayload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.align.qms.location.LocationScheduleService;
import java.util.Map;
import java.time.Instant;

@Component
public class TokenEventNotificationPolicy {

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;
    private final LocationScheduleService locationScheduleService;

    public TokenEventNotificationPolicy(NotificationRepository notificationRepository, ObjectMapper objectMapper, LocationScheduleService locationScheduleService) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
        this.locationScheduleService = locationScheduleService;
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

        String phone = payload.getCustomerPhone(); 
        Boolean consent = payload.getSmsConsent();

        // 1. Phone must be present
        // 2. Consent must be explicitly granted
        if (phone == null || phone.isBlank() || !Boolean.TRUE.equals(consent)) {
            return;
        }

        // 3. Must be during operating hours
        if (!locationScheduleService.isLocationOpen(payload.getLocationId(), Instant.now())) {
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
