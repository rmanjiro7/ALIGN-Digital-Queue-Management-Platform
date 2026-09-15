package com.align.qms.service;

import com.align.qms.service.dto.CreateServiceRequest;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.service.dto.UpdateServiceRequest;
import com.align.qms.service.dto.UpdateServiceStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Service management.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET (list by location): Public / any authenticated user — customers
 *       need this for queue discovery.</li>
 *   <li>POST (create): ORG_ADMIN only.</li>
 *   <li>PUT (update status): ORG_ADMIN only.</li>
 * </ul>
 *
 * <p>Path: {@code /api/v1/services}
 */
@RestController
@RequestMapping("/api/v1/services")
public class ServiceController {

    private final ServiceDomainService serviceDomainService;

    public ServiceController(ServiceDomainService serviceDomainService) {
        this.serviceDomainService = serviceDomainService;
    }

    // ── GET /api/v1/services?locationId={locationId} ─────────────────────────

    /**
     * List enabled services at a location (customer discovery endpoint).
     * Public — no authentication required. Returns only enabled services.
     */
    @GetMapping
    public ResponseEntity<List<ServiceResponse>> listByLocation(
            @RequestParam UUID locationId) {
        return ResponseEntity.ok(serviceDomainService.listEnabledByLocation(locationId));
    }

    // ── GET /api/v1/services/{serviceId} ─────────────────────────────────────

    /**
     * Get a single service by ID.
     * Accessible to authenticated users. Tenant isolation enforced in service.
     */
    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN', 'STAFF')")
    public ResponseEntity<ServiceResponse> getById(@PathVariable UUID serviceId) {
        return ResponseEntity.ok(serviceDomainService.getById(serviceId));
    }

    // ── POST /api/v1/services ─────────────────────────────────────────────────

    /**
     * Create a new service at a location.
     * ORG_ADMIN only — caller must own the parent location.
     * Returns 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<ServiceResponse> create(
            @Valid @RequestBody CreateServiceRequest request) {
        ServiceResponse response = serviceDomainService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── PUT /api/v1/services/{serviceId}/status ───────────────────────────────

    /**
     * Enable or disable a service.
     * ORG_ADMIN only (per API contract).
     */
    @PutMapping("/{serviceId}/status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<ServiceResponse> updateStatus(
            @PathVariable UUID serviceId,
            @Valid @RequestBody UpdateServiceStatusRequest request) {
        return ResponseEntity.ok(serviceDomainService.updateStatus(serviceId, request));
    }

    // ── PUT /api/v1/services/{serviceId} ─────────────────────────────────────

    @PutMapping("/{serviceId}")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<ServiceResponse> update(
            @PathVariable UUID serviceId,
            @Valid @RequestBody UpdateServiceRequest request) {
        return ResponseEntity.ok(serviceDomainService.update(serviceId, request));
    }
}
