package com.align.qms.location;

import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.exception.OrganizationNotFoundException;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.location.dto.UpdateLocationRequest;
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

    public LocationService(LocationRepository locationRepository,
                           OrganizationRepository organizationRepository) {
        this.locationRepository     = locationRepository;
        this.organizationRepository = organizationRepository;
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
        log.info("Location created: id={} orgId={}", saved.getId(), saved.getOrgId());
        return LocationResponse.from(saved);
    }

    // ── Update ───────────────────────────────────────────────────────────────

    @Transactional
    public LocationResponse update(UUID locationId, UpdateLocationRequest request) {
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        // Enforce tenant ownership before mutation
        TenantContext.requireSameTenant(location.getOrgId());

        if (request.getName() != null && !request.getName().isBlank()) {
            location.setName(request.getName().trim());
        }
        if (request.getSubtitle() != null) {
            location.setSubtitle(request.getSubtitle());
        }
        if (request.getAddress() != null) {
            location.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            location.setCity(request.getCity());
        }
        if (request.getOperatingHours() != null) {
            location.setOperatingHours(request.getOperatingHours());
        }
        if (request.getIsHq() != null) {
            location.setHq(request.getIsHq());
        }

        Location saved = locationRepository.save(location);
        log.info("Location updated: id={}", saved.getId());
        return LocationResponse.from(saved);
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
