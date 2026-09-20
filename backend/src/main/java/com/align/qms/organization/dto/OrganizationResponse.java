package com.align.qms.organization.dto;

import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Organization (tenant) resources.
 * Never exposes internal persistence details.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrganizationResponse {

    private UUID               id;
    private String             code;
    private String             name;
    private String             sector;
    private OrganizationStatus status;
    private String             contactEmail;
    private Instant            joinedDate;
    private Instant            createdAt;
    private Instant            updatedAt;
    private Short              capacityThresholdPercent;
    private Integer            maxWaitThresholdMins;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static OrganizationResponse from(Organization org) {
        OrganizationResponse r = new OrganizationResponse();
        r.id           = org.getId();
        r.code         = org.getCode();
        r.name         = org.getName();
        r.sector       = org.getSector();
        r.status       = org.getStatus();
        r.contactEmail = org.getContactEmail();
        r.joinedDate   = org.getJoinedDate();
        r.createdAt    = org.getCreatedAt();
        r.updatedAt    = org.getUpdatedAt();
        r.capacityThresholdPercent = org.getCapacityThresholdPercent();
        r.maxWaitThresholdMins = org.getMaxWaitThresholdMins();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public UUID               getId()           { return id; }
    public String             getCode()         { return code; }
    public String             getName()         { return name; }
    public String             getSector()       { return sector; }
    public OrganizationStatus getStatus()       { return status; }
    public String             getContactEmail() { return contactEmail; }
    public Instant            getJoinedDate()   { return joinedDate; }
    public Instant            getCreatedAt()    { return createdAt; }
    public Instant            getUpdatedAt()    { return updatedAt; }
    public Short              getCapacityThresholdPercent() { return capacityThresholdPercent; }
    public Integer            getMaxWaitThresholdMins()     { return maxWaitThresholdMins; }
}
