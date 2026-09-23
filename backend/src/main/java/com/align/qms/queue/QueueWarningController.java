package com.align.qms.queue;

import com.align.qms.queue.dto.QueueWarningDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/locations")
public class QueueWarningController {

    private final QueueService queueService;

    public QueueWarningController(QueueService queueService) {
        this.queueService = queueService;
    }

    @GetMapping("/{locationId}/queue-warnings")
    @PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<List<QueueWarningDto>> getQueueWarnings(@PathVariable UUID locationId) {
        return ResponseEntity.ok(queueService.getQueueWarningsByLocation(locationId));
    }
}
