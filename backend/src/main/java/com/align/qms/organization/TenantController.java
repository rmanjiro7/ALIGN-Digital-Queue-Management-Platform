package com.align.qms.organization;

import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.organization.dto.UpdateOrganizationRequest;
import com.align.qms.organization.dto.UpdateOrganizationRulesRequest;
import com.align.qms.organization.dto.UpdateOrganizationStatusRequest;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Tenant (Organization) management.
 *
 * <p>All endpoints require PLATFORM_ADMIN role.
 * ORG_ADMIN and STAFF read their own organization via
 * {@code GET /api/v1/tenants/{orgId}} (same endpoint, different authorization
 * semantics enforced in OrganizationService via TenantContext).
 *
 * <p>Path: {@code /api/v1/tenants}
 */
@Tag(name = "Tenants", description = "Organization (Tenant) management")
@RestController
@RequestMapping("/api/v1/tenants")
public class TenantController {

    private final OrganizationService organizationService;

    public TenantController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    // ── GET /api/v1/tenants ──────────────────────────────────────────────────

    /**
     * List all organizations.
     * Only PLATFORM_ADMIN may list all tenants.
     */
    @Operation(summary = "List all organizations (Platform Admin only)")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<List<OrganizationResponse>> listAll() {
        return ResponseEntity.ok(organizationService.listAll());
    }

    // ── POST /api/v1/tenants ─────────────────────────────────────────────────

    /**
     * Create a new organization (tenant).
     * Only PLATFORM_ADMIN may create tenants.
     * Returns 201 Created with the new organization in the body.
     */
    @PostMapping
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> create(
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationResponse response = organizationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── GET /api/v1/tenants/{orgId} ──────────────────────────────────────────

    /**
     * Get a single organization by ID.
     *
     * <p>Authorization:
     * <ul>
     *   <li>PLATFORM_ADMIN: may read any organization.</li>
     *   <li>ORG_ADMIN / STAFF: may read only their own organization.
     *       TenantContext.requireSameTenant() enforces this in the service.</li>
     * </ul>
     */
    @GetMapping("/{orgId}")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN', 'STAFF')")
    public ResponseEntity<OrganizationResponse> getById(@PathVariable UUID orgId) {
        return ResponseEntity.ok(organizationService.getById(orgId));
    }

    // ── PUT /api/v1/tenants/{orgId} ──────────────────────────────────────────

    /**
     * Update an organization's mutable fields (name, sector, contactEmail).
     * Only PLATFORM_ADMIN may update tenant details.
     */
    @PutMapping("/{orgId}")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> update(
            @PathVariable UUID orgId,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        return ResponseEntity.ok(organizationService.update(orgId, request));
    }

    // ── PATCH /api/v1/tenants/{orgId}/status ─────────────────────────────────

    /**
     * Update an organization's status (ACTIVE / SUSPENDED).
     * Only PLATFORM_ADMIN may update tenant status.
     */
    @PatchMapping("/{orgId}/status")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> updateStatus(
            @PathVariable UUID orgId,
            @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        return ResponseEntity.ok(organizationService.updateStatus(orgId, request));
    }

    // ── PATCH /api/v1/tenants/{orgId}/rules ──────────────────────────────────

    /**
     * Update an organization's global operational rules.
     * Authorized for PLATFORM_ADMIN (any tenant) and ORG_ADMIN (own tenant).
     */
    @PatchMapping("/{orgId}/rules")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<OrganizationResponse> updateRules(
            @PathVariable UUID orgId,
            @Valid @RequestBody UpdateOrganizationRulesRequest request) {
        return ResponseEntity.ok(organizationService.updateRules(orgId, request));
    }
}
