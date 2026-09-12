package com.align.qms.auth;

import com.align.qms.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Server-side refresh token record (ADR-011).
 *
 * <p>Strategy: one-time-use with rotation and reuse detection.
 * <ul>
 *   <li>On login: a new plaintext token is generated (UUID v4), its SHA-256
 *       hex digest is stored here. Plaintext returned to client.</li>
 *   <li>On refresh: the client sends the plaintext token. SHA-256 is computed
 *       and looked up. The old row is deleted and a new token pair is issued
 *       (rotation). Reuse of a revoked token returns 401.</li>
 *   <li>On logout: the row is deleted (revocation).</li>
 *   <li>Expiry: {@code expires_at} checked on every refresh. Expired rows are
 *       cleaned up by a periodic job (safe to delete without notification).</li>
 * </ul>
 *
 * <p>Security note: the plaintext token is NEVER stored. Only the SHA-256 hex
 * digest (64 chars) is persisted. This limits blast radius if the
 * {@code refresh_tokens} table is compromised.
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * SHA-256 hex digest (64 chars) of the plaintext refresh token.
     * Never the plaintext value itself.
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected RefreshToken() {
        // JPA required
    }

    public RefreshToken(User user, String tokenHash, Instant expiresAt) {
        this.user      = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public UUID getId()          { return id; }
    public User getUser()        { return user; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt(){ return expiresAt; }
    public Instant getCreatedAt(){ return createdAt; }

    /** Returns true if this token has passed its expiry time. */
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
