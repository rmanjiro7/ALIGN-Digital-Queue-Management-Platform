package com.align.qms.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT q FROM Queue q WHERE q.serviceId = :serviceId")
    Optional<Queue> findByServiceIdForUpdate(@Param("serviceId") UUID serviceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT q FROM Queue q WHERE q.id = :id")
    Optional<Queue> findByIdForUpdate(@Param("id") UUID id);

    /** All queues at a specific location, ordered deterministically by name. */
    List<Queue> findByLocationIdOrderByNameAsc(UUID locationId);

    /** All queues for an organization. */
    List<Queue> findByOrgId(UUID orgId);

    /**
     * Tenant-scoped single lookup — returns empty if the queue belongs to
     * a different organization.
     */
    Optional<Queue> findByIdAndOrgId(UUID id, UUID orgId);

    /** Check whether a queue already exists for a given service. */
    boolean existsByServiceId(UUID serviceId);

    /**
     * Atomically increments the token counter and returns the PRE-INCREMENT value.
     */
    @Query(value = "UPDATE queues SET next_token_number = next_token_number + 1 WHERE id = :queueId RETURNING next_token_number - 1", nativeQuery = true)
    Long allocateNextTokenNumber(@Param("queueId") UUID queueId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Queue q SET q.capacityWarningActive = :newState WHERE q.id = :queueId AND q.capacityWarningActive = :expectedOldState")
    int setCapacityWarningActive(@Param("queueId") UUID queueId, @Param("newState") boolean newState, @Param("expectedOldState") boolean expectedOldState);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Queue q SET q.waitWarningActive = :newState WHERE q.id = :queueId AND q.waitWarningActive = :expectedOldState")
    int setWaitWarningActive(@Param("queueId") UUID queueId, @Param("newState") boolean newState, @Param("expectedOldState") boolean expectedOldState);
}
