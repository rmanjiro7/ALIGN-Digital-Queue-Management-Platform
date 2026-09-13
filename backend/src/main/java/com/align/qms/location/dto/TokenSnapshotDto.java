package com.align.qms.location.dto;

import com.align.qms.token.TokenState;
import java.time.Instant;
import java.util.UUID;

public class TokenSnapshotDto {
    private UUID id;
    private String tokenNumber;
    private TokenState state;
    private UUID serviceId;
    private UUID counterId;
    private Instant calledAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(String tokenNumber) { this.tokenNumber = tokenNumber; }

    public TokenState getState() { return state; }
    public void setState(TokenState state) { this.state = state; }

    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }

    public UUID getCounterId() { return counterId; }
    public void setCounterId(UUID counterId) { this.counterId = counterId; }

    public Instant getCalledAt() { return calledAt; }
    public void setCalledAt(Instant calledAt) { this.calledAt = calledAt; }
}
