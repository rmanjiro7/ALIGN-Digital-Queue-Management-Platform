package com.align.qms.notification;

public interface NotificationChannelProvider {
    boolean supports(NotificationChannel channel);
    
    /**
     * Attempts to send the notification.
     * @param notification The notification entity
     * @return true if successful, false if a transient failure occurred
     * @throws RuntimeException if a terminal failure occurs
     */
    boolean send(Notification notification);
}
