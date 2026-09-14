package com.align.qms.counter.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "counter_availability_log")
public class CounterAvailabilityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "location_id", nullable = false)
    private UUID locationId;

    @Column(name = "counter_id", nullable = false)
    private UUID counterId;

    @Column(name = "old_availability", length = 50)
    private String oldAvailability;

    @Column(name = "new_availability", nullable = false, length = 50)
    private String newAvailability;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt = Instant.now();

    protected CounterAvailabilityLog() {
    }

    public CounterAvailabilityLog(UUID orgId, UUID locationId, UUID counterId, String oldAvailability, String newAvailability, UUID changedBy) {
        this.orgId = orgId;
        this.locationId = locationId;
        this.counterId = counterId;
        this.oldAvailability = oldAvailability;
        this.newAvailability = newAvailability;
        this.changedBy = changedBy;
        this.changedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOrgId() { return orgId; }
    public UUID getLocationId() { return locationId; }
    public UUID getCounterId() { return counterId; }
    public String getOldAvailability() { return oldAvailability; }
    public String getNewAvailability() { return newAvailability; }
    public UUID getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
}
