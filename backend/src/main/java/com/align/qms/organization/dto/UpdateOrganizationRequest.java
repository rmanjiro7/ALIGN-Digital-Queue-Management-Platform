package com.align.qms.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Request body for PUT /api/v1/tenants/{orgId} (PLATFORM_ADMIN only).
 * All fields are optional — only non-null values are applied.
 */
public class UpdateOrganizationRequest {

    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 100, message = "Sector must not exceed 100 characters")
    private String sector;

    @Email(message = "Contact email must be a valid email address")
    @Size(max = 255, message = "Contact email must not exceed 255 characters")
    private String contactEmail;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getName()         { return name; }
    public String getSector()       { return sector; }
    public String getContactEmail() { return contactEmail; }

    public void setName(String name)          { this.name = name; }
    public void setSector(String sector)      { this.sector = sector; }
    public void setContactEmail(String email) { this.contactEmail = email; }
}
