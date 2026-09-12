package com.align.qms.security;

import com.align.qms.user.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Utility for accessing the current authenticated user's tenant and role context
 * from the Spring SecurityContext (ADR-005 — Application-level tenant isolation).
 *
 * <p>This class reads from the validated {@link UserPrincipal} placed in the
 * SecurityContext by {@link JwtAuthenticationFilter}. Values here are TRUSTED —
 * they originate from the signed JWT, not from client input.
 *
 * <p>Usage in service layer:
 * <pre>
 *     UUID currentOrgId = TenantContext.getCurrentOrgId();
 *     if (!resource.getOrgId().equals(currentOrgId)) {
 *         throw new UnauthorizedTenantAccessException();
 *     }
 * </pre>
 *
 * <p>Thread safety: reads from {@link SecurityContextHolder} which is
 * thread-local per request. Safe for use in any Spring-managed bean.
 *
 * <p>NEVER use client-supplied {@code orgId}, {@code userId}, {@code locationId},
 * or {@code role} values for authorization decisions. Always use this class.
 */
public final class TenantContext {

    private TenantContext() {
        // utility class
    }

    /**
     * Get the current user's organization (tenant) UUID.
     *
     * @return orgId from the validated JWT; null for PLATFORM_ADMIN
     * @throws IllegalStateException if called outside an authenticated request
     */
    public static UUID getCurrentOrgId() {
        return getCurrentPrincipal().getOrgId();
    }

    /**
     * Get the current authenticated user's UUID.
     *
     * @throws IllegalStateException if called outside an authenticated request
     */
    public static UUID getCurrentUserId() {
        return getCurrentPrincipal().getId();
    }

    /**
     * Get the current authenticated user's role.
     *
     * @throws IllegalStateException if called outside an authenticated request
     */
    public static UserRole getCurrentRole() {
        return getCurrentPrincipal().getRole();
    }

    /**
     * Get the current authenticated user's location UUID (may be null).
     *
     * @throws IllegalStateException if called outside an authenticated request
     */
    public static UUID getCurrentLocationId() {
        return getCurrentPrincipal().getLocationId();
    }

    /**
     * Return true if the current user is a PLATFORM_ADMIN
     * (cross-tenant read access, no operational write access — BR-010).
     */
    public static boolean isPlatformAdmin() {
        return getCurrentRole() == UserRole.PLATFORM_ADMIN;
    }

    /**
     * Validate that the given orgId matches the current user's tenant scope.
     *
     * <p>PLATFORM_ADMIN passes this check unconditionally (cross-tenant read access).
     * All other roles must match exactly.
     *
     * @param resourceOrgId the orgId of the resource being accessed
     * @throws com.align.qms.exception.UnauthorizedTenantAccessException if tenant mismatch
     */
    public static void requireSameTenant(UUID resourceOrgId) {
        if (isPlatformAdmin()) {
            return; // cross-tenant read allowed for PLATFORM_ADMIN
        }
        UUID currentOrgId = getCurrentOrgId();
        if (currentOrgId == null || !currentOrgId.equals(resourceOrgId)) {
            throw new com.align.qms.exception.UnauthorizedTenantAccessException();
        }
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private static UserPrincipal getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new IllegalStateException(
                "TenantContext accessed outside an authenticated request");
        }
        return principal;
    }
}
