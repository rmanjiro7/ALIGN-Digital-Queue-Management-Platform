package com.align.qms.exception;

import java.util.UUID;

public class QueuePausedException extends BusinessException {
    private final UUID queueId;

    public QueuePausedException(UUID queueId, String message) {
        super(message, org.springframework.http.HttpStatus.CONFLICT, "QUEUE_PAUSED");
        this.queueId = queueId;
    }

    public UUID getQueueId() {
        return queueId;
    }
}
