package com.align.qms.queue;

import com.align.qms.exception.DuplicateQueueException;
import com.align.qms.exception.QueueNotFoundException;
import com.align.qms.exception.ServiceNotFoundException;
import com.align.qms.queue.dto.CreateQueueRequest;
import com.align.qms.queue.dto.QueueResponse;
import com.align.qms.queue.dto.QueueWarningDto;
import com.align.qms.queue.dto.UpdateQueueConfigRequest;
import com.align.qms.queue.dto.UpdateQueueStatusRequest;
import com.align.qms.security.TenantContext;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for Queue management.
 *
 * <p>Business rules enforced here:
 * <ul>
 *   <li>One queue per service (UNIQUE constraint on service_id — caught via
 *       DataIntegrityViolationException and converted to DuplicateQueueException).</li>
 *   <li>Queue must belong to the caller's organization (tenant isolation).</li>
 *   <li>Parent service must exist and belong to the caller's organization.</li>
 * </ul>
 *
 * <p>Phase 3 note: {@code nextTokenNumber} on the Queue entity is present in
 * the schema but is NOT incremented here. Atomic counter increment via raw SQL
 * is a Phase 3 concern.
 */
@Service
public class QueueService {

    private static final Logger log = LoggerFactory.getLogger(QueueService.class);

    private final QueueRepository   queueRepository;
    private final ServiceRepository serviceRepository;
    private final com.align.qms.audit.AdminAuditService adminAuditService;

    public QueueService(QueueRepository queueRepository,
                        ServiceRepository serviceRepository,
                        com.align.qms.audit.AdminAuditService adminAuditService) {
        this.queueRepository   = queueRepository;
        this.serviceRepository = serviceRepository;
        this.adminAuditService = adminAuditService;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /**
     * List all queues at a given location.
     * Tenant isolation: every returned queue must belong to the caller's org.
     */
    @Transactional(readOnly = true)
    public List<QueueResponse> listByLocation(UUID locationId) {
        UUID currentOrgId = TenantContext.getCurrentOrgId();

        // PLATFORM_ADMIN can list any location's queues (orgId may be null)
        if (TenantContext.isPlatformAdmin()) {
            return queueRepository.findByLocationIdOrderByNameAsc(locationId)
                .stream()
                .map(QueueResponse::from)
                .collect(Collectors.toList());
        }

        // Non-platform-admin: return only queues owned by caller's org
        return queueRepository.findByLocationIdOrderByNameAsc(locationId)
            .stream()
            .filter(q -> q.getOrgId().equals(currentOrgId))
            .map(QueueResponse::from)
            .collect(Collectors.toList());
    }

    /**
     * Retrieve queue warnings for a specific location.
     * Preserves tenant isolation logic.
     */
    @Transactional(readOnly = true)
    public List<QueueWarningDto> getQueueWarningsByLocation(UUID locationId) {
        UUID currentOrgId = TenantContext.getCurrentOrgId();

        if (TenantContext.isPlatformAdmin()) {
            return queueRepository.findByLocationIdOrderByNameAsc(locationId)
                .stream()
                .map(q -> new QueueWarningDto(
                    q.getId(),
                    q.getServiceId(),
                    q.isCapacityWarningActive(),
                    q.isWaitWarningActive()
                ))
                .collect(Collectors.toList());
        }

        return queueRepository.findByLocationIdOrderByNameAsc(locationId)
            .stream()
            .filter(q -> q.getOrgId().equals(currentOrgId))
            .map(q -> new QueueWarningDto(
                q.getId(),
                q.getServiceId(),
                q.isCapacityWarningActive(),
                q.isWaitWarningActive()
            ))
            .collect(Collectors.toList());
    }

    // ── Get by id ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public QueueResponse getById(UUID queueId) {
        Queue queue = queueRepository.findById(queueId)
            .orElseThrow(() -> new QueueNotFoundException(queueId));

        TenantContext.requireSameTenant(queue.getOrgId());
        return QueueResponse.from(queue);
    }

    // ── Get by service id ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public QueueResponse getByServiceId(UUID serviceId) {
        Queue queue = queueRepository.findByServiceId(serviceId)
            .orElseThrow(() -> new QueueNotFoundException(serviceId));

