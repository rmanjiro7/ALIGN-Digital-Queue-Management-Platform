package com.align.qms.counter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Counter entity — a service counter / station at a Location.
 *
 * <p>Maps to the {@code counters} table created in V3__organization_domain.sql.
 *
 * <p>Key design points:
 * <ul>
 *   <li>Counters belong to a Location — NOT directly to a Queue. A counter
 *       can serve tokens from the queue(s) associated with the location's services.</li>
 *   <li>{@code number} is unique per location ({@code uq_counter_location_number}).</li>
 *   <li>{@code availability} controls whether staff can call next (BR-003).</li>
 *   <li>{@code currentServingTokenId} is a Phase 3 field — always null in Phase 2.</li>
 *   <li>{@code assignedStaffId} is a UUID reference to {@code users.id}. No JPA
 *       FK relationship here — staff management is Phase 6 scope.</li>
 * </ul>
 */
@Entity
@Table(name = "counters")
public class Counter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Organization (tenant) — denormalized for tenant-isolation queries. */
    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    @Column(name = "location_id", nullable = false, updatable = false)
    private UUID locationId;

    /** Counter number within the location. Unique per location. */
    @Column(name = "number", nullable = false)
    private int number;

    /** Optional display name for the counter. */
    @Column(name = "name", length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CounterStatus status = CounterStatus.ACTIVE;

    /**
     * Real-time availability state (BR-003).
     * Default is OFFLINE — counter must be explicitly set ONLINE by staff.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "availability", nullable = false, length = 20)
    private CounterAvailability availability = CounterAvailability.OFFLINE;

    /**
     * UUID of the currently assigned staff member (users.id).
     * NULL when no staff is assigned. Phase 6 adds full staff management.
     */
    @Column(name = "assigned_staff_id")
    private UUID assignedStaffId;

    /**
     * ⭐ Phase 3 field — UUID of the token currently being served.
     * FK to tokens table added in Phase 3 migration. Always NULL in Phase 2.
     */
    @Column(name = "current_serving_token_id")
    private UUID currentServingTokenId;

    /** Timestamp when the current service session started. Phase 3. */
    @Column(name = "service_start_time")
    private Instant serviceStartTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected Counter() {
        // JPA required
    }

    public Counter(UUID orgId, UUID locationId, int number, String name) {
        this.orgId        = orgId;
        this.locationId   = locationId;
        this.number       = number;
        this.name         = name;
        this.status       = CounterStatus.ACTIVE;
        this.availability = CounterAvailability.OFFLINE;
        this.createdAt    = Instant.now();
        this.updatedAt    = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID                getId()                      { return id; }
    public UUID                getOrgId()                   { return orgId; }
    public UUID                getLocationId()              { return locationId; }
    public int                 getNumber()                  { return number; }
    public String              getName()                    { return name; }
    public CounterStatus       getStatus()                  { return status; }
    public CounterAvailability getAvailability()            { return availability; }
    public UUID                getAssignedStaffId()         { return assignedStaffId; }
    public UUID                getCurrentServingTokenId()   { return currentServingTokenId; }
    public Instant             getServiceStartTime()        { return serviceStartTime; }
    public Instant             getCreatedAt()               { return createdAt; }
    public Instant             getUpdatedAt()               { return updatedAt; }

    // ── Setters ──────────────────────────────────────────────────────────────

    public void setName(String name)                              { this.name = name; }
    public void setStatus(CounterStatus status)                   { this.status = status; }
    public void setAvailability(CounterAvailability availability) { this.availability = availability; }
    public void setAssignedStaffId(UUID assignedStaffId)          { this.assignedStaffId = assignedStaffId; }
    public void setCurrentServingTokenId(UUID tokenId)            { this.currentServingTokenId = tokenId; }
    public void setServiceStartTime(Instant serviceStartTime)     { this.serviceStartTime = serviceStartTime; }
}
