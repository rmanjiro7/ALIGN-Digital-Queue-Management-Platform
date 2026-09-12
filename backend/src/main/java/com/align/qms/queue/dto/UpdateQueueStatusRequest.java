package com.align.qms.queue.dto;

import com.align.qms.queue.QueueStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for PUT /api/v1/queues/{queueId}/status.
 */
public class UpdateQueueStatusRequest {

    @NotNull(message = "Queue status is required")
    private QueueStatus status;

    public QueueStatus getStatus() { return status; }
    public void setStatus(QueueStatus status) { this.status = status; }
}
