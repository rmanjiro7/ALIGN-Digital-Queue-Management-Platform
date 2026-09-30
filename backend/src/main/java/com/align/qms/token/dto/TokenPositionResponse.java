package com.align.qms.token.dto;

import com.align.qms.token.TokenState;

public class TokenPositionResponse {
    private String tokenNumber;
    private TokenState state;
    private long position;
    private int estimatedWaitTimeMinutes;
    
    private Integer estRangeMin;
    private Integer estRangeMax;
    private String estRangeText;
    private String confidence;

    public TokenPositionResponse() {}

    public TokenPositionResponse(String tokenNumber, TokenState state, long position, int estimatedWaitTimeMinutes) {
        this.tokenNumber = tokenNumber;
        this.state = state;
        this.position = position;
        this.estimatedWaitTimeMinutes = estimatedWaitTimeMinutes;
    }

    public TokenPositionResponse(String tokenNumber, TokenState state, long position, int estimatedWaitTimeMinutes, Integer estRangeMin, Integer estRangeMax, String estRangeText, String confidence) {
        this.tokenNumber = tokenNumber;
        this.state = state;
        this.position = position;
        this.estimatedWaitTimeMinutes = estimatedWaitTimeMinutes;
        this.estRangeMin = estRangeMin;
        this.estRangeMax = estRangeMax;
        this.estRangeText = estRangeText;
        this.confidence = confidence;
    }

    public String getTokenNumber() {
        return tokenNumber;
    }

    public void setTokenNumber(String tokenNumber) {
        this.tokenNumber = tokenNumber;
    }

    public TokenState getState() {
        return state;
    }

    public void setState(TokenState state) {
        this.state = state;
    }

    public long getPosition() {
        return position;
    }

    public void setPosition(long position) {
        this.position = position;
    }

    public int getEstimatedWaitTimeMinutes() {
        return estimatedWaitTimeMinutes;
    }

    public void setEstimatedWaitTimeMinutes(int estimatedWaitTimeMinutes) {
        this.estimatedWaitTimeMinutes = estimatedWaitTimeMinutes;
    }

    public Integer getEstRangeMin() { return estRangeMin; }
    public void setEstRangeMin(Integer estRangeMin) { this.estRangeMin = estRangeMin; }

    public Integer getEstRangeMax() { return estRangeMax; }
    public void setEstRangeMax(Integer estRangeMax) { this.estRangeMax = estRangeMax; }

    public String getEstRangeText() { return estRangeText; }
    public void setEstRangeText(String estRangeText) { this.estRangeText = estRangeText; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }
}
