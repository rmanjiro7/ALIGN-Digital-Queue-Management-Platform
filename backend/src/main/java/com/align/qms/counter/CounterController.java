package com.align.qms.counter;

import com.align.qms.counter.dto.CounterAssignmentRequest;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.counter.dto.CreateCounterRequest;
import com.align.qms.counter.dto.UpdateCounterAvailabilityRequest;
import com.align.qms.counter.dto.UpdateCounterStatusRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.align.qms.service.dto.ServiceResponse;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Counter management.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET (list): STAFF or ORG_ADMIN (own location).</li>
 *   <li>POST (create): ORG_ADMIN only.</li>
 *   <li>PUT availability: STAFF or ORG_ADMIN (own counter, same org).</li>
 * </ul>
 *
 * <p>Tenant isolation enforced in CounterService via TenantContext.
 *
 * <p>Path: {@code /api/v1/counters}
 */
@RestController
@RequestMapping("/api/v1/counters")
public class CounterController {

    private final CounterService counterService;

    public CounterController(CounterService counterService) {
        this.counterService = counterService;
    }

    // ── GET /api/v1/counters?locationId={locationId} ─────────────────────────

    /**
     * List all counters at a location.
     * Accessible to STAFF and ORG_ADMIN. Tenant isolation enforced in service.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")
    public ResponseEntity<List<CounterResponse>> listByLocation(
            @RequestParam UUID locationId) {
        return ResponseEntity.ok(counterService.listByLocation(locationId));
    }

    // ── GET /api/v1/counters/{counterId} ──────────────────────────────────────

    /**
     * Get a single counter by ID.
     */
    @GetMapping("/{counterId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")
    public ResponseEntity<CounterResponse> getById(
            @PathVariable UUID counterId) {
        return ResponseEntity.ok(counterService.getById(counterId));
    }

    // ── POST /api/v1/counters ─────────────────────────────────────────────────

    /**
     * Create a new counter at a location.
     * ORG_ADMIN only — counter number uniqueness per location enforced in service.
     * Returns 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<CounterResponse> create(
            @Valid @RequestBody CreateCounterRequest request) {
        CounterResponse response = counterService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── PUT /api/v1/counters/{counterId}/availability ─────────────────────────

    /**
     * Update counter availability (ONLINE / ON_BREAK / AWAY / OFFLINE).
     * STAFF or ORG_ADMIN — same tenant.
     */
    @PutMapping("/{counterId}/availability")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")
    public ResponseEntity<CounterResponse> updateAvailability(
            @PathVariable UUID counterId,
            @Valid @RequestBody UpdateCounterAvailabilityRequest request) {
        return ResponseEntity.ok(counterService.updateAvailability(counterId, request));
    }

    // ── POST /api/v1/counters/{counterId}/assignment ──────────────────────────

    @PostMapping("/{counterId}/assignment")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")
    public ResponseEntity<CounterResponse> assignStaff(
            @PathVariable UUID counterId,
            @Valid @RequestBody CounterAssignmentRequest request) {
        return ResponseEntity.ok(counterService.assignStaff(counterId, request));
    }

    // ── DELETE /api/v1/counters/{counterId}/assignment ────────────────────────

    @DeleteMapping("/{counterId}/assignment")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")
    public ResponseEntity<CounterResponse> unassignStaff(
            @PathVariable UUID counterId) {
        return ResponseEntity.ok(counterService.unassignStaff(counterId));
    }

    // ── PATCH /api/v1/counters/{counterId}/status ────────────────────────────

    @PatchMapping("/{counterId}/status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<CounterResponse> updateStatus(
            @PathVariable UUID counterId,
            @Valid @RequestBody UpdateCounterStatusRequest request) {
        return ResponseEntity.ok(counterService.updateStatus(counterId, request));
    }

    // ── GET /api/v1/counters/{counterId}/services ────────────────────────────

    @GetMapping("/{counterId}/services")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<List<ServiceResponse>> listAssignedServices(
            @PathVariable UUID counterId) {
        return ResponseEntity.ok(counterService.listAssignedServices(counterId));
    }

    // ── POST /api/v1/counters/{counterId}/services/{serviceId} ───────────────

    @PostMapping("/{counterId}/services/{serviceId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<Void> addServiceAssignment(
            @PathVariable UUID counterId,
            @PathVariable UUID serviceId) {
        counterService.addServiceAssignment(counterId, serviceId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // ── DELETE /api/v1/counters/{counterId}/services/{serviceId} ─────────────

    @DeleteMapping("/{counterId}/services/{serviceId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<Void> removeServiceAssignment(
            @PathVariable UUID counterId,
            @PathVariable UUID serviceId) {
        counterService.removeServiceAssignment(counterId, serviceId);
        return ResponseEntity.noContent().build();
    }
}
