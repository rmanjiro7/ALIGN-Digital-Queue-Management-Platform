package com.align.qms.service.dto;

import com.align.qms.service.ServiceEntity;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Service resources.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ServiceResponse {

    private UUID    id;
    private UUID    orgId;
    private UUID    locationId;
    private String  name;
    private String  description;
    private String  icon;
    private boolean enabled;
    private boolean isFastTrack;
    private String  preparationGuidance;
    private Instant createdAt;
    private Instant updatedAt;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static ServiceResponse from(ServiceEntity svc) {
        ServiceResponse r = new ServiceResponse();
        r.id                  = svc.getId();
        r.orgId               = svc.getOrgId();
        r.locationId          = svc.getLocationId();
        r.name                = svc.getName();
        r.description         = svc.getDescription();
        r.icon                = svc.getIcon();
        r.enabled             = svc.isEnabled();
        r.isFastTrack         = svc.isFastTrack();
        r.preparationGuidance = svc.getPreparationGuidance();
        r.createdAt           = svc.getCreatedAt();
        r.updatedAt           = svc.getUpdatedAt();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public UUID    getId()                  { return id; }
    public UUID    getOrgId()               { return orgId; }
    public UUID    getLocationId()          { return locationId; }
    public String  getName()                { return name; }
    public String  getDescription()         { return description; }
    public String  getIcon()                { return icon; }
    public boolean isEnabled()              { return enabled; }
    public boolean isFastTrack()            { return isFastTrack; }
    public String  getPreparationGuidance() { return preparationGuidance; }
    public Instant getCreatedAt()           { return createdAt; }
    public Instant getUpdatedAt()           { return updatedAt; }
}
