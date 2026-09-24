package com.align.qms.security;

import com.align.qms.user.User;
import com.align.qms.user.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * JWT access token generation and validation service (SECURITY.md — JWT Strategy).
 *
 * <p>Algorithm: HS512 (symmetric, single-service deployment).
 * Secret: injected from {@code JWT_SECRET} environment variable — never hardcoded.
 *
 * <p>Access token claims:
 * <pre>
 * {
 *   "sub":        "&lt;userId UUID&gt;",
 *   "orgId":      "&lt;orgId UUID or null&gt;",
 *   "role":       "STAFF|ORG_ADMIN|PLATFORM_ADMIN",
 *   "locationId": "&lt;locationId UUID or null&gt;",
 *   "iat":        &lt;epoch seconds&gt;,
 *   "exp":        &lt;epoch seconds&gt;
 * }
 * </pre>
 *
 * <p>Security contract:
 * <ul>
 *   <li>Claims are trusted ONLY after signature validation passes.</li>
 *   <li>orgId / role / locationId from this token are authoritative for all
 *       tenant and authorization checks — NEVER trust client-supplied values.</li>
 *   <li>Passwords, password hashes, and secrets are never placed in tokens.</li>
 * </ul>
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    // Claim keys — constants prevent typos across generation and parsing
    public static final String CLAIM_ORG_ID      = "orgId";
    public static final String CLAIM_ROLE        = "role";
    public static final String CLAIM_LOCATION_ID = "locationId";

    private final SecretKey signingKey;
    private final long accessTokenExpirationMs;

    public JwtService(
            @Value("${align.jwt.secret}") String secret,
            @Value("${align.jwt.access-token-expiration-ms:900000}") long accessTokenExpirationMs) {

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "align.jwt.secret must be configured. Set JWT_SECRET environment variable.");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException(
                "JWT secret is too short. Minimum 32 characters required for HS512 security.");
        }

        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    // ── Token Generation ────────────────────────────────────────────────────

    /**
     * Generate a signed HS512 JWT access token for the given user.
     *
     * <p>The token embeds orgId, role, and locationId so that authorization
     * checks in the request pipeline do not require a database round-trip.
     * Values are sourced from the database-loaded {@link User} — never from
     * client input.
     *
     * @param user the authenticated user (loaded from DB)
     * @return signed JWT access token string
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(accessTokenExpirationMs);

        return Jwts.builder()
            .subject(user.getId().toString())
            .claim(CLAIM_ORG_ID,      user.getOrgId() != null ? user.getOrgId().toString() : null)
            .claim(CLAIM_ROLE,        user.getRole().name())
            .claim(CLAIM_LOCATION_ID, user.getLocationId() != null ? user.getLocationId().toString() : null)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(signingKey)
            .compact();
    }

    /**
     * Generate a short-lived signed HS512 JWT access token for a customer token.
     * This credential is ONLY for subscribing to realtime token updates via WebSockets.
     * It cannot be used for normal REST API authentication.
     */
    public String generateCustomerRealtimeToken(com.align.qms.token.Token token) {
        Instant now = Instant.now();
        // Short-lived expiration: e.g., 4 hours (14400000 ms) should cover most queue waits safely.
        Instant expiry = now.plusMillis(14400000);

        return Jwts.builder()
            .subject(token.getId().toString())
            .claim(CLAIM_ORG_ID, token.getOrgId().toString())
            .claim(CLAIM_LOCATION_ID, token.getLocationId().toString())
            .claim(CLAIM_ROLE, "CUSTOMER_TOKEN") // pseudo-role, will fail DB lookups
            .claim("purpose", "CUSTOMER_REALTIME")
            .claim("tokenId", token.getId().toString())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(signingKey)
            .compact();
    }

    /**
     * Returns the access token lifetime in seconds (for {@code expiresIn} response field).
     */
    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationMs / 1000;
    }

    // ── Token Validation ────────────────────────────────────────────────────

    /**
     * Validate a JWT access token string.
     *
     * <p>Validation checks:
     * <ol>
     *   <li>Signature integrity (rejects forged/tampered tokens)</li>
     *   <li>Expiration ({@code exp} claim)</li>
     *   <li>Malformed structure</li>
     * </ol>
     *
     * @param token the raw JWT string (without "Bearer " prefix)
     * @return {@code true} if valid and not expired; {@code false} otherwise
     */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
            return false;
        } catch (SignatureException e) {
            log.warn("JWT signature validation failed — possible token forgery attempt");
            return false;
        } catch (MalformedJwtException e) {
            log.debug("Malformed JWT token");
            return false;
        } catch (UnsupportedJwtException e) {
            log.debug("Unsupported JWT token");
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation error: {}", e.getMessage());
            return false;
        }
    }

    // ── Claims Extraction ───────────────────────────────────────────────────

    /**
     * Extract the subject (userId UUID string) from a valid token.
     *
     * @throws JwtException if the token is invalid or expired
     */
    public String extractUserId(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Extract the orgId claim from a valid token. May return null for PLATFORM_ADMIN.
     *
     * @throws JwtException if the token is invalid or expired
     */
    public UUID extractOrgId(String token) {
        String orgId = (String) parseClaims(token).get(CLAIM_ORG_ID);
        return orgId != null ? UUID.fromString(orgId) : null;
    }

    /**
     * Extract the role claim from a valid token.
     *
     * @throws JwtException if the token is invalid or expired
     */
    public UserRole extractRole(String token) {
        String role = (String) parseClaims(token).get(CLAIM_ROLE);
        return UserRole.valueOf(role);
    }

    /**
     * Extract the locationId claim from a valid token. May return null.
     *
     * @throws JwtException if the token is invalid or expired
     */
    public UUID extractLocationId(String token) {
        String locationId = (String) parseClaims(token).get(CLAIM_LOCATION_ID);
        return locationId != null ? UUID.fromString(locationId) : null;
    }

    /**
     * Extract the email (subject) from a token WITHOUT validating expiry.
     * Used in the JWT filter to load UserDetails before checking validity.
     * The filter then calls {@link #isTokenValid} for the actual gate check.
     */
    public io.jsonwebtoken.Claims extractClaimsUnchecked(String token) {
        try {
            return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    // ── Internal ────────────────────────────────────────────────────────────

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
