package com.align.qms.organization;

import com.align.qms.exception.DuplicateOrganizationCodeException;
import com.align.qms.exception.OrganizationNotFoundException;
import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.organization.dto.UpdateOrganizationRequest;
import com.align.qms.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public OrganizationService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
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
        log.info("Organization created: id={} code={}", saved.getId(), saved.getCode());
        return OrganizationResponse.from(saved);
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

        if (request.getName() != null && !request.getName().isBlank()) {
            org.setName(request.getName().trim());
        }
        if (request.getSector() != null) {
            org.setSector(request.getSector());
        }
        if (request.getContactEmail() != null) {
            org.setContactEmail(request.getContactEmail());
        }

        Organization saved = organizationRepository.save(org);
        log.info("Organization updated: id={}", saved.getId());
        return OrganizationResponse.from(saved);
    }
}
