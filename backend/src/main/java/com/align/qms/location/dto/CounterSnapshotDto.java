package com.align.qms.location.dto;

import com.align.qms.counter.CounterAvailability;
import java.time.Instant;
import java.util.UUID;

public class CounterSnapshotDto {
    private UUID id;
    private int number;
    private CounterAvailability availability;
    private UUID currentServingTokenId;
    private Instant serviceStartTime;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }

    public CounterAvailability getAvailability() { return availability; }
    public void setAvailability(CounterAvailability availability) { this.availability = availability; }

    public UUID getCurrentServingTokenId() { return currentServingTokenId; }
    public void setCurrentServingTokenId(UUID currentServingTokenId) { this.currentServingTokenId = currentServingTokenId; }

    public Instant getServiceStartTime() { return serviceStartTime; }
    public void setServiceStartTime(Instant serviceStartTime) { this.serviceStartTime = serviceStartTime; }
}
