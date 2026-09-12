package com.align.qms.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/v1/tenants (PLATFORM_ADMIN only).
 */
public class CreateOrganizationRequest {

    @NotBlank(message = "Organization name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @NotBlank(message = "Organization code is required")
    @Size(max = 20, message = "Code must not exceed 20 characters")
    private String code;

    @Size(max = 100, message = "Sector must not exceed 100 characters")
    private String sector;

    @Email(message = "Contact email must be a valid email address")
    @Size(max = 255, message = "Contact email must not exceed 255 characters")
    private String contactEmail;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getName()         { return name; }
    public String getCode()         { return code; }
    public String getSector()       { return sector; }
    public String getContactEmail() { return contactEmail; }

    public void setName(String name)               { this.name = name; }
    public void setCode(String code)               { this.code = code; }
    public void setSector(String sector)           { this.sector = sector; }
    public void setContactEmail(String email)      { this.contactEmail = email; }
}