        TenantContext.requireSameTenant(queue.getOrgId());
        return QueueResponse.from(queue);
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Transactional
    public QueueResponse create(CreateQueueRequest request) {
        UUID serviceId = request.getServiceId();

        // Validate parent service exists and caller owns it
        ServiceEntity service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        TenantContext.requireSameTenant(service.getOrgId());

        // Check for duplicate queue before hitting the DB constraint (better error message)
        if (queueRepository.existsByServiceId(serviceId)) {
            throw new DuplicateQueueException(serviceId);
        }

        String prefix = (request.getTokenPrefix() != null && !request.getTokenPrefix().isBlank())
            ? request.getTokenPrefix().trim().toUpperCase()
            : "A";

        int capacity = (request.getMaxCapacity() != null && request.getMaxCapacity() > 0)
            ? request.getMaxCapacity()
            : 100;

        Queue queue = new Queue(
            service.getOrgId(),
            service.getLocationId(),
            serviceId,
            request.getName().trim(),
            prefix,
            capacity
        );

        try {
            Queue saved = queueRepository.save(queue);
            QueueResponse response = QueueResponse.from(saved);
            adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "QUEUE", "CREATE", null, response);
            log.info("Queue created: id={} serviceId={} orgId={}",
                saved.getId(), serviceId, saved.getOrgId());
            return response;
        } catch (DataIntegrityViolationException ex) {
            // Race condition: two concurrent requests for the same service_id
            throw new DuplicateQueueException(serviceId);
        }
    }

    // ── Update status ────────────────────────────────────────────────────────

    /**
     * Update queue status (ACTIVE / PAUSED / CLOSED).
     * Allowed for ORG_ADMIN and STAFF within the same tenant.
     */
    @Transactional
    public QueueResponse updateStatus(UUID queueId, UpdateQueueStatusRequest request) {
        Queue queue = queueRepository.findById(queueId)
            .orElseThrow(() -> new QueueNotFoundException(queueId));

        TenantContext.requireSameTenant(queue.getOrgId());

        QueueResponse beforeState = QueueResponse.from(queue);

        if (queue.getStatus() == request.getStatus()) {
            return beforeState;
        }

        queue.setStatus(request.getStatus());
        Queue saved = queueRepository.save(queue);
        QueueResponse afterState = QueueResponse.from(saved);
        adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "QUEUE", "UPDATE_STATUS", beforeState, afterState);
        log.info("Queue status updated: id={} status={}", saved.getId(), saved.getStatus());
        return afterState;
    }

    // ── Update config ────────────────────────────────────────────────────────

    /**
     * Update queue configuration (maxCapacity, autoPauseAtCapacity, tokenPrefix).
     * ORG_ADMIN only — controller enforces via @PreAuthorize.
     */
    @Transactional
    public QueueResponse updateConfig(UUID queueId, UpdateQueueConfigRequest request) {
        Queue queue = queueRepository.findById(queueId)
            .orElseThrow(() -> new QueueNotFoundException(queueId));

        TenantContext.requireSameTenant(queue.getOrgId());

        QueueResponse beforeState = QueueResponse.from(queue);

        boolean changed = false;

        if (request.getMaxCapacity() != null && !request.getMaxCapacity().equals(queue.getMaxCapacity())) {
            queue.setMaxCapacity(request.getMaxCapacity());
            changed = true;
        }
        if (request.getAutoPauseAtCapacity() != null && !request.getAutoPauseAtCapacity().equals(queue.isAutoPauseAtCapacity())) {
            queue.setAutoPauseAtCapacity(request.getAutoPauseAtCapacity());
            changed = true;
        }
        if (request.getTokenPrefix() != null && !request.getTokenPrefix().isBlank() && !request.getTokenPrefix().trim().toUpperCase().equals(queue.getTokenPrefix())) {
            queue.setTokenPrefix(request.getTokenPrefix().trim().toUpperCase());
            changed = true;
        }

        if (!changed) {
            return beforeState;
        }

        Queue saved = queueRepository.save(queue);
        QueueResponse afterState = QueueResponse.from(saved);
        adminAuditService.logEvent(saved.getOrgId(), saved.getId(), "QUEUE", "UPDATE_CONFIG", beforeState, afterState);
        log.info("Queue config updated: id={}", saved.getId());
        return afterState;
    }
}
