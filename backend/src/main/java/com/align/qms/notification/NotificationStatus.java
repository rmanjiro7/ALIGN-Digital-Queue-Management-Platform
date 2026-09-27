package com.align.qms.notification;

public enum NotificationStatus {
    PENDING,
    PROCESSING,
    SENT,
    FAILED,
    CANCELLED;

    public boolean isTerminal() {
        return this == SENT || this == FAILED || this == CANCELLED;
    }
}
