package com.align.qms.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/services/{serviceId}/preparation-requirements")
public class PreparationRequirementController {

    @Autowired
    private PreparationRequirementService service;

    @GetMapping
    public List<PreparationRequirement> getRequirements(@PathVariable UUID serviceId) {
        return service.getActiveRequirementsForService(serviceId);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public List<PreparationRequirement> getAllRequirements(@PathVariable UUID serviceId) {
        return service.getRequirementsForService(serviceId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public PreparationRequirement createRequirement(@PathVariable UUID serviceId, @RequestBody PreparationRequirement req) {
        req.setServiceId(serviceId);
        return service.createRequirement(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public PreparationRequirement updateRequirement(@PathVariable UUID serviceId, @PathVariable UUID id, @RequestBody PreparationRequirement req) {
        return service.updateRequirement(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public void deleteRequirement(@PathVariable UUID serviceId, @PathVariable UUID id) {
        service.deleteRequirement(id);
    }
}
