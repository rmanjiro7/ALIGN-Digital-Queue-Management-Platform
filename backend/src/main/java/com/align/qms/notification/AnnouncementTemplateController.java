package com.align.qms.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Announcement Templates", description = "Manage reusable announcement templates")
@RestController
@RequestMapping("/api/v1/announcement-templates")
public class AnnouncementTemplateController {

    @Autowired
    private AnnouncementTemplateService service;
    @Autowired
    private AnnouncementTemplateRepository repository;

    @Operation(summary = "Get all announcement templates")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public List<AnnouncementTemplate> getAllTemplates() {
        return repository.findAll();
    }

    @Operation(summary = "Create an announcement template")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public AnnouncementTemplate createTemplate(@RequestBody AnnouncementTemplate req) {
        return service.createTemplate(req);
    }

    @Operation(summary = "Update an announcement template")
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public AnnouncementTemplate updateTemplate(@PathVariable UUID id, @RequestBody AnnouncementTemplate req) {
        return service.updateTemplate(id, req);
    }

    @Operation(summary = "Delete an announcement template")
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public void deleteTemplate(@PathVariable UUID id) {
        service.deleteTemplate(id);
    }
}
