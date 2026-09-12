package com.align.qms.user;

/**
 * Lifecycle status for a {@link User}.
 *
 * <p>INACTIVE users cannot authenticate. The check is enforced both at login
 * (AuthService) and by Spring Security's {@code UserDetails.isEnabled()} — any
 * request carrying a JWT issued before deactivation is still rejected at the
 * filter level because {@code UserDetailsServiceImpl.loadUserByUsername} is
 * called on every request and rejects INACTIVE accounts with 401.
 */
public enum UserStatus {

    /** Account is active. Authentication and all role-permitted operations allowed. */
    ACTIVE,

    /** Account is deactivated. Login and all protected endpoints return 401. */
    INACTIVE
}
