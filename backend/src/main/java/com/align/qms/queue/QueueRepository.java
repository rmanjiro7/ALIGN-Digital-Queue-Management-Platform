package com.align.qms.queue;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Queue} entities.
 *
 * <p>The {@code UNIQUE(service_id)} constraint in the database ensures at most
 * one queue per service. Service-layer code catches {@code DataIntegrityViolationException}
 * and converts it to a domain {@code DuplicateQueueException} (409 Conflict).
 */
public interface QueueRepository extends JpaRepository<Queue, UUID> {

    /** Get the queue for a given service. Empty if no queue created yet. */
    Optional<Queue> findByServiceId(UUID serviceId);

    /** All queues at a specific location. */
    List<Queue> findByLocationId(UUID locationId);

    /** All queues for an organization. */
    List<Queue> findByOrgId(UUID orgId);

    /**
     * Tenant-scoped single lookup — returns empty if the queue belongs to
     * a different organization.
     */
    Optional<Queue> findByIdAndOrgId(UUID id, UUID orgId);

    /** Check whether a queue already exists for a given service. */
    boolean existsByServiceId(UUID serviceId);
}
