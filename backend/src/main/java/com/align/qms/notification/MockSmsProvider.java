package com.align.qms.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MockSmsProvider implements NotificationChannelProvider {
    
    private static final Logger log = LoggerFactory.getLogger(MockSmsProvider.class);

    @Override
    public boolean supports(NotificationChannel channel) {
        return channel == NotificationChannel.SMS;
    }

    @Override
    public boolean send(Notification notification) {
        log.info("MOCK SMS DELIVERY: Sending SMS to {} for token {}, payload: {}", 
                notification.getRecipient(), notification.getTokenId(), notification.getPayload());
        return true;
    }
}
