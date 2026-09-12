package com.align.qms.counter.dto;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Counter resources.
 * current_serving_token_id is excluded — it is always null in Phase 2.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CounterResponse {

    private UUID                id;
    private UUID                orgId;
    private UUID                locationId;
    private int                 number;
    private String              name;
    private CounterStatus       status;
    private CounterAvailability availability;
    private UUID                assignedStaffId;
    private Instant             createdAt;
    private Instant             updatedAt;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static CounterResponse from(Counter counter) {
        CounterResponse r = new CounterResponse();
        r.id              = counter.getId();
        r.orgId           = counter.getOrgId();
        r.locationId      = counter.getLocationId();
        r.number          = counter.getNumber();
        r.name            = counter.getName();
        r.status          = counter.getStatus();
        r.availability    = counter.getAvailability();
        r.assignedStaffId = counter.getAssignedStaffId();
        r.createdAt       = counter.getCreatedAt();
        r.updatedAt       = counter.getUpdatedAt();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public UUID                getId()              { return id; }
    public UUID                getOrgId()           { return orgId; }
    public UUID                getLocationId()      { return locationId; }
    public int                 getNumber()          { return number; }
    public String              getName()            { return name; }
    public CounterStatus       getStatus()          { return status; }
    public CounterAvailability getAvailability()    { return availability; }
    public UUID                getAssignedStaffId() { return assignedStaffId; }
    public Instant             getCreatedAt()       { return createdAt; }
    public Instant             getUpdatedAt()       { return updatedAt; }
}
