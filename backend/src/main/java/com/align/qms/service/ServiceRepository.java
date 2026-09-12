package com.align.qms.service;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link ServiceEntity} entities.
 *
 * <p>All write operations are guarded by tenant ownership checks in the
 * service layer. Repository queries include {@code orgId} or {@code locationId}
 * to prevent cross-tenant data leakage at the persistence tier.
 */
public interface ServiceRepository extends JpaRepository<ServiceEntity, UUID> {

    /** All services under a location — used for customer discovery and admin views. */
    List<ServiceEntity> findByLocationId(UUID locationId);

    /** All services under a location filtered by enabled flag (customer-facing). */
    List<ServiceEntity> findByLocationIdAndEnabled(UUID locationId, boolean enabled);

    /** All services in an org at a specific location (admin view). */
    List<ServiceEntity> findByOrgIdAndLocationId(UUID orgId, UUID locationId);

    /**
     * Tenant-scoped single lookup — returns empty if the service exists but
     * belongs to a different organization.
     */
    Optional<ServiceEntity> findByIdAndOrgId(UUID id, UUID orgId);

    /** Check whether a service belongs to a specific location (parent validation). */
    boolean existsByIdAndLocationId(UUID id, UUID locationId);
}
