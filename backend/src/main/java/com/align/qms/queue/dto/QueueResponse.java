package com.align.qms.queue.dto;

import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Queue resources.
 * next_token_number is intentionally excluded (internal Phase 3 counter).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QueueResponse {

    private UUID        id;
    private UUID        orgId;
    private UUID        locationId;
    private UUID        serviceId;
    private String      name;
    private String      tokenPrefix;
    private QueueStatus status;
    private int         maxCapacity;
    private boolean     autoPauseAtCapacity;
    private Instant     createdAt;
    private Instant     updatedAt;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static QueueResponse from(Queue queue) {
        QueueResponse r = new QueueResponse();
        r.id                  = queue.getId();
        r.orgId               = queue.getOrgId();
        r.locationId          = queue.getLocationId();
        r.serviceId           = queue.getServiceId();
        r.name                = queue.getName();
        r.tokenPrefix         = queue.getTokenPrefix();
        r.status              = queue.getStatus();
        r.maxCapacity         = queue.getMaxCapacity();
        r.autoPauseAtCapacity = queue.isAutoPauseAtCapacity();
        r.createdAt           = queue.getCreatedAt();
        r.updatedAt           = queue.getUpdatedAt();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public UUID        getId()                  { return id; }
    public UUID        getOrgId()               { return orgId; }
    public UUID        getLocationId()          { return locationId; }
    public UUID        getServiceId()           { return serviceId; }
    public String      getName()                { return name; }
    public String      getTokenPrefix()         { return tokenPrefix; }
    public QueueStatus getStatus()              { return status; }
    public int         getMaxCapacity()         { return maxCapacity; }
    public boolean     isAutoPauseAtCapacity()  { return autoPauseAtCapacity; }
    public Instant     getCreatedAt()           { return createdAt; }
    public Instant     getUpdatedAt()           { return updatedAt; }
}
