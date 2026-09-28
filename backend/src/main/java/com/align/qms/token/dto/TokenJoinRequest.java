package com.align.qms.token.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class TokenJoinRequest {

    @NotNull(message = "Service ID is required")
    private UUID serviceId;

    private String customerName;
    private String customerPhone;
    private Boolean smsConsent = false;
    private String idempotencyKey;

    public TokenJoinRequest() {
    }

    public UUID getServiceId() {
        return serviceId;
    }

    public void setServiceId(UUID serviceId) {
        this.serviceId = serviceId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public Boolean getSmsConsent() {
        return smsConsent;
    }

    public void setSmsConsent(Boolean smsConsent) {
        this.smsConsent = smsConsent;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
