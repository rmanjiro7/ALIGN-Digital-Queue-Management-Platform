package com.align.qms.location;

import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.exception.OrganizationNotFoundException;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.location.dto.UpdateLocationRequest;
import com.align.qms.location.dto.UpdateLocationStatusRequest;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for Location management.
 *
 * <p>Tenant isolation rules:
 * <ul>
 *   <li>ORG_ADMIN: may create/update/read locations within their own organization only.</li>
 *   <li>PLATFORM_ADMIN: may read any org's locations; may also create on behalf of an org.</li>
 * </ul>
 *
 * <p>Critical: when an ORG_ADMIN supplies {@code orgId} in the request body, that value
 * is validated against the JWT's tenant identity — it cannot be used to target another org.
 */
@Service
public class LocationService {

    private static final Logger log = LoggerFactory.getLogger(LocationService.class);

    private final LocationRepository     locationRepository;
    private final OrganizationRepository organizationRepository;
    private final com.align.qms.audit.AdminAuditService adminAuditService;

    public LocationService(LocationRepository locationRepository,
                           OrganizationRepository organizationRepository,
                           com.align.qms.audit.AdminAuditService adminAuditService) {
        this.locationRepository     = locationRepository;
        this.organizationRepository = organizationRepository;
        this.adminAuditService = adminAuditService;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LocationResponse> listByOrg(UUID orgId) {
        // Verify the org exists and caller has access
        requireOrgExistsAndAccess(orgId);

        return locationRepository.findByOrgId(orgId)
            .stream()
            .map(LocationResponse::from)
            .collect(Collectors.toList());
    }

    // ── Get by id ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LocationResponse getById(UUID locationId) {
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        TenantContext.requireSameTenant(location.getOrgId());
        return LocationResponse.from(location);
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Transactional
    public LocationResponse create(CreateLocationRequest request) {
        UUID orgId = request.getOrgId();

        // Validate the target org exists
        requireOrgExistsAndAccess(orgId);

        Location location = new Location(
            orgId,
            request.getName().trim(),
            request.getSubtitle(),
            request.getAddress(),
            request.getCity(),
            request.getOperatingHours(),
            Boolean.TRUE.equals(request.getIsHq())
        );

        Location saved = locationRepository.save(location);
        LocationResponse response = LocationResponse.from(saved);
        adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "LOCATION", "CREATE", null, response);
        log.info("Location created: id={} orgId={}", saved.getId(), saved.getOrgId());
        return response;
    }

    // ── Update ───────────────────────────────────────────────────────────────

    @Transactional
    public LocationResponse update(UUID locationId, UpdateLocationRequest request) {
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        // Enforce tenant ownership before mutation
        TenantContext.requireSameTenant(location.getOrgId());

        LocationResponse beforeState = LocationResponse.from(location);

        boolean changed = false;

        if (request.getName() != null && !request.getName().isBlank() && !request.getName().trim().equals(location.getName())) {
            location.setName(request.getName().trim());
            changed = true;
        }
        if (request.getSubtitle() != null && !request.getSubtitle().equals(location.getSubtitle())) {
            location.setSubtitle(request.getSubtitle());
            changed = true;
        }
        if (request.getAddress() != null && !request.getAddress().equals(location.getAddress())) {
            location.setAddress(request.getAddress());
            changed = true;
        }
        if (request.getCity() != null && !request.getCity().equals(location.getCity())) {
            location.setCity(request.getCity());
            changed = true;
        }
        if (request.getOperatingHours() != null && !request.getOperatingHours().equals(location.getOperatingHours())) {
            location.setOperatingHours(request.getOperatingHours());
            changed = true;
        }
        if (request.getIsHq() != null && !request.getIsHq().equals(location.isHq())) {
            location.setHq(request.getIsHq());
            changed = true;
        }

        if (!changed) {
            return beforeState;
        }

        Location saved = locationRepository.save(location);
        LocationResponse afterState = LocationResponse.from(saved);
        adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "LOCATION", "UPDATE", beforeState, afterState);
        log.info("Location updated: id={}", saved.getId());
        return afterState;
    }

    // ── Update Status ────────────────────────────────────────────────────────

    @Transactional
    public LocationResponse updateStatus(UUID locationId, UpdateLocationStatusRequest request) {
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        // Enforce tenant ownership before mutation
        TenantContext.requireSameTenant(location.getOrgId());

        LocationResponse beforeState = LocationResponse.from(location);

        if (location.getStatus() == request.getStatus()) {
            return beforeState;
        }

        location.setStatus(request.getStatus());

        Location saved = locationRepository.save(location);
        LocationResponse afterState = LocationResponse.from(saved);
        adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "LOCATION", "UPDATE_STATUS", beforeState, afterState);
        log.info("Location status updated: id={} status={}", saved.getId(), saved.getStatus());
        return afterState;
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /**
     * Asserts that the organization exists and that the current caller
     * is allowed to operate on it (same tenant or PLATFORM_ADMIN).
     */
    private void requireOrgExistsAndAccess(UUID orgId) {
        organizationRepository.findById(orgId)
            .orElseThrow(() -> new OrganizationNotFoundException(orgId));
        TenantContext.requireSameTenant(orgId);
    }
}
