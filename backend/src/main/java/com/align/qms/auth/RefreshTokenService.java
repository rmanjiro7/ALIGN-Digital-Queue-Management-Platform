package com.align.qms.auth;

import com.align.qms.exception.AlignException;
import com.align.qms.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/**
 * Refresh token lifecycle service (ADR-011).
 *
 * <p>Strategy: one-time-use with server-side rotation.
 * <ol>
 *   <li><b>Issue</b>: generate a cryptographically secure plaintext token
 *       (URL-safe base64 of 32 random bytes = 43 chars). Hash it with SHA-256.
 *       Store only the hash. Return plaintext to client.</li>
 *   <li><b>Rotate</b>: on refresh, compute SHA-256 of submitted token, look up
 *       the hash. If found and not expired: delete old row, issue new pair.
 *       If not found (revoked or never existed): 401.</li>
 *   <li><b>Revoke</b>: delete all rows for user (logout / password change).</li>
 *   <li><b>Cleanup</b>: a scheduled job silently deletes expired rows daily.</li>
 * </ol>
 *
 * <p>Security: the plaintext token is never stored or logged. Only the
 * 64-char hex SHA-256 digest is persisted. Lookup is constant-time via the
 * unique index on {@code token_hash}.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTokenExpirationMs;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${align.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs) {

        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    // ── Token Generation ────────────────────────────────────────────────────

    /**
     * Generate a new refresh token for the given user, persist its hash,
     * and return the plaintext token to be sent to the client.
     *
     * @param user the authenticated user
     * @return plaintext refresh token (URL-safe base64, never stored server-side)
     */
    @Transactional
    public String createRefreshToken(User user) {
        // Generate 32 cryptographically random bytes → URL-safe base64 string
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String plaintextToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String tokenHash = hashToken(plaintextToken);
        Instant expiresAt = Instant.now().plusMillis(refreshTokenExpirationMs);

        RefreshToken refreshToken = new RefreshToken(user, tokenHash, expiresAt);
        refreshTokenRepository.save(refreshToken);

        // Never log the plaintext token value
        log.debug("Refresh token issued for userId={}", user.getId());

        return plaintextToken;
    }

    // ── Token Rotation ──────────────────────────────────────────────────────

    /**
     * Validate a refresh token, delete it (rotation), and return the associated user.
     *
     * <p>Validation sequence:
     * <ol>
     *   <li>Hash the submitted plaintext token.</li>
     *   <li>Look up the hash in the database.</li>
     *   <li>If not found → 401 (never existed or already revoked/rotated).</li>
     *   <li>If expired → delete and return 401.</li>
     *   <li>If valid → delete the old row (rotation) and return the user.</li>
     * </ol>
     *
     * @param plaintextToken the raw token string from the client request body
     * @return the {@link User} associated with the valid token
     * @throws AlignException 401 TOKEN_INVALID or TOKEN_EXPIRED
     */
    @Transactional
    public User validateAndRotate(String plaintextToken) {
        String tokenHash = hashToken(plaintextToken);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> {
                log.warn("Refresh token lookup failed — token not found (revoked, rotated, or forged)");
                return new AlignException(
                    "Invalid or revoked refresh token",
                    HttpStatus.UNAUTHORIZED,
                    "TOKEN_INVALID");
            });

        if (stored.isExpired()) {
            // Delete expired token to clean up proactively
            refreshTokenRepository.delete(stored);
            log.debug("Expired refresh token submitted for userId={}", stored.getUser().getId());
            throw new AlignException(
                "Refresh token has expired",
                HttpStatus.UNAUTHORIZED,
                "TOKEN_EXPIRED");
        }

        User user = stored.getUser();

        // Rotation: delete the used token so it cannot be reused
        refreshTokenRepository.delete(stored);
        refreshTokenRepository.flush();

        log.debug("Refresh token rotated for userId={}", user.getId());
        return user;
    }

    // ── Revocation ──────────────────────────────────────────────────────────

    /**
     * Revoke all refresh tokens for a user (logout / security event).
     * Safe to call even if no tokens exist.
     */
    @Transactional
    public void revokeAllForUser(java.util.UUID userId) {
        refreshTokenRepository.deleteAllByUserId(userId);
        log.debug("All refresh tokens revoked for userId={}", userId);
    }

    // ── Scheduled Cleanup ───────────────────────────────────────────────────

    /**
     * Daily cleanup of expired refresh tokens.
     * Runs at 03:00 UTC. Safe to run multiple times (idempotent).
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        int deleted = refreshTokenRepository.deleteAllExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Refresh token cleanup: deleted {} expired token(s)", deleted);
        }
    }

    // ── Internal ────────────────────────────────────────────────────────────

    /**
     * Compute SHA-256 hex digest of a plaintext token.
     * Used for both storage and lookup. SHA-256 is appropriate here —
     * refresh tokens are long random strings (high entropy), not passwords.
     * BCrypt is unnecessary and would be ~100x slower with no security benefit.
     */
    String hashToken(String plaintextToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(
                plaintextToken.getBytes(StandardCharsets.UTF_8));
            // Convert to lowercase hex string (64 chars)
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed by the Java spec — this cannot happen
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
