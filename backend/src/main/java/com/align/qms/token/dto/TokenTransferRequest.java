package com.align.qms.token.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class TokenTransferRequest {

    @NotNull(message = "targetServiceId is required")
    private UUID targetServiceId;

    private String idempotencyKey;

    public TokenTransferRequest() {
    }

    public TokenTransferRequest(UUID targetServiceId, String idempotencyKey) {
        this.targetServiceId = targetServiceId;
        this.idempotencyKey = idempotencyKey;
    }

    public UUID getTargetServiceId() {
        return targetServiceId;
    }

    public void setTargetServiceId(UUID targetServiceId) {
        this.targetServiceId = targetServiceId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
