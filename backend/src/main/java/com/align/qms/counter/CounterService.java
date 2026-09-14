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
import com.align.qms.user.UserRepository;
import com.align.qms.user.User;
import com.align.qms.user.UserStatus;
import com.align.qms.audit.AdminAuditService;
import com.align.qms.counter.log.CounterAvailabilityLog;
import com.align.qms.counter.log.CounterAvailabilityLogRepository;
import com.align.qms.counter.dto.CounterAssignmentRequest;

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
    private final UserRepository userRepository;
    private final CounterAvailabilityLogRepository counterAvailabilityLogRepository;
    private final AdminAuditService adminAuditService;

    public CounterService(CounterRepository counterRepository,
                          LocationRepository locationRepository,
                          UserRepository userRepository,
                          CounterAvailabilityLogRepository counterAvailabilityLogRepository,
                          AdminAuditService adminAuditService) {
        this.counterRepository  = counterRepository;
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
        this.counterAvailabilityLogRepository = counterAvailabilityLogRepository;
        this.adminAuditService = adminAuditService;
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

        CounterAvailability oldAvailability = counter.getAvailability();
        counter.setAvailability(request.getAvailability());
        Counter saved = counterRepository.save(counter);

        if (oldAvailability != request.getAvailability()) {
            CounterAvailabilityLog logEntry = new CounterAvailabilityLog(
                saved.getOrgId(),
                saved.getLocationId(),
                saved.getId(),
                oldAvailability != null ? oldAvailability.name() : null,
                saved.getAvailability() != null ? saved.getAvailability().name() : null,
                TenantContext.getCurrentUserId()
            );
            counterAvailabilityLogRepository.save(logEntry);
        }

        log.info("Counter availability updated: id={} availability={}",
            saved.getId(), saved.getAvailability());
        return CounterResponse.from(saved);
    }

    @Transactional
    public CounterResponse assignStaff(UUID counterId, CounterAssignmentRequest request) {
        Counter counter = counterRepository.findByIdForUpdate(counterId)
            .orElseThrow(() -> new CounterNotFoundException(counterId));

        TenantContext.requireSameTenant(counter.getOrgId());

        if (counter.getStatus() != CounterStatus.ACTIVE) {
            throw new IllegalStateException("Cannot assign staff to an inactive counter");
        }

        User staff = userRepository.findByIdForUpdate(request.getStaffUserId())
            .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));

        if (!staff.getOrgId().equals(counter.getOrgId())) {
            throw new IllegalArgumentException("Staff organization mismatch");
        }
        if (staff.getLocationId() == null || !staff.getLocationId().equals(counter.getLocationId())) {
            throw new IllegalArgumentException("Staff location mismatch");
        }
        if (staff.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Staff is not active");
        }
        if (staff.getAssignedCounterNumber() != null && !staff.getAssignedCounterNumber().equals(counter.getNumber())) {
            throw new IllegalStateException("Staff is already assigned to counter number " + staff.getAssignedCounterNumber());
        }

        CounterResponse beforeState = CounterResponse.from(counter);

        // If counter was assigned to someone else, unassign them
        if (counter.getAssignedStaffId() != null && !counter.getAssignedStaffId().equals(staff.getId())) {
            userRepository.findByIdForUpdate(counter.getAssignedStaffId()).ifPresent(oldStaff -> {
                oldStaff.setAssignedCounterNumber(null);
                userRepository.save(oldStaff);
            });
        }

        counter.setAssignedStaffId(staff.getId());
        staff.setAssignedCounterNumber(counter.getNumber());

        userRepository.save(staff);
        Counter saved = counterRepository.save(counter);
        
        CounterResponse afterState = CounterResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), "COUNTER", "ASSIGN_STAFF", beforeState, afterState);

        return afterState;
    }

    @Transactional
    public CounterResponse unassignStaff(UUID counterId) {
        Counter counter = counterRepository.findByIdForUpdate(counterId)
            .orElseThrow(() -> new CounterNotFoundException(counterId));

        TenantContext.requireSameTenant(counter.getOrgId());

        CounterResponse beforeState = CounterResponse.from(counter);

        if (counter.getAssignedStaffId() != null) {
            userRepository.findByIdForUpdate(counter.getAssignedStaffId()).ifPresent(staff -> {
                staff.setAssignedCounterNumber(null);
                userRepository.save(staff);
            });
            counter.setAssignedStaffId(null);
            // Optionally set availability offline if unassigned
            if (counter.getAvailability() != CounterAvailability.OFFLINE) {
                CounterAvailability oldAvailability = counter.getAvailability();
                counter.setAvailability(CounterAvailability.OFFLINE);
                CounterAvailabilityLog logEntry = new CounterAvailabilityLog(
                    counter.getOrgId(),
                    counter.getLocationId(),
                    counter.getId(),
                    oldAvailability != null ? oldAvailability.name() : null,
                    CounterAvailability.OFFLINE.name(),
                    TenantContext.getCurrentUserId()
                );
                counterAvailabilityLogRepository.save(logEntry);
            }
        }
        
        Counter saved = counterRepository.save(counter);
        
        CounterResponse afterState = CounterResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), "COUNTER", "UNASSIGN_STAFF", beforeState, afterState);
        
        return afterState;
    }
}
