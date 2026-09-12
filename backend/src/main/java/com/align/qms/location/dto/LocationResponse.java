package com.align.qms.location.dto;

import com.align.qms.location.Location;
import com.align.qms.location.LocationStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Location resources.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LocationResponse {

    private UUID           id;
    private UUID           orgId;
    private String         name;
    private String         subtitle;
    private String         address;
    private String         city;
    private LocationStatus status;
    private String         operatingHours;
    private boolean        isHq;
    private Instant        createdAt;
    private Instant        updatedAt;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static LocationResponse from(Location location) {
        LocationResponse r = new LocationResponse();
        r.id             = location.getId();
        r.orgId          = location.getOrgId();
        r.name           = location.getName();
        r.subtitle       = location.getSubtitle();
        r.address        = location.getAddress();
        r.city           = location.getCity();
        r.status         = location.getStatus();
        r.operatingHours = location.getOperatingHours();
        r.isHq           = location.isHq();
        r.createdAt      = location.getCreatedAt();
        r.updatedAt      = location.getUpdatedAt();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public UUID           getId()             { return id; }
    public UUID           getOrgId()          { return orgId; }
    public String         getName()           { return name; }
    public String         getSubtitle()       { return subtitle; }
    public String         getAddress()        { return address; }
    public String         getCity()           { return city; }
    public LocationStatus getStatus()         { return status; }
    public String         getOperatingHours() { return operatingHours; }
    public boolean        isHq()              { return isHq; }
    public Instant        getCreatedAt()      { return createdAt; }
    public Instant        getUpdatedAt()      { return updatedAt; }
}
