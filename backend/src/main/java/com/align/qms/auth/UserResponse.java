package com.align.qms.auth;

import com.align.qms.user.User;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * User identity payload embedded in login responses and returned by GET /api/v1/auth/me.
 *
 * <p>Security: {@code passwordHash} is NEVER included. This DTO is the only
 * user representation that crosses the API boundary.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {

    private final UUID   id;
    private final String name;
    private final String email;
    private final String role;
    private final UUID   orgId;       // null for PLATFORM_ADMIN
    private final UUID   locationId;  // null when not assigned

    public UserResponse(User user) {
        this.id         = user.getId();
        this.name       = user.getName();
        this.email      = user.getEmail();
        this.role       = user.getRole().name();
        this.orgId      = user.getOrgId();
        this.locationId = user.getLocationId();
    }

    /**
     * No-arg constructor required by Jackson for deserialization
     * (e.g. TestRestTemplate reading LoginResponse in integration tests).
     * Not used on the server-serialization path.
     */
    protected UserResponse() {
        this.id = null; this.name = null; this.email = null;
        this.role = null; this.orgId = null; this.locationId = null;
    }

    public UUID   getId()         { return id; }
    public String getName()       { return name; }
    public String getEmail()      { return email; }
    public String getRole()       { return role; }
    public UUID   getOrgId()      { return orgId; }
    public UUID   getLocationId() { return locationId; }
}
