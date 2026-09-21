package com.align.qms.queue;

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
 * Queue entity — one queue per service (enforced by UNIQUE constraint on service_id).
 *
 * <p>Maps to the {@code queues} table created in V3__organization_domain.sql.
 *
 * <p>Key design points:
 * <ul>
 *   <li>{@code nextTokenNumber} — Phase 3 atomic counter. Present in schema
 *       but NOT used by Phase 2 application logic. Phase 3 will increment it
 *       atomically via {@code UPDATE queues SET next_token_number = next_token_number + 1
 *       WHERE id = ? RETURNING next_token_number} (ADR-001).</li>
 *   <li>{@code tokenPrefix} — single-letter or short prefix for generated token
 *       labels, e.g. "A" → "A-001".</li>
 *   <li>Tenant isolation enforced at service layer via {@code TenantContext}.</li>
 * </ul>
 */
@Entity
@Table(name = "queues")
public class Queue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Organization (tenant) — denormalized for tenant-isolation queries. */
    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    @Column(name = "location_id", nullable = false, updatable = false)
    private UUID locationId;

    /** Parent service. UNIQUE constraint enforces one queue per service. */
    @Column(name = "service_id", nullable = false, updatable = false)
    private UUID serviceId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /**
     * Token prefix for generated token labels (max 5 chars).
     * e.g. "A" → "A-001", "B" → "B-001".
     */
    @Column(name = "token_prefix", nullable = false, length = 5)
    private String tokenPrefix = "A";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private QueueStatus status = QueueStatus.ACTIVE;

    /** Maximum number of active tokens before the queue is considered full. */
    @Column(name = "max_capacity", nullable = false)
    private int maxCapacity = 100;

    /**
     * If TRUE, the queue automatically transitions to PAUSED when
     * active token count reaches {@code maxCapacity}.
     */
    @Column(name = "auto_pause_at_capacity", nullable = false)
    private boolean autoPauseAtCapacity = false;

    /**
     * ⭐ Phase 3 atomic counter — NOT used in Phase 2.
     * Incremented atomically via raw SQL in Phase 3 (ADR-001).
     */
    @Column(name = "next_token_number", nullable = false)
    private long nextTokenNumber = 1L;

    @Column(name = "capacity_warning_active", nullable = false)
    private boolean capacityWarningActive = false;

    @Column(name = "wait_warning_active", nullable = false)
    private boolean waitWarningActive = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected Queue() {
        // JPA required
    }

    public Queue(UUID orgId, UUID locationId, UUID serviceId, String name,
                 String tokenPrefix, int maxCapacity) {
        this.orgId              = orgId;
        this.locationId         = locationId;
        this.serviceId          = serviceId;
        this.name               = name;
        this.tokenPrefix        = tokenPrefix != null ? tokenPrefix : "A";
        this.maxCapacity        = maxCapacity;
        this.status             = QueueStatus.ACTIVE;
        this.autoPauseAtCapacity = false;
        this.nextTokenNumber    = 1L;
        this.capacityWarningActive = false;
        this.waitWarningActive  = false;
        this.createdAt          = Instant.now();
        this.updatedAt          = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID        getId()                  { return id; }
    public UUID        getOrgId()               { return orgId; }
    public UUID        getLocationId()          { return locationId; }
    public UUID        getServiceId()           { return serviceId; }
    public String      getName()                { return name; }
    public String      getTokenPrefix()         { return tokenPrefix; }
    public QueueStatus getStatus()              { return status; }
    public int         getMaxCapacity()         { return maxCapacity; }
    public boolean     isAutoPauseAtCapacity()  { return autoPauseAtCapacity; }
    public long        getNextTokenNumber()     { return nextTokenNumber; }
    public boolean     isCapacityWarningActive(){ return capacityWarningActive; }
    public boolean     isWaitWarningActive()    { return waitWarningActive; }
    public Instant     getCreatedAt()           { return createdAt; }
    public Instant     getUpdatedAt()           { return updatedAt; }

    // ── Setters ──────────────────────────────────────────────────────────────

    public void setName(String name)                              { this.name = name; }
    public void setTokenPrefix(String tokenPrefix)                { this.tokenPrefix = tokenPrefix; }
    public void setStatus(QueueStatus status)                     { this.status = status; }
    public void setMaxCapacity(int maxCapacity)                   { this.maxCapacity = maxCapacity; }
    public void setAutoPauseAtCapacity(boolean autoPause)         { this.autoPauseAtCapacity = autoPause; }
    public void setNextTokenNumber(long nextTokenNumber)          { this.nextTokenNumber = nextTokenNumber; }
    public void setCapacityWarningActive(boolean capacityWarningActive) { this.capacityWarningActive = capacityWarningActive; }
    public void setWaitWarningActive(boolean waitWarningActive)   { this.waitWarningActive = waitWarningActive; }
}
