package com.align.qms.user;

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
 * System user entity for STAFF, ORG_ADMIN, and PLATFORM_ADMIN accounts.
 *
 * <p>Security rules enforced here and in the database:
 * <ul>
 *   <li>PLATFORM_ADMIN: {@code orgId} MUST be null (no tenant scope).</li>
 *   <li>STAFF / ORG_ADMIN: {@code orgId} MUST be non-null.</li>
 *   <li>{@code passwordHash} is BCrypt (strength 12). Never exposed via any API response.</li>
 *   <li>Email is globally unique across all organizations.</li>
 * </ul>
 *
 * <p>JPA {@code ddl-auto: validate} — Flyway owns the schema via V2__security.sql.
 * This entity maps exactly to the {@code users} table.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /**
     * Organization (tenant) scope. NULL for PLATFORM_ADMIN.
     * STAFF and ORG_ADMIN must have a non-null orgId.
     * No JPA FK relationship here — organizations table is expanded in Phase 2.
     */
    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    /**
     * BCrypt hash (strength 12). Never returned in any DTO or log.
     */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /**
     * Location assignment (STAFF / ORG_ADMIN). FK to locations added in Phase 2.
     */
    @Column(name = "location_id")
    private UUID locationId;

    /** Counter number assignment for STAFF role. */
    @Column(name = "assigned_counter_number")
    private Integer assignedCounterNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Constructors ────────────────────────────────────────────────────────

    protected User() {
        // JPA required
    }

    public User(UUID orgId, String email, String passwordHash, String name,
                UserRole role, UUID locationId) {
        this.orgId = orgId;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.locationId = locationId;
        this.status = UserStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID getId()                       { return id; }
    public UUID getOrgId()                    { return orgId; }
    public String getEmail()                  { return email; }
    public String getPasswordHash()           { return passwordHash; }
    public String getName()                   { return name; }
    public UserRole getRole()                 { return role; }
    public UserStatus getStatus()             { return status; }
    public UUID getLocationId()               { return locationId; }
    public Integer getAssignedCounterNumber() { return assignedCounterNumber; }
    public Instant getCreatedAt()             { return createdAt; }
    public Instant getUpdatedAt()             { return updatedAt; }

    // ── Setters (restricted — only what the application legitimately changes) ─

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setAssignedCounterNumber(Integer assignedCounterNumber) {
        this.assignedCounterNumber = assignedCounterNumber;
    }

    public void setLocationId(UUID locationId) {
        this.locationId = locationId;
    }

    /**
     * Returns true if this user's account is enabled (ACTIVE).
     * Used by {@link com.align.qms.security.UserDetailsServiceImpl}.
     */
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}
