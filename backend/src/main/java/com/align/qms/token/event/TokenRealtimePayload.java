package com.align.qms.token.event;

import com.align.qms.token.Token;
import com.align.qms.token.TokenEvent;
import com.align.qms.token.TokenEventType;
import com.align.qms.token.TokenState;

import java.time.Instant;
import java.util.UUID;

public class TokenRealtimePayload {
    private final UUID eventId;
    private final TokenEventType eventType;
    private final UUID orgId;
    private final UUID locationId;
    private final UUID queueId;
    private final UUID tokenId;
    private final String tokenNumber;
    private final UUID counterId;
    private final Integer counterNumber;
    private final TokenState toState;
    private final Instant timestamp;
    private final String customerPhone;
    private final Boolean smsConsent;
    private final UUID transferredToTokenId;

    public TokenRealtimePayload(TokenEvent event, Token token, Integer counterNumber) {
        this.eventId = event.getId();
        this.customerPhone = token.getCustomerPhone();
        this.smsConsent = token.getSmsConsent();
        this.eventType = event.getEventType();
        this.orgId = token.getOrgId();
        this.locationId = token.getLocationId();
        this.queueId = token.getQueueId();
        this.tokenId = token.getId();
        this.tokenNumber = token.getTokenNumber();
        this.counterId = token.getCounterId();
        this.counterNumber = counterNumber;
        this.toState = token.getState();
        this.timestamp = Instant.now();
        this.transferredToTokenId = token.getTransferredToTokenId();
    }

    private TokenRealtimePayload(TokenRealtimePayload source, boolean maskPhone) {
        this.eventId = source.eventId;
        this.eventType = source.eventType;
        this.orgId = source.orgId;
        this.locationId = source.locationId;
        this.queueId = source.queueId;
        this.tokenId = source.tokenId;
        this.tokenNumber = source.tokenNumber;
        this.counterId = source.counterId;
        this.counterNumber = source.counterNumber;
        this.toState = source.toState;
        this.timestamp = source.timestamp;
        this.customerPhone = maskPhone ? null : source.customerPhone;
        this.smsConsent = maskPhone ? null : source.smsConsent;
        this.transferredToTokenId = source.transferredToTokenId;
    }

    public TokenRealtimePayload maskedForPublic() {
        return new TokenRealtimePayload(this, true);
    }


    public UUID getEventId() { return eventId; }
    public TokenEventType getEventType() { return eventType; }
    public UUID getOrgId() { return orgId; }
    public UUID getLocationId() { return locationId; }
    public UUID getQueueId() { return queueId; }
    public UUID getTokenId() { return tokenId; }
    public String getTokenNumber() { return tokenNumber; }
    public UUID getCounterId() { return counterId; }
    public Integer getCounterNumber() { return counterNumber; }
    public TokenState getToState() { return toState; }
    public String getCustomerPhone() { return customerPhone; }
    public Boolean getSmsConsent() { return smsConsent; }
    public Instant getTimestamp() { return timestamp; }
    public UUID getTransferredToTokenId() { return transferredToTokenId; }
}
