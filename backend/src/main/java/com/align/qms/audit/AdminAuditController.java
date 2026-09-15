package com.align.qms.audit;

import com.align.qms.audit.dto.AdminAuditResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN')")
public class AdminAuditController {

    private static final int MAX_PAGE_SIZE = 100;
    private final AdminAuditService adminAuditService;

    public AdminAuditController(AdminAuditService adminAuditService) {
        this.adminAuditService = adminAuditService;
    }

    @GetMapping
    public Page<AdminAuditResponse> listByOrg(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminAuditService.listByOrg(orgId, createPageable(page, size));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public Page<AdminAuditResponse> listByEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId,
            @RequestParam(required = false) UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminAuditService.listByEntity(entityType, entityId, orgId, createPageable(page, size));
    }

    private Pageable createPageable(int page, int size) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        if (safeSize < 1) safeSize = 20;
        if (page < 0) page = 0;
        return PageRequest.of(page, safeSize);
    }
}
