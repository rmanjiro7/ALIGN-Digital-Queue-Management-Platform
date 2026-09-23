package com.align.qms.queue.dto;

import java.util.UUID;

public class QueueWarningDto {
    private UUID queueId;
    private UUID serviceId;
    private boolean capacityWarningActive;
    private boolean waitWarningActive;

    public QueueWarningDto() {}

    public QueueWarningDto(UUID queueId, UUID serviceId, boolean capacityWarningActive, boolean waitWarningActive) {
        this.queueId = queueId;
        this.serviceId = serviceId;
        this.capacityWarningActive = capacityWarningActive;
        this.waitWarningActive = waitWarningActive;
    }

    public UUID getQueueId() { return queueId; }
    public void setQueueId(UUID queueId) { this.queueId = queueId; }

    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }

    public boolean isCapacityWarningActive() { return capacityWarningActive; }
    public void setCapacityWarningActive(boolean capacityWarningActive) { this.capacityWarningActive = capacityWarningActive; }

    public boolean isWaitWarningActive() { return waitWarningActive; }
    public void setWaitWarningActive(boolean waitWarningActive) { this.waitWarningActive = waitWarningActive; }
}
