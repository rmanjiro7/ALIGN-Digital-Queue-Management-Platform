package com.align.qms.location;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Location} entities.
 *
 * <p>All queries that an ORG_ADMIN issues must include {@code orgId} to enforce
 * tenant isolation at the repository level. Service-layer code additionally
 * calls {@code TenantContext.requireSameTenant()} before mutations.
 */
public interface LocationRepository extends JpaRepository<Location, UUID> {

    /** All locations for an organization (used by ORG_ADMIN and PLATFORM_ADMIN). */
    List<Location> findByOrgId(UUID orgId);

    /** Tenant-scoped list filtered by status. */
    List<Location> findByOrgIdAndStatus(UUID orgId, LocationStatus status);

    /**
     * Tenant-scoped single lookup — returns empty if the location exists but
     * belongs to a different organization. Service layer uses this as the
     * primary safe getter (avoids a separate exists + find sequence).
     */
    Optional<Location> findByIdAndOrgId(UUID id, UUID orgId);

    /** Check whether any location belongs to the given org (existence check). */
    boolean existsByIdAndOrgId(UUID id, UUID orgId);
}
