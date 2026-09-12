package com.align.qms.counter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Counter} entities.
 *
 * <p>The {@code UNIQUE(location_id, number)} constraint ensures counter numbers
 * are unique within a location. Service-layer code catches
 * {@code DataIntegrityViolationException} and converts it to
 * {@code DuplicateCounterNumberException} (409 Conflict).
 */
public interface CounterRepository extends JpaRepository<Counter, UUID> {

    /** All counters at a specific location. */
    List<Counter> findByLocationId(UUID locationId);

    /** All counters belonging to an organization. */
    List<Counter> findByOrgId(UUID orgId);

    /**
     * Tenant-scoped single lookup — returns empty if the counter belongs to
     * a different organization.
     */
    Optional<Counter> findByIdAndOrgId(UUID id, UUID orgId);

    /** Check whether a counter number is already taken at a location. */
    boolean existsByLocationIdAndNumber(UUID locationId, int number);

    /** Acquire row-level lock on Counter for CALL NEXT operations */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Counter c WHERE c.id = :id")
    Optional<Counter> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
