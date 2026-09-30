package com.align.qms.token;

import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.token.event.TokenRealtimeEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class JourneyService {

    private final JourneyRepository journeyRepository;
    private final JourneyStageRepository journeyStageRepository;
    private final TokenRepository tokenRepository;
    private final QueueRepository queueRepository;
    private final TokenEventService tokenEventService;

    public JourneyService(JourneyRepository journeyRepository,
                          JourneyStageRepository journeyStageRepository,
                          TokenRepository tokenRepository,
                          QueueRepository queueRepository,
                          TokenEventService tokenEventService) {
        this.journeyRepository = journeyRepository;
        this.journeyStageRepository = journeyStageRepository;
        this.tokenRepository = tokenRepository;
        this.queueRepository = queueRepository;
        this.tokenEventService = tokenEventService;
    }

    @Transactional
    public Journey createJourney(UUID orgId, String description, List<UUID> serviceIds) {
        Journey journey = new Journey();
        journey.setOrgId(orgId);
        journey.setDescription(description);
        journey.setStatus("ACTIVE");
        journey = journeyRepository.save(journey);

        List<JourneyStage> stages = new ArrayList<>();
        for (int i = 0; i < serviceIds.size(); i++) {
            JourneyStage stage = new JourneyStage();
            stage.setJourneyId(journey.getId());
            stage.setServiceId(serviceIds.get(i));
            stage.setSequenceOrder(i + 1);
            stage.setStatus(i == 0 ? "ACTIVE" : "PENDING");
            stages.add(journeyStageRepository.save(stage));
        }

        return journey;
    }

    @Transactional(readOnly = true)
    public Journey getJourney(UUID journeyId) {
        return journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
    }

    @Transactional(readOnly = true)
    public List<JourneyStage> getStages(UUID journeyId) {
        return journeyStageRepository.findByJourneyIdOrderBySequenceOrderAsc(journeyId);
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handleTokenCompleted(TokenRealtimeEvent event) {
        if (event.getPayload().getEventType() != TokenEventType.TOKEN_COMPLETED) {
            return;
        }

        UUID tokenId = event.getPayload().getTokenId();
        Token token = tokenRepository.findById(tokenId).orElse(null);
        if (token == null || token.getJourneyStageId() == null) {
            return;
        }

        JourneyStage currentStage = journeyStageRepository.findById(token.getJourneyStageId()).orElse(null);
        if (currentStage == null || !"ACTIVE".equals(currentStage.getStatus())) {
            return;
        }

        currentStage.setStatus("COMPLETED");
        journeyStageRepository.save(currentStage);

        List<JourneyStage> allStages = journeyStageRepository.findByJourneyIdOrderBySequenceOrderAsc(currentStage.getJourneyId());

        JourneyStage nextStage = null;
        for (JourneyStage stage : allStages) {
            if (stage.getSequenceOrder() > currentStage.getSequenceOrder() && "PENDING".equals(stage.getStatus())) {
                nextStage = stage;
                break;
            }
        }

        if (nextStage != null) {
            // Attempt to activate next stage
            com.align.qms.token.TokenService tokenService = org.springframework.web.context.support.WebApplicationContextUtils
                    .getRequiredWebApplicationContext(
                            ((org.springframework.web.context.request.ServletRequestAttributes) 
                            org.springframework.web.context.request.RequestContextHolder.getRequestAttributes())
                            .getRequest().getServletContext()
                    ).getBean(com.align.qms.token.TokenService.class);
            
            java.util.Optional<Token> newTokenOpt = tokenService.createJourneyTokenIfEligible(token, nextStage);
            if (newTokenOpt.isPresent()) {
                nextStage.setStatus("ACTIVE");
                journeyStageRepository.save(nextStage);
                
                Token newToken = newTokenOpt.get();
                token.setTransferredToTokenId(newToken.getId());
                tokenRepository.save(token);
            }
        } else {
            // No more stages, mark Journey as COMPLETED
            Journey journey = journeyRepository.findById(currentStage.getJourneyId()).orElse(null);
            if (journey != null) {
                journey.setStatus("COMPLETED");
                journeyRepository.save(journey);
            }
        }
    }
}
