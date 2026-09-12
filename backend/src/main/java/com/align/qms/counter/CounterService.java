package com.align.qms.counter;

import com.align.qms.counter.dto.CreateCounterRequest;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.counter.dto.UpdateCounterAvailabilityRequest;
import com.align.qms.exception.CounterNotFoundException;
import com.align.qms.exception.DuplicateCounterNumberException;
import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for Counter management.
 *
 * <p>Business rules enforced here:
 * <ul>
 *   <li>Counter number must be unique within a location (caught via
 *       DataIntegrityViolationException → DuplicateCounterNumberException 409).</li>
 *   <li>Counter must belong to the caller's organization (tenant isolation).</li>
 *   <li>Parent location must exist and belong to the caller's organization.</li>
 *   <li>Counters do NOT have a direct queue_id — they belong to a location and
 *       serve tokens from the location's service queues (Phase 3+).</li>
 * </ul>
 */
@Service
public class CounterService {

    private static final Logger log = LoggerFactory.getLogger(CounterService.class);

    private final CounterRepository  counterRepository;
    private final LocationRepository locationRepository;

    public CounterService(CounterRepository counterRepository,
                          LocationRepository locationRepository) {
        this.counterRepository  = counterRepository;
        this.locationRepository = locationRepository;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /**
     * List all counters at a given location.
     * Tenant isolation: filter by org unless PLATFORM_ADMIN.
     */
    @Transactional(readOnly = true)
    public List<CounterResponse> listByLocation(UUID locationId) {
        UUID currentOrgId = TenantContext.getCurrentOrgId();

        if (TenantContext.isPlatformAdmin()) {
            return counterRepository.findByLocationId(locationId)
                .stream()
                .map(CounterResponse::from)
                .collect(Collectors.toList());
        }

        return counterRepository.findByLocationId(locationId)
            .stream()
            .filter(c -> c.getOrgId().equals(currentOrgId))
            .map(CounterResponse::from)
            .collect(Collectors.toList());
    }

    // ── Get by id ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CounterResponse getById(UUID counterId) {
        Counter counter = counterRepository.findById(counterId)
            .orElseThrow(() -> new CounterNotFoundException(counterId));

        TenantContext.requireSameTenant(counter.getOrgId());
        return CounterResponse.from(counter);
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Transactional
    public CounterResponse create(CreateCounterRequest request) {
        UUID locationId = request.getLocationId();

        // Validate parent location exists and caller owns it
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        TenantContext.requireSameTenant(location.getOrgId());

        int number = request.getNumber();

        // Check for duplicate counter number before hitting the DB constraint
        if (counterRepository.existsByLocationIdAndNumber(locationId, number)) {
            throw new DuplicateCounterNumberException(locationId, number);
        }

        Counter counter = new Counter(
            location.getOrgId(),
            locationId,
            number,
            request.getName()
        );

        try {
            Counter saved = counterRepository.save(counter);
            log.info("Counter created: id={} locationId={} number={} orgId={}",
                saved.getId(), locationId, number, saved.getOrgId());
            return CounterResponse.from(saved);
        } catch (DataIntegrityViolationException ex) {
            // Race condition: two concurrent requests for the same location+number
            throw new DuplicateCounterNumberException(locationId, number);
        }
    }

    // ── Update availability ──────────────────────────────────────────────────

    /**
     * Update counter availability (ONLINE / ON_BREAK / AWAY / OFFLINE).
     * Allowed for STAFF and ORG_ADMIN within the same tenant.
     */
    @Transactional
    public CounterResponse updateAvailability(UUID counterId,
                                              UpdateCounterAvailabilityRequest request) {
        Counter counter = counterRepository.findById(counterId)
            .orElseThrow(() -> new CounterNotFoundException(counterId));

        TenantContext.requireSameTenant(counter.getOrgId());

        counter.setAvailability(request.getAvailability());
        Counter saved = counterRepository.save(counter);
        log.info("Counter availability updated: id={} availability={}",
            saved.getId(), saved.getAvailability());
        return CounterResponse.from(saved);
    }
}
