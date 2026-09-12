package com.align.qms.service;

import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.exception.ServiceNotFoundException;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.security.TenantContext;
import com.align.qms.service.dto.CreateServiceRequest;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.service.dto.UpdateServiceStatusRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for Service management.
 *
 * <p>Named {@code ServiceDomainService} to avoid ambiguity with Spring's own
 * {@code @Service} stereotype and {@code java.util.Service}.
 *
 * <p>Tenant isolation: every operation validates that the parent location belongs
 * to the current caller's organization before any write. Cross-org creation is
 * blocked at both controller (PLATFORM_ADMIN cannot create services — only ORG_ADMIN)
 * and here (location ownership check).
 */
@org.springframework.stereotype.Service
public class ServiceDomainService {

    private static final Logger log = LoggerFactory.getLogger(ServiceDomainService.class);

    private final ServiceRepository  serviceRepository;
    private final LocationRepository locationRepository;

    public ServiceDomainService(ServiceRepository serviceRepository,
                                LocationRepository locationRepository) {
        this.serviceRepository  = serviceRepository;
        this.locationRepository = locationRepository;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /** List services by location. Public-facing (for customer discovery); no auth enforced here. */
    @Transactional(readOnly = true)
    public List<ServiceResponse> listByLocation(UUID locationId) {
        return serviceRepository.findByLocationId(locationId)
            .stream()
            .map(ServiceResponse::from)
            .collect(Collectors.toList());
    }

    /** List only enabled services by location (customer discovery endpoint). */
    @Transactional(readOnly = true)
    public List<ServiceResponse> listEnabledByLocation(UUID locationId) {
        return serviceRepository.findByLocationIdAndEnabled(locationId, true)
            .stream()
            .map(ServiceResponse::from)
            .collect(Collectors.toList());
    }

    // ── Get by id ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ServiceResponse getById(UUID serviceId) {
        ServiceEntity svc = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));
        TenantContext.requireSameTenant(svc.getOrgId());
        return ServiceResponse.from(svc);
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Transactional
    public ServiceResponse create(CreateServiceRequest request) {
        UUID locationId = request.getLocationId();

        // Load and validate parent location; also determines the org this service belongs to
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));

        // Tenant isolation — caller must own this location
        TenantContext.requireSameTenant(location.getOrgId());

        ServiceEntity svc = new ServiceEntity(
            location.getOrgId(),
            locationId,
            request.getName().trim(),
            request.getDescription(),
            request.getIcon(),
            Boolean.TRUE.equals(request.getIsFastTrack()),
            request.getPreparationGuidance()
        );

        ServiceEntity saved = serviceRepository.save(svc);
        log.info("Service created: id={} locationId={} orgId={}", saved.getId(), locationId, saved.getOrgId());
        return ServiceResponse.from(saved);
    }

    // ── Enable / disable ─────────────────────────────────────────────────────

    @Transactional
    public ServiceResponse updateStatus(UUID serviceId, UpdateServiceStatusRequest request) {
        ServiceEntity svc = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        TenantContext.requireSameTenant(svc.getOrgId());
        svc.setEnabled(Boolean.TRUE.equals(request.getEnabled()));

        ServiceEntity saved = serviceRepository.save(svc);
        log.info("Service status updated: id={} enabled={}", saved.getId(), saved.isEnabled());
        return ServiceResponse.from(saved);
    }
}
