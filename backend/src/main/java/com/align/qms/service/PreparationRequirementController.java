package com.align.qms.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Preparation Requirements", description = "Manage service preparation requirements")
@RestController
@RequestMapping("/api/v1/services/{serviceId}/preparation-requirements")
public class PreparationRequirementController {

    @Autowired
    private PreparationRequirementService service;

    @Operation(summary = "Get active preparation requirements")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping
    public List<PreparationRequirement> getRequirements(@PathVariable UUID serviceId) {
        return service.getActiveRequirementsForService(serviceId);
    }

    @Operation(summary = "Get all preparation requirements")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public List<PreparationRequirement> getAllRequirements(@PathVariable UUID serviceId) {
        return service.getRequirementsForService(serviceId);
    }

    @Operation(summary = "Create preparation requirement")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public PreparationRequirement createRequirement(@PathVariable UUID serviceId, @RequestBody PreparationRequirement req) {
        req.setServiceId(serviceId);
        return service.createRequirement(req);
    }

    @Operation(summary = "Update preparation requirement")
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public PreparationRequirement updateRequirement(@PathVariable UUID serviceId, @PathVariable UUID id, @RequestBody PreparationRequirement req) {
        return service.updateRequirement(id, req);
    }

    @Operation(summary = "Delete preparation requirement")
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public void deleteRequirement(@PathVariable UUID serviceId, @PathVariable UUID id) {
        service.deleteRequirement(id);
    }
}
