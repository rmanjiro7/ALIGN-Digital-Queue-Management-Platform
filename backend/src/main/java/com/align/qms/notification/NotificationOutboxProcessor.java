package com.align.qms.notification;

import com.align.qms.token.Token;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class NotificationOutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(NotificationOutboxProcessor.class);
    private static final int MAX_RETRIES = 3;

    private final NotificationRepository notificationRepository;
    private final List<NotificationChannelProvider> channelProviders;
    private final TokenRepository tokenRepository;

    public NotificationOutboxProcessor(NotificationRepository notificationRepository, 
                                       List<NotificationChannelProvider> channelProviders,
                                       TokenRepository tokenRepository) {
        this.notificationRepository = notificationRepository;
        this.channelProviders = channelProviders;
        this.tokenRepository = tokenRepository;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void processOutbox() {
        // Fetch up to 50 pending notifications with skip locked
        List<Notification> pending = notificationRepository.findPendingForUpdateSkipLocked(Instant.now(), 50);
        
        for (Notification notification : pending) {
            try {
                if (isStale(notification)) {
                    log.info("Notification {} is stale, cancelling", notification.getId());
                    notification.setStatus(NotificationStatus.CANCELLED);
                    continue;
                }

                NotificationChannelProvider provider = channelProviders.stream()
                        .filter(p -> p.supports(notification.getChannel()))
                        .findFirst()
                        .orElse(null);

                if (provider == null) {
                    log.error("No provider found for channel {}", notification.getChannel());
                    markFailed(notification);
                    continue;
                }

                boolean success = provider.send(notification);
                if (success) {
                    notification.setStatus(NotificationStatus.SENT);
                } else {
                    handleRetry(notification);
                }
            } catch (Exception e) {
                log.error("Failed to process notification {}", notification.getId(), e);
                handleRetry(notification);
            }
        }
    }

    private boolean isStale(Notification notification) {
        if (notification.getTokenId() == null) {
            return false;
        }
        
        Token token = tokenRepository.findById(notification.getTokenId()).orElse(null);
        if (token == null) {
            return true;
        }

        TokenState state = token.getState();
        
        // General rule: If token is already completed/cancelled/transferred, it shouldn't get old SMS
        if (state == TokenState.COMPLETED || state == TokenState.CANCELLED || state == TokenState.TRANSFERRED || state == TokenState.EXPIRED) {
            return true;
        }

        // Specific rules
        if (notification.getType() == NotificationType.SMS_CALLED && (state == TokenState.IN_SERVICE || state == TokenState.NO_SHOW)) {
            return true;
        }
        
        if (notification.getType() == NotificationType.SMS_STEP_AWAY_STARTED && state != TokenState.AWAY) {
            return true;
        }

        return false;
    }

    private void handleRetry(Notification notification) {
        notification.setRetryCount(notification.getRetryCount() + 1);
        if (notification.getRetryCount() >= MAX_RETRIES) {
            markFailed(notification);
        } else {
            // Exponential backoff: 5s, 15s, 45s (simplified)
            int delaySeconds = 5 * (int) Math.pow(3, notification.getRetryCount() - 1);
            notification.setNextAttemptAt(Instant.now().plus(delaySeconds, ChronoUnit.SECONDS));
        }
    }

    private void markFailed(Notification notification) {
        notification.setStatus(NotificationStatus.FAILED);
    }
}
