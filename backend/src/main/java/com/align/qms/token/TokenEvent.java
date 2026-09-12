package com.align.qms.token;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "token_events")
public class TokenEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "token_id", nullable = false)
    private UUID tokenId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private TokenEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_state", length = 20)
    private TokenState fromState;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_state", length = 20)
    private TokenState toState;

    @Column(name = "counter_id")
    private UUID counterId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_name")
    private String actorName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public TokenEvent() {
    }

    public TokenEvent(UUID tokenId, TokenEventType eventType, TokenState fromState, TokenState toState, UUID counterId, UUID actorId, String actorName, Map<String, Object> metadata) {
        this.tokenId = tokenId;
        this.eventType = eventType;
        this.fromState = fromState;
        this.toState = toState;
        this.counterId = counterId;
        this.actorId = actorId;
        this.actorName = actorName;
        this.metadata = metadata;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTokenId() { return tokenId; }
    public void setTokenId(UUID tokenId) { this.tokenId = tokenId; }

    public TokenEventType getEventType() { return eventType; }
    public void setEventType(TokenEventType eventType) { this.eventType = eventType; }

    public TokenState getFromState() { return fromState; }
    public void setFromState(TokenState fromState) { this.fromState = fromState; }

    public TokenState getToState() { return toState; }
    public void setToState(TokenState toState) { this.toState = toState; }

    public UUID getCounterId() { return counterId; }
    public void setCounterId(UUID counterId) { this.counterId = counterId; }

    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
