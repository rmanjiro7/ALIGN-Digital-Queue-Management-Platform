package com.align.qms.notification;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AnnouncementTemplateService {

    private final AnnouncementTemplateRepository repository;

    public AnnouncementTemplateService(AnnouncementTemplateRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public AnnouncementTemplate createTemplate(AnnouncementTemplate template) {
        validateTenantAccess(template.getOrgId());
        return repository.save(template);
    }

    @Transactional
    public AnnouncementTemplate updateTemplate(UUID id, AnnouncementTemplate updated) {
        AnnouncementTemplate existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        validateTenantAccess(existing.getOrgId());
        existing.setLanguageCode(updated.getLanguageCode());
        existing.setEventType(updated.getEventType());
        existing.setTemplateText(updated.getTemplateText());
        existing.setIsDefault(updated.getIsDefault());
        return repository.save(existing);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        AnnouncementTemplate existing = repository.findById(id).orElse(null);
        if (existing != null) {
            validateTenantAccess(existing.getOrgId());
            repository.deleteById(id);
        }
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

    @Transactional(readOnly = true)
    public List<AnnouncementTemplate> getTemplatesByOrg(UUID orgId) {
        return repository.findByOrgId(orgId);
    }

    @Transactional(readOnly = true)
    public String resolveTemplate(UUID orgId, UUID locationId, UUID serviceId, String eventType, String languageCode) {
        // Find best matching template by service -> org, and matching language -> default language
        List<AnnouncementTemplate> serviceTemplates = repository.findByServiceId(serviceId);
        
        Optional<AnnouncementTemplate> exactMatch = serviceTemplates.stream()
                .filter(t -> t.getEventType().equals(eventType) && t.getLanguageCode().equals(languageCode))
                .findFirst();
        if (exactMatch.isPresent()) return exactMatch.get().getTemplateText();

        Optional<AnnouncementTemplate> defaultLangServiceMatch = serviceTemplates.stream()
                .filter(t -> t.getEventType().equals(eventType) && t.getIsDefault())
                .findFirst();
        if (defaultLangServiceMatch.isPresent()) return defaultLangServiceMatch.get().getTemplateText();

        List<AnnouncementTemplate> orgTemplates = repository.findByOrgIdAndLocationIdIsNullAndServiceIdIsNull(orgId);
        Optional<AnnouncementTemplate> orgExactMatch = orgTemplates.stream()
                .filter(t -> t.getEventType().equals(eventType) && t.getLanguageCode().equals(languageCode))
                .findFirst();
        if (orgExactMatch.isPresent()) return orgExactMatch.get().getTemplateText();

        Optional<AnnouncementTemplate> orgDefaultMatch = orgTemplates.stream()
                .filter(t -> t.getEventType().equals(eventType) && t.getIsDefault())
                .findFirst();
        
        return orgDefaultMatch.map(AnnouncementTemplate::getTemplateText).orElse(null);
    }
}
