package com.align.qms.notification;

import com.align.qms.notification.dto.AnnouncementRequest;
import com.align.qms.notification.dto.AnnouncementResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Announcements", description = "Public announcements creation")
@RestController
@RequestMapping("/api/v1/staff/announcements")
@PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @Operation(summary = "Create an announcement")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping
    public ResponseEntity<AnnouncementResponse> createAnnouncement(@Valid @RequestBody AnnouncementRequest request) {
        AnnouncementResponse response = announcementService.createAnnouncement(request);
        return ResponseEntity.ok(response);
    }
}
