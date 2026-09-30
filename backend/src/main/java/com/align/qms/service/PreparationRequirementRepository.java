package com.align.qms.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PreparationRequirementRepository extends JpaRepository<PreparationRequirement, UUID> {
    List<PreparationRequirement> findByServiceIdOrderByDisplayOrderAsc(UUID serviceId);
    List<PreparationRequirement> findByServiceIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID serviceId);
}
