package com.align.qms.organization.event;

import org.springframework.context.ApplicationEvent;

import java.util.UUID;

public class OrganizationRulesUpdatedEvent extends ApplicationEvent {

    private final UUID orgId;

    public OrganizationRulesUpdatedEvent(Object source, UUID orgId) {
        super(source);
        this.orgId = orgId;
    }

    public UUID getOrgId() {
        return orgId;
    }
}
