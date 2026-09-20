package com.align.qms.queue;

import com.align.qms.queue.dto.CreateQueueRequest;
import com.align.qms.queue.dto.QueueResponse;
import com.align.qms.queue.dto.UpdateQueueConfigRequest;
import com.align.qms.queue.dto.UpdateQueueStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for Queue management.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET (single): ORG_ADMIN (own org) or PLATFORM_ADMIN.</li>
 *   <li>POST (create): ORG_ADMIN or PLATFORM_ADMIN.</li>
 *   <li>PUT status: ORG_ADMIN, PLATFORM_ADMIN, or STAFF.</li>
 *   <li>PUT config: ORG_ADMIN or PLATFORM_ADMIN.</li>
 * </ul>
 *
 * <p>Tenant isolation enforced in QueueService via TenantContext.
 *
 * <p>Path: {@code /api/v1/queues}
 */
@RestController
@RequestMapping("/api/v1/queues")
public class QueueController {

    private final QueueService queueService;

    public QueueController(QueueService queueService) {
        this.queueService = queueService;
    }

    // ── GET /api/v1/queues/{queueId} ─────────────────────────────────────────

    /**
     * Get a single queue by ID.
     * ORG_ADMIN (own org) or PLATFORM_ADMIN.
     * Tenant isolation enforced in service.
     */
    @GetMapping("/{queueId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<QueueResponse> getById(@PathVariable UUID queueId) {
        return ResponseEntity.ok(queueService.getById(queueId));
    }

    // ── GET /api/v1/queues?locationId={locationId} ─────────────────────────────

    /**
     * Get all queues for a location.
     * ORG_ADMIN (own org), PLATFORM_ADMIN, or STAFF.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN', 'STAFF')")
    public ResponseEntity<java.util.List<QueueResponse>> listByLocation(
            @org.springframework.web.bind.annotation.RequestParam UUID locationId) {
        return ResponseEntity.ok(queueService.listByLocation(locationId));
    }

    // ── POST /api/v1/queues ───────────────────────────────────────────────────

    /**
     * Create a queue for a service.
     * ORG_ADMIN or PLATFORM_ADMIN — one queue per service enforced in service layer.
     * Returns 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<QueueResponse> create(
            @Valid @RequestBody CreateQueueRequest request) {
        QueueResponse response = queueService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── PUT /api/v1/queues/{queueId}/status ──────────────────────────────────

    /**
     * Update queue status (ACTIVE / PAUSED / CLOSED).
     * ORG_ADMIN, PLATFORM_ADMIN, or STAFF (same org).
     */
    @PutMapping("/{queueId}/status")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN', 'STAFF')")
    public ResponseEntity<QueueResponse> updateStatus(
            @PathVariable UUID queueId,
            @Valid @RequestBody UpdateQueueStatusRequest request) {
        return ResponseEntity.ok(queueService.updateStatus(queueId, request));
    }

    // ── PUT /api/v1/queues/{queueId}/config ──────────────────────────────────

    /**
     * Update queue configuration (maxCapacity, autoPauseAtCapacity, tokenPrefix).
     * ORG_ADMIN or PLATFORM_ADMIN.
     */
    @PutMapping("/{queueId}/config")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<QueueResponse> updateConfig(
            @PathVariable UUID queueId,
            @Valid @RequestBody UpdateQueueConfigRequest request) {
        return ResponseEntity.ok(queueService.updateConfig(queueId, request));
    }
}
