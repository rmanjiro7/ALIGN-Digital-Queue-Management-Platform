package com.align.qms.user;

/**
 * ALIGN system user roles (ADR-005, SECURITY.md).
 *
 * <p>CUSTOMER is intentionally absent — customers are anonymous callers who
 * receive tokens without authenticating. They have no row in the {@code users}
 * table and no entry in the security context.
 *
 * <p>Role hierarchy for authorization decisions:
 * <ul>
 *   <li>STAFF — counter operators within their assigned organization</li>
 *   <li>ORG_ADMIN — full management of their own organization's resources</li>
 *   <li>PLATFORM_ADMIN — read-only cross-tenant; tenant creation only; NO operational actions</li>
 * </ul>
 */
public enum UserRole {

    /** Counter operator. Scoped to a single organization and location. */
    STAFF,

    /** Organization administrator. Manages locations, services, queues, staff within own org. */
    ORG_ADMIN,

    /**
     * Platform super-administrator. Read-only cross-tenant visibility + tenant onboarding.
     * Cannot perform operational actions (call next, complete service, configure queues).
     * org_id is NULL for PLATFORM_ADMIN users (no tenant scope).
     */
    PLATFORM_ADMIN
}
