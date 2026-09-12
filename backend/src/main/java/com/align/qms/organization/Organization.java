package com.align.qms.organization;

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
 * Organization (tenant) entity.
 *
 * <p>Maps to the {@code organizations} table, which was created as a stub in
 * V2__security.sql (id + created_at only) and expanded to the full domain
 * model in V3__organization_domain.sql.
 *
 * <p>One Organization represents one tenant. All resources (locations, services,
 * queues, counters, users) are scoped to an org via {@code org_id} foreign keys.
 *
 * <p>Business rules:
 * <ul>
 *   <li>{@code code} is globally unique and immutable after creation.</li>
 *   <li>{@code status} must be ACTIVE for users to authenticate.</li>
 *   <li>PLATFORM_ADMIN creates and manages organizations.</li>
 * </ul>
 */
@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /**
     * Human-readable tenant identifier, e.g. {@code T-8492}.
     * Globally unique. Set at creation; not updated thereafter.
     */
    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** Industry classification: Healthcare, Government, Education, etc. */
    @Column(name = "sector", length = 100)
    private String sector;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrganizationStatus status = OrganizationStatus.ACTIVE;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "joined_date")
    private Instant joinedDate = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected Organization() {
        // JPA required
    }

    public Organization(String code, String name, String sector, String contactEmail) {
        this.code         = code;
        this.name         = name;
        this.sector       = sector;
        this.contactEmail = contactEmail;
        this.status       = OrganizationStatus.ACTIVE;
        this.joinedDate   = Instant.now();
        this.createdAt    = Instant.now();
        this.updatedAt    = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID               getId()           { return id; }
    public String             getCode()         { return code; }
    public String             getName()         { return name; }
    public String             getSector()       { return sector; }
    public OrganizationStatus getStatus()       { return status; }
    public String             getContactEmail() { return contactEmail; }
    public Instant            getJoinedDate()   { return joinedDate; }
    public Instant            getCreatedAt()    { return createdAt; }
    public Instant            getUpdatedAt()    { return updatedAt; }

    // ── Setters (restricted to legitimate application mutations) ─────────────

    public void setName(String name)                     { this.name = name; }
    public void setSector(String sector)                 { this.sector = sector; }
    public void setStatus(OrganizationStatus status)     { this.status = status; }
    public void setContactEmail(String contactEmail)     { this.contactEmail = contactEmail; }
}
