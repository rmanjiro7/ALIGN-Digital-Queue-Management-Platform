package com.align.qms.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/announcement-templates")
public class AnnouncementTemplateController {

    @Autowired
    private AnnouncementTemplateService service;
    @Autowired
    private AnnouncementTemplateRepository repository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public List<AnnouncementTemplate> getAllTemplates() {
        return repository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public AnnouncementTemplate createTemplate(@RequestBody AnnouncementTemplate req) {
        return service.createTemplate(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public AnnouncementTemplate updateTemplate(@PathVariable UUID id, @RequestBody AnnouncementTemplate req) {
        return service.updateTemplate(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public void deleteTemplate(@PathVariable UUID id) {
        service.deleteTemplate(id);
    }
}
