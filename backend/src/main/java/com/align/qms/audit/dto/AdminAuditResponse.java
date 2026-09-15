package com.align.qms.audit.dto;

import com.align.qms.audit.AdminAuditEvent;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminAuditResponse {

    private UUID id;
    private UUID orgId;
    private UUID actorId;
    private String actorRole;
    private String action;
    private String entityType;
    private UUID entityId;
    private JsonNode beforeState;
    private JsonNode afterState;
    private Instant createdAt;

    public static AdminAuditResponse from(AdminAuditEvent event) {
        AdminAuditResponse r = new AdminAuditResponse();
        r.id = event.getId();
        r.orgId = event.getOrgId();
        r.actorId = event.getActorId();
        r.actorRole = event.getActorRole();
        r.action = event.getAction();
        r.entityType = event.getEntityType();
        r.entityId = event.getEntityId();
        r.beforeState = event.getBeforeState();
        r.afterState = event.getAfterState();
        r.createdAt = event.getCreatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getOrgId() { return orgId; }
    public UUID getActorId() { return actorId; }
    public String getActorRole() { return actorRole; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public JsonNode getBeforeState() { return beforeState; }
    public JsonNode getAfterState() { return afterState; }
    public Instant getCreatedAt() { return createdAt; }
}
