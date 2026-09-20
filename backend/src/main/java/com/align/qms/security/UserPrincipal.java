package com.align.qms.security;

import com.align.qms.user.User;
import com.align.qms.user.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Spring Security {@link UserDetails} adapter for {@link User}.
 *
 * <p>This is the authenticated principal placed in the
 * {@link org.springframework.security.core.context.SecurityContext} after
 * successful JWT validation.  All authorization decisions read from this object
 * rather than from client-supplied parameters.
 *
 * <p>Tenant scope rule (ADR-005):
 * <ul>
 *   <li>STAFF / ORG_ADMIN: {@code orgId} is non-null. All resource access
 *       must match this value.</li>
 *   <li>PLATFORM_ADMIN: {@code orgId} is null. Cross-tenant read access only;
 *       no operational write access.</li>
 * </ul>
 *
 * <p>The role is mapped to a Spring Security authority prefixed with
 * {@code ROLE_} so that {@code @PreAuthorize("hasRole('STAFF')")} works
 * transparently.
 */
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final UUID orgId;         // null for PLATFORM_ADMIN
    private final UUID locationId;    // null for PLATFORM_ADMIN / non-located users
    private final String email;
    private final String passwordHash;
    private final UserRole role;
    private final boolean enabled;

    public UserPrincipal(User user) {
        this.id           = user.getId();
        this.orgId        = user.getOrgId();
        this.locationId   = user.getLocationId();
        this.email        = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role         = user.getRole();
        this.enabled      = user.isEnabled();
    }

    public UserPrincipal(UUID id, UUID orgId, UUID locationId, String email, String passwordHash, UserRole role, boolean enabled) {
        this.id           = id;
        this.orgId        = orgId;
        this.locationId   = locationId;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.role         = role;
        this.enabled      = enabled;
    }

    // ── Identity accessors (used by services / authorization checks) ────────

    /** Database UUID of this user. Never trust userId from client input. */
    public UUID getId() { return id; }

    /**
     * Organization (tenant) UUID.
     * MUST be non-null for STAFF and ORG_ADMIN.
     * IS null for PLATFORM_ADMIN.
     */
    public UUID getOrgId() { return orgId; }

    /** Location assignment, may be null. */
    public UUID getLocationId() { return locationId; }

    /** The user's role. Never sourced from client input after login. */
    public UserRole getRole() { return role; }

    // ── UserDetails contract ────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring Security convention: ROLE_ prefix required for hasRole() checks.
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /** Returns the BCrypt password hash. Used only by AuthenticationManager. */
    @Override
    public String getPassword() { return passwordHash; }

    /** Username is email. */
    @Override
    public String getUsername() { return email; }

    /** Account is never locked — disable via status = INACTIVE instead. */
    @Override
    public boolean isAccountNonLocked() { return true; }

    /** Credentials never expire — token-based rotation handles freshness. */
    @Override
    public boolean isCredentialsNonExpired() { return true; }

    /** Account is never expired — use status = INACTIVE to deactivate. */
    @Override
    public boolean isAccountNonExpired() { return true; }

    /** Returns false when status = INACTIVE; Spring Security rejects disabled accounts. */
    @Override
    public boolean isEnabled() { return enabled; }
}
