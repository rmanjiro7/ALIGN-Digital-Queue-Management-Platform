package com.align.qms.location.dto;

import java.util.List;
import java.util.UUID;

public class LocationSnapshotResponse {
    private UUID locationId;
    private String locationName;
    private List<CounterSnapshotDto> counters;
    private List<TokenSnapshotDto> activeTokens;
    private List<TokenSnapshotDto> waitingTokens;
    private List<ServiceSnapshotDto> services;

    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public List<CounterSnapshotDto> getCounters() { return counters; }
    public void setCounters(List<CounterSnapshotDto> counters) { this.counters = counters; }

    public List<TokenSnapshotDto> getActiveTokens() { return activeTokens; }
    public void setActiveTokens(List<TokenSnapshotDto> activeTokens) { this.activeTokens = activeTokens; }

    public List<TokenSnapshotDto> getWaitingTokens() { return waitingTokens; }
    public void setWaitingTokens(List<TokenSnapshotDto> waitingTokens) { this.waitingTokens = waitingTokens; }

    public List<ServiceSnapshotDto> getServices() { return services; }
    public void setServices(List<ServiceSnapshotDto> services) { this.services = services; }
}
