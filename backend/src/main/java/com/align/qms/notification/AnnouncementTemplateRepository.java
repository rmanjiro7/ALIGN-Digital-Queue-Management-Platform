package com.align.qms.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AnnouncementTemplateRepository extends JpaRepository<AnnouncementTemplate, UUID> {
    List<AnnouncementTemplate> findByOrgId(UUID orgId);
    List<AnnouncementTemplate> findByOrgIdAndLocationIdIsNullAndServiceIdIsNull(UUID orgId);
    List<AnnouncementTemplate> findByServiceId(UUID serviceId);
}
