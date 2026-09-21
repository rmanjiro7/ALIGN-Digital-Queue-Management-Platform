package com.align.qms.queue.event;

import java.time.Instant;
import java.util.UUID;

public class QueueWarningPayload {
    private final UUID queueId;
    private final UUID orgId;
    private final UUID locationId;
    private final QueueWarningType warningType;
    private final QueueWarningTransition transition;
    private final Number currentValue;
    private final Number thresholdValue;
    private final Instant occurredAt;

    public QueueWarningPayload(UUID queueId, UUID orgId, UUID locationId, QueueWarningType warningType,
                               QueueWarningTransition transition, Number currentValue, Number thresholdValue) {
        this.queueId = queueId;
        this.orgId = orgId;
        this.locationId = locationId;
        this.warningType = warningType;
        this.transition = transition;
        this.currentValue = currentValue;
        this.thresholdValue = thresholdValue;
        this.occurredAt = Instant.now();
    }

    public UUID getQueueId() { return queueId; }
    public UUID getOrgId() { return orgId; }
    public UUID getLocationId() { return locationId; }
    public QueueWarningType getWarningType() { return warningType; }
    public QueueWarningTransition getTransition() { return transition; }
    public Number getCurrentValue() { return currentValue; }
    public Number getThresholdValue() { return thresholdValue; }
    public Instant getOccurredAt() { return occurredAt; }
}
