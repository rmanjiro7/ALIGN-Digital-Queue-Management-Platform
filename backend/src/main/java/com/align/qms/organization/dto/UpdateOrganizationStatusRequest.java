package com.align.qms.organization.dto;

import com.align.qms.organization.OrganizationStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateOrganizationStatusRequest {

    @NotNull(message = "status is required")
    private OrganizationStatus status;

    public OrganizationStatus getStatus() { return status; }
    public void setStatus(OrganizationStatus status) { this.status = status; }
}
