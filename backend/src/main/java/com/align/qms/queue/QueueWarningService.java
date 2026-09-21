package com.align.qms.queue;

import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.event.QueueWarningEvent;
import com.align.qms.queue.event.QueueWarningPayload;
import com.align.qms.queue.event.QueueWarningTransition;
import com.align.qms.queue.event.QueueWarningType;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class QueueWarningService {

    private static final Logger log = LoggerFactory.getLogger(QueueWarningService.class);

    private final QueueRepository queueRepository;
    private final TokenRepository tokenRepository;
    private final OrganizationRepository organizationRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    public QueueWarningService(QueueRepository queueRepository,
                               TokenRepository tokenRepository,
                               OrganizationRepository organizationRepository,
                               ApplicationEventPublisher applicationEventPublisher) {
        this.queueRepository = queueRepository;
        this.tokenRepository = tokenRepository;
        this.organizationRepository = organizationRepository;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    /**
     * Evaluates capacity warning for a specific queue.
     * Should be called after operations that change queue load.
     */
    @Transactional
    public void evaluateCapacityWarning(UUID queueId) {
        queueRepository.findById(queueId).ifPresent(this::evaluateCapacityWarningForQueue);
    }

    private void evaluateCapacityWarningForQueue(Queue queue) {
        if (queue.getStatus() == QueueStatus.CLOSED) {
            clearCapacityWarning(queue);
            return;
        }

        Organization org = organizationRepository.findById(queue.getOrgId()).orElse(null);
        if (org == null || org.getStatus() != com.align.qms.organization.OrganizationStatus.ACTIVE) {
            clearCapacityWarning(queue);
            return;
        }

        EnumSet<TokenState> activeStates = EnumSet.of(
            TokenState.WAITING, TokenState.AWAY, TokenState.CALLED, TokenState.IN_SERVICE
        );
        long activeCount = tokenRepository.countByQueueIdAndStateIn(queue.getId(), activeStates);

        int thresholdPercent = org.getCapacityThresholdPercent();
        double currentPercent = queue.getMaxCapacity() > 0
                ? ((double) activeCount / queue.getMaxCapacity()) * 100.0
                : 0.0;

        if (currentPercent >= thresholdPercent) {
            triggerCapacityWarning(queue, currentPercent, thresholdPercent);
        } else {
            clearCapacityWarning(queue, currentPercent, thresholdPercent);
        }
    }

    private void triggerCapacityWarning(Queue queue, double currentValue, int thresholdValue) {
        int rowsAffected = queueRepository.setCapacityWarningActive(queue.getId(), true, false);
        if (rowsAffected == 1) {
            log.info("Queue Capacity Warning TRIGGERED for queueId={}", queue.getId());
            publishEvent(queue, QueueWarningType.QUEUE_CAPACITY_WARNING, QueueWarningTransition.TRIGGERED, currentValue, thresholdValue);
        }
    }

    private void clearCapacityWarning(Queue queue, double currentValue, int thresholdValue) {
        int rowsAffected = queueRepository.setCapacityWarningActive(queue.getId(), false, true);
        if (rowsAffected == 1) {
            log.info("Queue Capacity Warning CLEARED for queueId={}", queue.getId());
            publishEvent(queue, QueueWarningType.QUEUE_CAPACITY_WARNING, QueueWarningTransition.CLEARED, currentValue, thresholdValue);
        }
    }

    private void clearCapacityWarning(Queue queue) {
        clearCapacityWarning(queue, 0.0, 0);
    }

    /**
     * Scheduler to evaluate wait time warnings for all queues every minute.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void evaluateWaitTimeWarnings() {
        // Query all active queues
        List<Queue> queues = queueRepository.findAll();
        for (Queue queue : queues) {
            if (queue.getStatus() != QueueStatus.ACTIVE) {
                clearWaitWarning(queue);
                continue;
            }
            evaluateWaitTimeForQueue(queue);
        }
    }

    private void triggerWaitWarning(Queue queue, long currentValue, int thresholdValue) {
        int rowsAffected = queueRepository.setWaitWarningActive(queue.getId(), true, false);
        if (rowsAffected == 1) {
            log.info("Queue Wait Warning TRIGGERED for queueId={}", queue.getId());
            publishEvent(queue, QueueWarningType.QUEUE_WAIT_WARNING, QueueWarningTransition.TRIGGERED, currentValue, thresholdValue);
        }
    }

    private void clearWaitWarning(Queue queue, long currentValue, int thresholdValue) {
        int rowsAffected = queueRepository.setWaitWarningActive(queue.getId(), false, true);
        if (rowsAffected == 1) {
            log.info("Queue Wait Warning CLEARED for queueId={}", queue.getId());
            publishEvent(queue, QueueWarningType.QUEUE_WAIT_WARNING, QueueWarningTransition.CLEARED, currentValue, thresholdValue);
        }
    }

    private void clearWaitWarning(Queue queue) {
        clearWaitWarning(queue, 0, 0);
    }

    private void publishEvent(Queue queue, QueueWarningType type, QueueWarningTransition transition, Number currentValue, Number thresholdValue) {
        QueueWarningPayload payload = new QueueWarningPayload(
                queue.getId(),
                queue.getOrgId(),
                queue.getLocationId(),
                type,
                transition,
                currentValue,
                thresholdValue
        );
        applicationEventPublisher.publishEvent(new QueueWarningEvent(this, payload));
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handleTokenRealtimeEvent(com.align.qms.token.event.TokenRealtimeEvent event) {
        evaluateCapacityWarning(event.getPayload().getQueueId());
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handleOrganizationRulesUpdated(com.align.qms.organization.event.OrganizationRulesUpdatedEvent event) {
        List<Queue> queues = queueRepository.findByOrgId(event.getOrgId());
        for (Queue queue : queues) {
            evaluateCapacityWarningForQueue(queue);
            // We also re-evaluate wait times in case maxWaitThresholdMins was changed or disabled (set to 0)
            if (queue.getStatus() == QueueStatus.ACTIVE) {
                evaluateWaitTimeForQueue(queue);
            }
        }
    }

    private void evaluateWaitTimeForQueue(Queue queue) {
        Organization org = organizationRepository.findById(queue.getOrgId()).orElse(null);
        if (org == null || org.getStatus() != com.align.qms.organization.OrganizationStatus.ACTIVE) {
            clearWaitWarning(queue);
            return;
        }

        int waitThresholdMins = org.getMaxWaitThresholdMins();
        if (waitThresholdMins <= 0) {
            clearWaitWarning(queue);
            return;
        }

        Instant oldestJoinedAt = tokenRepository.findOldestTokenJoinedAtByQueueIdAndState(queue.getId(), TokenState.WAITING).orElse(null);
        if (oldestJoinedAt == null) {
            clearWaitWarning(queue);
            return;
        }

        long waitDurationMins = ChronoUnit.MINUTES.between(oldestJoinedAt, Instant.now());
        if (waitDurationMins >= waitThresholdMins) {
            triggerWaitWarning(queue, waitDurationMins, waitThresholdMins);
        } else {
            clearWaitWarning(queue, waitDurationMins, waitThresholdMins);
        }
    }
}
