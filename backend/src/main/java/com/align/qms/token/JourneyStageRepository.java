package com.align.qms.token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JourneyStageRepository extends JpaRepository<JourneyStage, UUID> {
    List<JourneyStage> findByJourneyIdOrderBySequenceOrderAsc(UUID journeyId);
    List<JourneyStage> findByJourneyIdAndStatus(UUID journeyId, String status);
}
