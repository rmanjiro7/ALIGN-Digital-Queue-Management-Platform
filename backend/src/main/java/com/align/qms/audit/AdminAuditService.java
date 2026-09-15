package com.align.qms.audit;

import com.align.qms.security.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminAuditService {

    private final AdminAuditRepository adminAuditRepository;
    private final ObjectMapper objectMapper;

    public AdminAuditService(AdminAuditRepository adminAuditRepository, ObjectMapper objectMapper) {
        this.adminAuditRepository = adminAuditRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void logEvent(UUID targetOrgId, UUID entityId, String entityType, String action, Object beforeState, Object afterState) {
        UUID orgId = targetOrgId;

        UUID actorId = null;
        String actorRole = null;
        try {
            actorId = TenantContext.getCurrentUserId();
            com.align.qms.user.UserRole role = TenantContext.getCurrentRole();
            if (role != null) {
                actorRole = role.name();
            }
        } catch (IllegalStateException e) {
            // Unauthenticated or system event
        }

        JsonNode beforeNode = beforeState != null ? objectMapper.valueToTree(beforeState) : null;
        JsonNode afterNode = afterState != null ? objectMapper.valueToTree(afterState) : null;

        AdminAuditEvent event = new AdminAuditEvent(
            orgId,
            actorId,
            actorRole,
            action,
            entityType,
            entityId,
            beforeNode,
            afterNode
        );

        adminAuditRepository.save(event);
    }

    @Transactional(readOnly = true)
    public Page<com.align.qms.audit.dto.AdminAuditResponse> listByOrg(UUID requestOrgId, Pageable pageable) {
        UUID orgId = resolveTargetOrgId(requestOrgId);
        return adminAuditRepository.findByOrgIdOrderByCreatedAtDesc(orgId, pageable)
                .map(com.align.qms.audit.dto.AdminAuditResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<com.align.qms.audit.dto.AdminAuditResponse> listByEntity(String entityType, UUID entityId, UUID requestOrgId, Pageable pageable) {
        UUID orgId = resolveTargetOrgId(requestOrgId);
        return adminAuditRepository.findByOrgIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(orgId, entityType, entityId, pageable)
                .map(com.align.qms.audit.dto.AdminAuditResponse::from);
    }

    private UUID resolveTargetOrgId(UUID requestOrgId) {
        if (TenantContext.isPlatformAdmin()) {
            if (requestOrgId == null) {
                throw new IllegalArgumentException("orgId is required for PLATFORM_ADMIN");
            }
            return requestOrgId;
        }
        return TenantContext.getCurrentOrgId();
    }
}
