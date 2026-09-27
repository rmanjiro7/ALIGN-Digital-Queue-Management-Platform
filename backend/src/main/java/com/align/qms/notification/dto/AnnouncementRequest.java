package com.align.qms.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public class AnnouncementRequest {
    @NotNull
    private UUID locationId;

    @NotBlank
    @Size(max = 1000)
    private String text;

    private UUID tokenId;
    private String tokenNumber;
    private UUID counterId;
    private Integer counterNumber;

    // Getters and Setters

    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public UUID getTokenId() { return tokenId; }
    public void setTokenId(UUID tokenId) { this.tokenId = tokenId; }

    public String getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(String tokenNumber) { this.tokenNumber = tokenNumber; }

    public UUID getCounterId() { return counterId; }
    public void setCounterId(UUID counterId) { this.counterId = counterId; }

    public Integer getCounterNumber() { return counterNumber; }
    public void setCounterNumber(Integer counterNumber) { this.counterNumber = counterNumber; }
}
