package com.align.qms.notification;

import com.align.qms.token.Token;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

public class NotificationOutboxProcessorTest {

    private NotificationRepository notificationRepository;
    private TokenRepository tokenRepository;
    private MockSmsProvider mockSmsProvider;
    private NotificationOutboxProcessor processor;

    @BeforeEach
    public void setup() {
        notificationRepository = mock(NotificationRepository.class);
        tokenRepository = mock(TokenRepository.class);
        mockSmsProvider = mock(MockSmsProvider.class);
        
        when(mockSmsProvider.supports(NotificationChannel.SMS)).thenReturn(true);

        processor = new NotificationOutboxProcessor(
                notificationRepository,
                List.of(mockSmsProvider),
                tokenRepository
        );
    }

    @Test
    public void testProcessOutbox_success() {
        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setStatus(NotificationStatus.PENDING);
        notification.setChannel(NotificationChannel.SMS);
        notification.setTokenId(UUID.randomUUID());
        notification.setType(NotificationType.SMS_WELCOME);

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
        token.setId(notification.getTokenId());

        when(notificationRepository.findPendingForUpdateSkipLocked(any(), anyInt()))
                .thenReturn(List.of(notification));
        when(tokenRepository.findById(notification.getTokenId())).thenReturn(Optional.of(token));
        when(mockSmsProvider.send(notification)).thenReturn(true);

        processor.processOutbox();

        assertEquals(NotificationStatus.SENT, notification.getStatus());
        verify(mockSmsProvider, times(1)).send(notification);
    }

    @Test
    public void testProcessOutbox_retryFailure() {
        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setStatus(NotificationStatus.PENDING);
        notification.setChannel(NotificationChannel.SMS);
        notification.setTokenId(UUID.randomUUID());
        notification.setRetryCount(2);

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
        token.setId(notification.getTokenId());

        when(notificationRepository.findPendingForUpdateSkipLocked(any(), anyInt()))
                .thenReturn(List.of(notification));
        when(tokenRepository.findById(notification.getTokenId())).thenReturn(Optional.of(token));
        when(mockSmsProvider.send(notification)).thenReturn(false);

        processor.processOutbox();

        // 2 retries initially + 1 failed now = 3 -> terminal
        assertEquals(NotificationStatus.FAILED, notification.getStatus());
        assertEquals(3, notification.getRetryCount());
    }

    @Test
    public void testProcessOutbox_staleCancelled() {
        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setStatus(NotificationStatus.PENDING);
        notification.setChannel(NotificationChannel.SMS);
        notification.setTokenId(UUID.randomUUID());
        notification.setType(NotificationType.SMS_WELCOME);

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
        token.setId(notification.getTokenId());
        token.transitionTo(TokenState.CALLED);
        token.transitionTo(TokenState.IN_SERVICE);
        token.transitionTo(TokenState.COMPLETED);

        when(notificationRepository.findPendingForUpdateSkipLocked(any(), anyInt()))
                .thenReturn(List.of(notification));
        when(tokenRepository.findById(notification.getTokenId())).thenReturn(Optional.of(token));

        processor.processOutbox();

        assertEquals(NotificationStatus.CANCELLED, notification.getStatus());
        verify(mockSmsProvider, never()).send(any());
    }
}
