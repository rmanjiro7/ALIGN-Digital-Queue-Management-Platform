package com.align.qms.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PreparationRequirementService {

    private final PreparationRequirementRepository repository;

    public PreparationRequirementService(PreparationRequirementRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PreparationRequirement createRequirement(PreparationRequirement requirement) {
        validateTenantAccess(requirement.getOrgId());
        return repository.save(requirement);
    }

    @Transactional
    public PreparationRequirement updateRequirement(UUID id, PreparationRequirement updated) {
        PreparationRequirement existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Requirement not found"));
        validateTenantAccess(existing.getOrgId());
        validateTenantAccess(updated.getOrgId());
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setIsRequired(updated.getIsRequired());
        existing.setIsActive(updated.getIsActive());
        existing.setDisplayOrder(updated.getDisplayOrder());
        return repository.save(existing);
    }

    @Transactional
    public void deleteRequirement(UUID id) {
        PreparationRequirement existing = repository.findById(id).orElse(null);
        if (existing != null) {
            validateTenantAccess(existing.getOrgId());
            repository.deleteById(id);
        }
    }

    @Transactional(readOnly = true)
    public List<PreparationRequirement> getRequirementsForService(UUID serviceId) {
        return repository.findByServiceIdOrderByDisplayOrderAsc(serviceId);
    }

    @Transactional(readOnly = true)
    public List<PreparationRequirement> getActiveRequirementsForService(UUID serviceId) {
        return repository.findByServiceIdAndIsActiveTrueOrderByDisplayOrderAsc(serviceId);
    }

    private void validateTenantAccess(UUID targetOrgId) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof com.align.qms.security.UserPrincipal principal) {
            if ("PLATFORM_ADMIN".equals(principal.getRole().name())) return;
            if ("ORG_ADMIN".equals(principal.getRole().name()) && principal.getOrgId().equals(targetOrgId)) return;
            throw new org.springframework.security.access.AccessDeniedException("Access Denied");
        }
        throw new org.springframework.security.access.AccessDeniedException("Access Denied");
    }
}
