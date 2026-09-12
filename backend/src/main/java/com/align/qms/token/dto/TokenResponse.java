package com.align.qms.token.dto;

import com.align.qms.token.Token;
import com.align.qms.token.TokenState;

import java.time.Instant;
import java.util.UUID;

public class TokenResponse {
    private UUID id;
    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;
    private UUID queueId;
    private String tokenNumber;
    private TokenState state;
    private String customerName;
    private String customerPhone;
    private Instant joinedAt;
    private Instant calledAt;
    private Instant stepAwayExpiresAt;
    private String idempotencyKey;

    public static TokenResponse from(Token token) {
        if (token == null) return null;
        
        TokenResponse response = new TokenResponse();
        response.setId(token.getId());
        response.setOrgId(token.getOrgId());
        response.setLocationId(token.getLocationId());
        response.setServiceId(token.getServiceId());
        response.setQueueId(token.getQueueId());
        response.setTokenNumber(token.getTokenNumber());
        response.setState(token.getState());
        response.setCustomerName(token.getCustomerName());
        response.setCustomerPhone(token.getCustomerPhone());
        response.setJoinedAt(token.getJoinedAt());
        response.setCalledAt(token.getCalledAt());
        response.setStepAwayExpiresAt(token.getStepAwayExpiresAt());
        response.setIdempotencyKey(token.getIdempotencyKey());
        
        return response;
    }

    // Getters and Setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }

    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }

    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }

    public UUID getQueueId() { return queueId; }
    public void setQueueId(UUID queueId) { this.queueId = queueId; }

    public String getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(String tokenNumber) { this.tokenNumber = tokenNumber; }

    public TokenState getState() { return state; }
    public void setState(TokenState state) { this.state = state; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public Instant getCalledAt() { return calledAt; }
    public void setCalledAt(Instant calledAt) { this.calledAt = calledAt; }

    public Instant getStepAwayExpiresAt() { return stepAwayExpiresAt; }
    public void setStepAwayExpiresAt(Instant stepAwayExpiresAt) { this.stepAwayExpiresAt = stepAwayExpiresAt; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
