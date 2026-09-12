package com.align.qms.exception;

import java.util.UUID;

public class QueueFullException extends BusinessException {
    private final UUID queueId;
    private final long activeCount;

    public QueueFullException(UUID queueId, String queueName, long activeCount, int maxCapacity) {
        super(String.format("Queue '%s' is full. Capacity: %d, Active: %d.", queueName, maxCapacity, activeCount), org.springframework.http.HttpStatus.CONFLICT, "QUEUE_FULL");
        this.queueId = queueId;
        this.activeCount = activeCount;
    }

    public UUID getQueueId() { return queueId; }
    public long getActiveCount() { return activeCount; }
}
