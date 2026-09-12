package com.align.qms.organization;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Organization} (tenant) entities.
 *
 * <p>PLATFORM_ADMIN is the only role that may query across all organizations.
 * ORG_ADMIN and STAFF always interact with a single organization — their own.
 * Service-layer code enforces tenant isolation via {@code TenantContext}.
 */
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    /** Find a tenant by its unique human-readable code (e.g. "T-8492"). */
    Optional<Organization> findByCode(String code);

    /** Check whether a code is already taken (for uniqueness validation). */
    boolean existsByCode(String code);

    /** List all organizations by status — PLATFORM_ADMIN use only. */
    List<Organization> findByStatus(OrganizationStatus status);
}
