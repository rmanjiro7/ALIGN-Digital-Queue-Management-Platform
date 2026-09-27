package com.align.qms.notification;

import com.align.qms.token.Token;
import com.align.qms.token.TokenEventType;
import com.align.qms.token.event.TokenRealtimeEvent;
import com.align.qms.token.event.TokenRealtimePayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import com.align.qms.token.TokenEvent;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class TokenEventNotificationPolicyTest {

    private NotificationRepository notificationRepository;
    private TokenEventNotificationPolicy policy;

    @BeforeEach
    public void setup() {
        notificationRepository = mock(NotificationRepository.class);
        policy = new TokenEventNotificationPolicy(notificationRepository, new com.fasterxml.jackson.databind.ObjectMapper());
    }

    @Test
    public void testOnTokenEvent_WelcomeSms() {
        TokenEvent event = new TokenEvent();
        event.setId(UUID.randomUUID());
        event.setEventType(TokenEventType.TOKEN_CREATED);

        Token token = new Token(
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            "A-001", 
            "Test", 
            "+15551234567", 
            null
        );
        token.setId(UUID.randomUUID());

        TokenRealtimePayload payload = new TokenRealtimePayload(event, token, null);
        TokenRealtimeEvent realtimeEvent = new TokenRealtimeEvent(this, payload);

        policy.onTokenEvent(realtimeEvent);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());

        Notification saved = captor.getValue();
        assertEquals(NotificationType.SMS_WELCOME, saved.getType());
        assertEquals(NotificationChannel.SMS, saved.getChannel());
        assertEquals("+15551234567", saved.getRecipient());
        assertTrue(saved.getPayload().contains("Welcome to Align"));
    }

    @Test
    public void testOnTokenEvent_NoPhone_NoSms() {
        TokenEvent event = new TokenEvent();
        event.setId(UUID.randomUUID());
        event.setEventType(TokenEventType.TOKEN_CREATED);

        Token token = new Token(
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            UUID.randomUUID(), 
            "A-001", 
            "Test", 
            null, 
            null
        );
        token.setId(UUID.randomUUID());
        // No phone

        TokenRealtimePayload payload = new TokenRealtimePayload(event, token, null);
        TokenRealtimeEvent realtimeEvent = new TokenRealtimeEvent(this, payload);

        policy.onTokenEvent(realtimeEvent);

        verify(notificationRepository, never()).save(any());
    }
}
