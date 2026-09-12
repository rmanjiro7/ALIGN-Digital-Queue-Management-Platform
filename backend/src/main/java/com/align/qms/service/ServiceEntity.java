package com.align.qms.service;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Service entity — a service offering at a specific location.
 *
 * <p>Named {@code ServiceEntity} to avoid collision with {@code java.util.Service}
 * and Spring's {@code @Service} annotation. Maps to the {@code services} table
 * created in V3__organization_domain.sql.
 *
 * <p>Each ServiceEntity belongs to exactly one Location and one Organization.
 * The {@code org_id} field is denormalized here (also FK on the DB) so that
 * tenant-isolation queries can filter on {@code org_id} alone without a join.
 *
 * <p>A ServiceEntity that is disabled ({@code enabled = false}) is hidden from
 * customer discovery but still accessible to ORG_ADMIN for management.
 */
@Entity
@Table(name = "services")
public class ServiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Organization (tenant) — denormalized for tenant-isolation queries. */
    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    /** Parent location. */
    @Column(name = "location_id", nullable = false, updatable = false)
    private UUID locationId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description")
    private String description;

    /** UI icon identifier (e.g. FontAwesome class or emoji). */
    @Column(name = "icon", length = 50)
    private String icon;

    /** Whether this service is visible and available to customers. */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /** TRUE for priority / express service lane. */
    @Column(name = "is_fast_track", nullable = false)
    private boolean isFastTrack = false;

    /** Customer preparation instructions, e.g. "Bring government-issued ID". */
    @Column(name = "preparation_guidance")
    private String preparationGuidance;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected ServiceEntity() {
        // JPA required
    }

    public ServiceEntity(UUID orgId, UUID locationId, String name, String description,
                         String icon, boolean isFastTrack, String preparationGuidance) {
        this.orgId               = orgId;
        this.locationId          = locationId;
        this.name                = name;
        this.description         = description;
        this.icon                = icon;
        this.isFastTrack         = isFastTrack;
        this.preparationGuidance = preparationGuidance;
        this.enabled             = true;
        this.createdAt           = Instant.now();
        this.updatedAt           = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID    getId()                  { return id; }
    public UUID    getOrgId()               { return orgId; }
    public UUID    getLocationId()          { return locationId; }
    public String  getName()                { return name; }
    public String  getDescription()         { return description; }
    public String  getIcon()                { return icon; }
    public boolean isEnabled()              { return enabled; }
    public boolean isFastTrack()            { return isFastTrack; }
    public String  getPreparationGuidance() { return preparationGuidance; }
    public Instant getCreatedAt()           { return createdAt; }
    public Instant getUpdatedAt()           { return updatedAt; }

    // ── Setters ──────────────────────────────────────────────────────────────

    public void setName(String name)                             { this.name = name; }
    public void setDescription(String description)               { this.description = description; }
    public void setIcon(String icon)                             { this.icon = icon; }
    public void setEnabled(boolean enabled)                      { this.enabled = enabled; }
    public void setFastTrack(boolean isFastTrack)                { this.isFastTrack = isFastTrack; }
    public void setPreparationGuidance(String preparationGuidance) {
        this.preparationGuidance = preparationGuidance;
    }
}
