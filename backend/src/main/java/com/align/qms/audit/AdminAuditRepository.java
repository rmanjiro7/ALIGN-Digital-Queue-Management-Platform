package com.align.qms.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminAuditRepository extends JpaRepository<AdminAuditEvent, UUID> {
}
