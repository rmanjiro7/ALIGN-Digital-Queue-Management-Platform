package com.align.qms.auth;

import com.align.qms.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Authentication REST controller.
 *
 * <p>Public endpoints (no JWT required):
 * <ul>
 *   <li>POST /api/v1/auth/login</li>
 *   <li>POST /api/v1/auth/refresh</li>
 * </ul>
 *
 * <p>Protected endpoints (valid JWT required):
 * <ul>
 *   <li>POST /api/v1/auth/logout</li>
 *   <li>GET  /api/v1/auth/me</li>
 * </ul>
 *
 * <p>No authorization business logic lives here — all decisions are in
 * {@link AuthService}. Controllers only validate input and delegate.
 */
@Tag(name = "Authentication", description = "Authentication and session management")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Authenticate with email + password.
     * Returns access token, refresh token, expiry, and user profile.
     *
     * <p>Public endpoint — no JWT required.
     * Invalid credentials → 401 INVALID_CREDENTIALS (generic, no enumeration).
     * Disabled account → 401 ACCOUNT_DISABLED.
     * Validation failure → 422 VALIDATION_ERROR.
     */
    /**
     * Register a new operator, organization admin, or platform admin account.
     * Returns access token, refresh token, expiry, and user profile.
     *
     * <p>Public endpoint — no JWT required.
     * End-users / customers do not register (they queue anonymously).
     */
    @Operation(summary = "Register new staff/admin user")
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(response);
    }

    /**
     * Authenticate with email + password.
     * Returns access token, refresh token, expiry, and user profile.
     *
     * <p>Public endpoint — no JWT required.
     * Invalid credentials → 401 INVALID_CREDENTIALS (generic, no enumeration).
     * Disabled account → 401 ACCOUNT_DISABLED.
     * Validation failure → 422 VALIDATION_ERROR.
     */
    @Operation(summary = "Authenticate with email and password")
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Exchange a valid refresh token for a new access token.
     * Old refresh token is revoked and a new one is issued (rotation).
     *
     * <p>Public endpoint — no JWT required.
     * Invalid/revoked token → 401 TOKEN_INVALID.
     * Expired token → 401 TOKEN_EXPIRED.
     */
    @Operation(summary = "Refresh access token", description = "Exchange a valid refresh token for a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        RefreshResponse response = authService.refresh(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Logout: revoke all refresh tokens for the authenticated user.
     * The short-lived access token expires naturally (15 min).
     *
     * <p>Protected endpoint — valid JWT required (401 if missing/invalid).
     * Always returns 204 No Content (even if no tokens existed).
     */
    @Operation(summary = "Logout user", description = "Revoke all refresh tokens for the authenticated user")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Return the current authenticated user's identity.
     * Identity is derived from the validated SecurityContext — never from
     * client-supplied parameters.
     *
     * <p>Protected endpoint — valid JWT required.
     */
    @Operation(summary = "Get current user profile")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        // Principal is injected by Spring Security from the validated SecurityContext.
        // We call authService.getCurrentUser() which reloads from DB for freshness.
        UserResponse response = authService.getCurrentUser();
        return ResponseEntity.ok(response);
    }
}
