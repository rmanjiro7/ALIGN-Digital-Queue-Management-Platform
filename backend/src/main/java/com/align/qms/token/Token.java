package com.align.qms.token;

import com.align.qms.exception.InvalidTokenStateException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tokens")
public class Token {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "location_id", nullable = false)
    private UUID locationId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "queue_id", nullable = false)
    private UUID queueId;

    @Column(name = "token_number", nullable = false, length = 20)
    private String tokenNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 20)
    private TokenState state;

    @Column(name = "counter_id")
    private UUID counterId;

    @Column(name = "called_by_staff_id")
    private UUID calledByStaffId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @Column(name = "called_at")
    private Instant calledAt;

    @Column(name = "served_at")
    private Instant servedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "step_away_expires_at")
    private Instant stepAwayExpiresAt;

    @Column(name = "idempotency_key", length = 100, unique = true)
    private String idempotencyKey;

    @Column(name = "sms_consent", nullable = false)
    private Boolean smsConsent = false;

    @Column(name = "sms_consent_timestamp")
    private Instant smsConsentTimestamp;


    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "transferred_to_token_id")
    private UUID transferredToTokenId;

    @Column(name = "priority_timestamp")
    private Instant priorityTimestamp;

    public Token() {
    }

    public Token(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, String tokenNumber, String customerName, String customerPhone, String idempotencyKey, Boolean smsConsent) {
        this.orgId = orgId;
        this.locationId = locationId;
        this.serviceId = serviceId;
        this.queueId = queueId;
        this.tokenNumber = tokenNumber;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.idempotencyKey = idempotencyKey;
        this.state = TokenState.WAITING;
        this.joinedAt = Instant.now();
        this.setSmsConsent(smsConsent != null ? smsConsent : false);
    }


    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        if (this.joinedAt == null) {
            this.joinedAt = this.createdAt;
        }
        if (this.priorityTimestamp == null) {
            this.priorityTimestamp = this.joinedAt;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void transitionTo(TokenState targetState) {
        if (!this.state.canTransitionTo(targetState)) {
            throw new InvalidTokenStateException("Cannot transition from " + this.state + " to " + targetState);
        }
        this.state = targetState;
    }

    // Getters and Setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrgId() { return orgId; }

    public UUID getLocationId() { return locationId; }

    public UUID getServiceId() { return serviceId; }

    public UUID getQueueId() { return queueId; }

    public String getTokenNumber() { return tokenNumber; }

    public TokenState getState() { return state; }
    // Intentionally no public setState method to force use of transitionTo

    public UUID getCounterId() { return counterId; }
    public void setCounterId(UUID counterId) { this.counterId = counterId; }

    public UUID getCalledByStaffId() { return calledByStaffId; }
    public void setCalledByStaffId(UUID calledByStaffId) { this.calledByStaffId = calledByStaffId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public Instant getJoinedAt() { return joinedAt; }

    public Instant getCalledAt() { return calledAt; }
    public void setCalledAt(Instant calledAt) { this.calledAt = calledAt; }

    public Instant getServedAt() { return servedAt; }
    public void setServedAt(Instant servedAt) { this.servedAt = servedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Instant getStepAwayExpiresAt() { return stepAwayExpiresAt; }
    public void setStepAwayExpiresAt(Instant stepAwayExpiresAt) { this.stepAwayExpiresAt = stepAwayExpiresAt; }

    public String getIdempotencyKey() { return idempotencyKey; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public Boolean getSmsConsent() { return smsConsent; }
    public void setSmsConsent(Boolean smsConsent) {
        this.smsConsent = smsConsent != null ? smsConsent : false;
        if (this.smsConsent) {
            if (this.smsConsentTimestamp == null) {
                this.smsConsentTimestamp = Instant.now();
            }
        } else {
            this.smsConsentTimestamp = null;
        }
    }

    public Instant getSmsConsentTimestamp() { return smsConsentTimestamp; }


    public UUID getTransferredToTokenId() { return transferredToTokenId; }
    public void setTransferredToTokenId(UUID transferredToTokenId) { this.transferredToTokenId = transferredToTokenId; }

    public Instant getPriorityTimestamp() { return priorityTimestamp; }
    public void setPriorityTimestamp(Instant priorityTimestamp) { this.priorityTimestamp = priorityTimestamp; }
}
