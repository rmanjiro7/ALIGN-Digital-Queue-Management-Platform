package com.align.qms.notification.event;

import org.springframework.context.ApplicationEvent;
import java.util.UUID;

public class AnnouncementRealtimeEvent extends ApplicationEvent {
    
    private final UUID orgId;
    private final UUID locationId;
    private final String text;
    private final UUID tokenId;
    private final String tokenNumber;
    private final UUID counterId;
    private final Integer counterNumber;

    public AnnouncementRealtimeEvent(Object source, UUID orgId, UUID locationId, String text, 
                                     UUID tokenId, String tokenNumber, UUID counterId, Integer counterNumber) {
        super(source);
        this.orgId = orgId;
        this.locationId = locationId;
        this.text = text;
        this.tokenId = tokenId;
        this.tokenNumber = tokenNumber;
        this.counterId = counterId;
        this.counterNumber = counterNumber;
    }

    public UUID getOrgId() { return orgId; }
    public UUID getLocationId() { return locationId; }
    public String getText() { return text; }
    public UUID getTokenId() { return tokenId; }
    public String getTokenNumber() { return tokenNumber; }
    public UUID getCounterId() { return counterId; }
    public Integer getCounterNumber() { return counterNumber; }
}
