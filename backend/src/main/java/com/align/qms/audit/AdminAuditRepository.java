package com.align.qms.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminAuditRepository extends JpaRepository<AdminAuditEvent, UUID> {
    Page<AdminAuditEvent> findByOrgIdOrderByCreatedAtDesc(UUID orgId, Pageable pageable);
    Page<AdminAuditEvent> findByOrgIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(UUID orgId, String entityType, UUID entityId, Pageable pageable);
}
