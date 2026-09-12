package com.align.qms.location;

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
 * Location entity — a physical branch or office that belongs to an Organization.
 *
 * <p>Maps to the {@code locations} table created in V3__organization_domain.sql.
 *
 * <p>Tenant isolation: every location belongs to exactly one organization via
 * {@code org_id}. Service-layer code calls {@code TenantContext.requireSameTenant(orgId)}
 * before any mutation.
 */
@Entity
@Table(name = "locations")
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Organization (tenant) this location belongs to. */
    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** Optional sub-title / branch description shown in the UI. */
    @Column(name = "subtitle", length = 255)
    private String subtitle;

    @Column(name = "address")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LocationStatus status = LocationStatus.ACTIVE;

    /** Human-readable operating hours, e.g. "08:00 AM - 06:00 PM". */
    @Column(name = "operating_hours", length = 100)
    private String operatingHours;

    /** TRUE if this is the headquarters / main branch. */
    @Column(name = "is_hq", nullable = false)
    private boolean isHq = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected Location() {
        // JPA required
    }

    public Location(UUID orgId, String name, String subtitle, String address,
                    String city, String operatingHours, boolean isHq) {
        this.orgId          = orgId;
        this.name           = name;
        this.subtitle       = subtitle;
        this.address        = address;
        this.city           = city;
        this.operatingHours = operatingHours;
        this.isHq           = isHq;
        this.status         = LocationStatus.ACTIVE;
        this.createdAt      = Instant.now();
        this.updatedAt      = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID           getId()             { return id; }
    public UUID           getOrgId()          { return orgId; }
    public String         getName()           { return name; }
    public String         getSubtitle()       { return subtitle; }
    public String         getAddress()        { return address; }
    public String         getCity()           { return city; }
    public LocationStatus getStatus()         { return status; }
    public String         getOperatingHours() { return operatingHours; }
    public boolean        isHq()              { return isHq; }
    public Instant        getCreatedAt()      { return createdAt; }
    public Instant        getUpdatedAt()      { return updatedAt; }

    // ── Setters ──────────────────────────────────────────────────────────────

    public void setName(String name)                   { this.name = name; }
    public void setSubtitle(String subtitle)           { this.subtitle = subtitle; }
    public void setAddress(String address)             { this.address = address; }
    public void setCity(String city)                   { this.city = city; }
    public void setStatus(LocationStatus status)       { this.status = status; }
    public void setOperatingHours(String hours)        { this.operatingHours = hours; }
    public void setHq(boolean isHq)                    { this.isHq = isHq; }
}
