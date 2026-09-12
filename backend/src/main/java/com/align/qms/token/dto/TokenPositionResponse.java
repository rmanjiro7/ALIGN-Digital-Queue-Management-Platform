package com.align.qms.token.dto;

import com.align.qms.token.TokenState;

public class TokenPositionResponse {
    private String tokenNumber;
    private TokenState state;
    private long position;
    private int estimatedWaitTimeMinutes;

    public TokenPositionResponse() {}

    public TokenPositionResponse(String tokenNumber, TokenState state, long position, int estimatedWaitTimeMinutes) {
        this.tokenNumber = tokenNumber;
        this.state = state;
        this.position = position;
        this.estimatedWaitTimeMinutes = estimatedWaitTimeMinutes;
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
}
