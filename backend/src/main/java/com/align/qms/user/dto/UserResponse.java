package com.align.qms.user.dto;

import com.align.qms.user.User;
import com.align.qms.user.UserRole;
import com.align.qms.user.UserStatus;

import java.time.Instant;
import java.util.UUID;

public class UserResponse {

    private UUID id;
    private UUID orgId;
    private String email;
    private String name;
    private UserRole role;
    private UserStatus status;
    private UUID locationId;
    private Integer assignedCounterNumber;
    private Instant createdAt;
    private Instant updatedAt;

    public static UserResponse from(User user) {
        UserResponse r = new UserResponse();
        r.id = user.getId();
        r.orgId = user.getOrgId();
        r.email = user.getEmail();
        r.name = user.getName();
        r.role = user.getRole();
        r.status = user.getStatus();
        r.locationId = user.getLocationId();
        r.assignedCounterNumber = user.getAssignedCounterNumber();
        r.createdAt = user.getCreatedAt();
        r.updatedAt = user.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getOrgId() { return orgId; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public UserRole getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public UUID getLocationId() { return locationId; }
    public Integer getAssignedCounterNumber() { return assignedCounterNumber; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
