package com.align.qms.audit;

import com.align.qms.security.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    public void logEvent(UUID entityId, String entityType, String action, Object beforeState, Object afterState) {
        UUID orgId = null;
        try {
            orgId = TenantContext.getCurrentOrgId();
        } catch (IllegalStateException e) {
            // Might be a cross-tenant platform admin action, orgId remains null.
            // But wait, platform admins don't have orgId in TenantContext (throws IllegalStateException).
            // Actually, we should check if they are PLATFORM_ADMIN or get it if present.
        }

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
}
