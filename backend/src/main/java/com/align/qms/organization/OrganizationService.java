package com.align.qms.organization;

import com.align.qms.exception.DuplicateOrganizationCodeException;
import com.align.qms.exception.OrganizationNotFoundException;
import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.organization.dto.UpdateOrganizationRequest;
import com.align.qms.organization.dto.UpdateOrganizationRulesRequest;
import com.align.qms.organization.dto.UpdateOrganizationStatusRequest;
import com.align.qms.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for Organization (tenant) management.
 *
 * <p>Access control:
 * <ul>
 *   <li>PLATFORM_ADMIN: full CRUD access to all organizations.</li>
 *   <li>ORG_ADMIN / STAFF: read-only access to their own organization only.</li>
 * </ul>
 *
 * <p>Controller enforces role via {@code @PreAuthorize}.
 * This service enforces tenant scope for non-platform-admin reads.
 */
@Service
public class OrganizationService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationService.class);

    private final OrganizationRepository organizationRepository;
    private final com.align.qms.audit.AdminAuditService adminAuditService;
    private final ApplicationEventPublisher applicationEventPublisher;

    public OrganizationService(OrganizationRepository organizationRepository, com.align.qms.audit.AdminAuditService adminAuditService, ApplicationEventPublisher applicationEventPublisher) {
        this.organizationRepository = organizationRepository;
        this.adminAuditService = adminAuditService;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    // ── PLATFORM_ADMIN: list all ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OrganizationResponse> listAll() {
        return organizationRepository.findAll()
            .stream()
            .map(OrganizationResponse::from)
            .collect(Collectors.toList());
    }

    // ── PLATFORM_ADMIN: create ───────────────────────────────────────────────

    @Transactional
    public OrganizationResponse create(CreateOrganizationRequest request) {
        String code = request.getCode().trim().toUpperCase();

        if (organizationRepository.existsByCode(code)) {
            throw new DuplicateOrganizationCodeException(code);
        }

        Organization org = new Organization(
            code,
            request.getName().trim(),
            request.getSector(),
            request.getContactEmail()
        );

        Organization saved = organizationRepository.save(org);
        OrganizationResponse response = OrganizationResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), saved.getId(), "ORGANIZATION", "CREATE", null, response);
        log.info("Organization created: id={} code={}", saved.getId(), saved.getCode());
        return response;
    }

    // ── Get by id — platform admin (any) or org member (own) ─────────────────

    @Transactional(readOnly = true)
    public OrganizationResponse getById(UUID orgId) {
        Organization org = organizationRepository.findById(orgId)
            .orElseThrow(() -> new OrganizationNotFoundException(orgId));

        // Non-platform-admin callers may only see their own org
        TenantContext.requireSameTenant(org.getId());

        return OrganizationResponse.from(org);
    }

    // ── PLATFORM_ADMIN: update ───────────────────────────────────────────────

    @Transactional
    public OrganizationResponse update(UUID orgId, UpdateOrganizationRequest request) {
        Organization org = organizationRepository.findById(orgId)
            .orElseThrow(() -> new OrganizationNotFoundException(orgId));

        OrganizationResponse beforeState = OrganizationResponse.from(org);

        boolean changed = false;

        if (request.getName() != null && !request.getName().isBlank() && !request.getName().trim().equals(org.getName())) {
            org.setName(request.getName().trim());
            changed = true;
        }
        if (request.getSector() != null && !request.getSector().equals(org.getSector())) {
            org.setSector(request.getSector());
            changed = true;
        }
        if (request.getContactEmail() != null && !request.getContactEmail().equals(org.getContactEmail())) {
            org.setContactEmail(request.getContactEmail());
            changed = true;
        }

        if (!changed) {
            return beforeState;
        }

        Organization saved = organizationRepository.save(org);
        OrganizationResponse afterState = OrganizationResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), saved.getId(), "ORGANIZATION", "UPDATE", beforeState, afterState);

        log.info("Organization updated: id={}", saved.getId());
        return afterState;
    }

    @Transactional
    public OrganizationResponse updateStatus(UUID orgId, UpdateOrganizationStatusRequest request) {
        Organization org = organizationRepository.findById(orgId)
            .orElseThrow(() -> new OrganizationNotFoundException(orgId));

        OrganizationResponse beforeState = OrganizationResponse.from(org);

        if (org.getStatus() == request.getStatus()) {
            return beforeState;
        }

        org.setStatus(request.getStatus());

        Organization saved = organizationRepository.save(org);
        OrganizationResponse afterState = OrganizationResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), saved.getId(), "ORGANIZATION", "UPDATE_STATUS", beforeState, afterState);

        log.info("Organization status updated: id={} status={}", saved.getId(), saved.getStatus());
        return afterState;
    }

    // ── Update Global Rules (PLATFORM_ADMIN or ORG_ADMIN) ────────────────────

    @Transactional
    public OrganizationResponse updateRules(UUID orgId, UpdateOrganizationRulesRequest request) {
        Organization org = organizationRepository.findById(orgId)
            .orElseThrow(() -> new OrganizationNotFoundException(orgId));

        // Enforce tenant scoping: ORG_ADMIN can only update their own tenant
        TenantContext.requireSameTenant(org.getId());

        OrganizationResponse beforeState = OrganizationResponse.from(org);

        boolean changed = false;

        if (request.getCapacityThresholdPercent() != null && !request.getCapacityThresholdPercent().equals(org.getCapacityThresholdPercent())) {
            org.setCapacityThresholdPercent(request.getCapacityThresholdPercent());
            changed = true;
        }

        if (request.getMaxWaitThresholdMins() != null && !request.getMaxWaitThresholdMins().equals(org.getMaxWaitThresholdMins())) {
            org.setMaxWaitThresholdMins(request.getMaxWaitThresholdMins());
            changed = true;
        }

        if (!changed) {
            return beforeState;
        }

        Organization saved = organizationRepository.save(org);
        OrganizationResponse afterState = OrganizationResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), saved.getId(), "ORGANIZATION", "UPDATE_GLOBAL_RULES", beforeState, afterState);

        applicationEventPublisher.publishEvent(new com.align.qms.organization.event.OrganizationRulesUpdatedEvent(this, saved.getId()));

        log.info("Organization global rules updated: id={}", saved.getId());
        return afterState;
    }
}
