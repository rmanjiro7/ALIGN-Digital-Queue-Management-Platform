package com.align.qms.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link User} entities.
 *
 * <p>All queries that filter by orgId enforce tenant scope at the repository level.
 * Service layer additionally validates ownership before mutations (ADR-005).
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find user by email for authentication.
     * Used by {@link com.align.qms.security.UserDetailsServiceImpl}.
     */
    Optional<User> findByEmail(String email);

    /**
     * Find active user by email — login flow.
     */
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.status = 'ACTIVE'")
    Optional<User> findActiveByEmail(@Param("email") String email);

    /**
     * Check if an email already exists (case-insensitive).
     * Used when creating new users to enforce global uniqueness.
     */
    boolean existsByEmailIgnoreCase(String email);

    /**
     * List all users belonging to a specific organization.
     * Used by ORG_ADMIN staff management (Phase 2+).
     */
    List<User> findByOrgId(UUID orgId);

    /**
     * List users by organization and role.
     * Example: list all STAFF for org admin view.
     */
    List<User> findByOrgIdAndRole(UUID orgId, UserRole role);

    /**
     * List users by organization and status.
     * Example: list active staff only.
     */
    List<User> findByOrgIdAndStatus(UUID orgId, UserStatus status);

    /** Acquire row-level lock on User for assignment operations */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);
}
