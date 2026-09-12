package com.align.qms.location;

import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.location.dto.UpdateLocationRequest;
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
 * REST controller for Location management.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET (list/single): ORG_ADMIN (own org) or PLATFORM_ADMIN (any org).</li>
 *   <li>POST (create): ORG_ADMIN or PLATFORM_ADMIN.</li>
 *   <li>PUT (update): ORG_ADMIN only (own org).</li>
 * </ul>
 *
 * <p>Tenant isolation for non-PLATFORM_ADMIN is enforced in LocationService
 * via TenantContext.requireSameTenant(). The controller handles HTTP concerns only.
 *
 * <p>Path: {@code /api/v1/locations}
 */
@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    // ── GET /api/v1/locations?orgId={orgId} ──────────────────────────────────

    /**
     * List all locations for an organization.
     * ORG_ADMIN may only list their own org's locations (enforced in service).
     * PLATFORM_ADMIN may list any org's locations.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<List<LocationResponse>> listByOrg(
            @RequestParam UUID orgId) {
        return ResponseEntity.ok(locationService.listByOrg(orgId));
    }

    // ── GET /api/v1/locations/{locationId} ───────────────────────────────────

    /**
     * Get a single location by ID.
     * Tenant isolation enforced in service.
     */
    @GetMapping("/{locationId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<LocationResponse> getById(@PathVariable UUID locationId) {
        return ResponseEntity.ok(locationService.getById(locationId));
    }

    // ── POST /api/v1/locations ───────────────────────────────────────────────

    /**
     * Create a new location.
     * The orgId in the request body is validated against the caller's tenant.
     * Returns 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<LocationResponse> create(
            @Valid @RequestBody CreateLocationRequest request) {
        LocationResponse response = locationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── PUT /api/v1/locations/{locationId} ───────────────────────────────────

    /**
     * Update a location's mutable fields.
     * Only ORG_ADMIN may update locations (per API contract).
     */
    @PutMapping("/{locationId}")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<LocationResponse> update(
            @PathVariable UUID locationId,
            @Valid @RequestBody UpdateLocationRequest request) {
        return ResponseEntity.ok(locationService.update(locationId, request));
    }
}
