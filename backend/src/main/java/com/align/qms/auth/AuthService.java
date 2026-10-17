package com.align.qms.auth;

import com.align.qms.exception.DisabledUserException;
import com.align.qms.exception.InvalidCredentialsException;
import com.align.qms.security.JwtService;
import com.align.qms.security.UserPrincipal;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserStatus;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Authentication service — login, registration, token refresh, logout, and current user lookup.
 *
 * <p>Security guarantees:
 * <ul>
 *   <li>Credentials are validated by Spring Security's {@link AuthenticationManager}
 *       (BCrypt password comparison). Passwords are never compared manually.</li>
 *   <li>Invalid credentials always produce a generic 401 response — the client
 *       cannot determine whether the email exists (no account enumeration).</li>
 *   <li>Disabled accounts produce a dedicated 401 (ACCOUNT_DISABLED) — revealed
 *       only after successful authentication, not during email lookup.</li>
 *   <li>Passwords are never logged.</li>
 * </ul>
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService            jwtService;
    private final RefreshTokenService   refreshTokenService;
    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final OrganizationRepository organizationRepository;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       RefreshTokenService refreshTokenService,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       OrganizationRepository organizationRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService            = jwtService;
        this.refreshTokenService   = refreshTokenService;
        this.userRepository        = userRepository;
        this.passwordEncoder       = passwordEncoder;
        this.organizationRepository = organizationRepository;
    }

    // ── Register ────────────────────────────────────────────────────────────

    /**
     * Register a new operator, organization admin, or platform admin account.
     * End-users / customers do not register (anonymous token issuance).
     *
     * @param request registration details
     * @return login response containing access & refresh tokens and user profile
     */
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already registered: " + normalizedEmail);
        }

        UUID resolvedOrgId = request.getOrgId();

        // If role is PLATFORM_ADMIN, orgId must be null
        if (request.getRole() == UserRole.PLATFORM_ADMIN) {
            resolvedOrgId = null;
        } else if (resolvedOrgId == null) {
            // Check if user requested a new organization
            if (request.getNewOrgName() != null && !request.getNewOrgName().isBlank()) {
                String code = "T-" + (int)(1000 + Math.random() * 9000);
                String sector = request.getNewOrgSector() != null && !request.getNewOrgSector().isBlank()
                    ? request.getNewOrgSector() : "Enterprise";
                Organization newOrg = new Organization(code, request.getNewOrgName().trim(), sector, normalizedEmail);
                Organization savedOrg = organizationRepository.save(newOrg);
                resolvedOrgId = savedOrg.getId();
            } else {
                // Default to first active organization in DB if available
                List<Organization> orgs = organizationRepository.findAll();
                if (!orgs.isEmpty()) {
                    resolvedOrgId = orgs.get(0).getId();
                }
            }
        }

        User newUser = new User(
            resolvedOrgId,
            normalizedEmail,
            passwordEncoder.encode(request.getPassword()),
            request.getName().trim(),
            request.getRole(),
            request.getLocationId()
        );

        User savedUser = userRepository.save(newUser);
        log.info("Registered new user id={} email={} role={}", savedUser.getId(), maskEmail(savedUser.getEmail()), savedUser.getRole());

        String accessToken = jwtService.generateAccessToken(savedUser);
        String refreshToken = refreshTokenService.createRefreshToken(savedUser);

        return new LoginResponse(
            accessToken,
            refreshToken,
            jwtService.getAccessTokenExpirationSeconds(),
            new UserResponse(savedUser)
        );
    }

    // ── Login ───────────────────────────────────────────────────────────────

    /**
     * Authenticate with email + password.
     *
     * @param request login credentials
     * @return login response with access token, refresh token, and user info
     * @throws InvalidCredentialsException if credentials are wrong
     * @throws DisabledUserException if account is disabled
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {
        // Never log the password — even at DEBUG level
        log.debug("Login attempt for email={}",
            maskEmail(request.getEmail()));

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail().toLowerCase().trim(),
                    request.getPassword()
                )
            );
        } catch (DisabledException e) {
            // Account found but disabled — reveal this distinction only
            // after credential verification (not during email lookup)
            log.warn("Login rejected — account disabled for email={}",
                maskEmail(request.getEmail()));
            throw new DisabledUserException();
        } catch (AuthenticationException e) {
            // Generic rejection — covers BadCredentialsException, LockedException, etc.
            // Do not reveal whether email exists.
            log.warn("Login failed — invalid credentials for email={}",
                maskEmail(request.getEmail()));
            throw new InvalidCredentialsException();
        }

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        // Reload user from DB to ensure freshest status/role (UserPrincipal is a snapshot)
        User user = userRepository.findById(principal.getId())
            .orElseThrow(InvalidCredentialsException::new);

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new DisabledUserException();
        }

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user);

        log.info("Login successful for userId={} role={}", user.getId(), user.getRole());

        return new LoginResponse(
            accessToken,
            refreshToken,
            jwtService.getAccessTokenExpirationSeconds(),
            new UserResponse(user)
        );
    }

    // ── Token Refresh ───────────────────────────────────────────────────────

    /**
     * Exchange a valid refresh token for a new access token (+ new refresh token via rotation).
     *
     * @param request contains the plaintext refresh token from the client
     * @return new access token and new refresh token
     */
    @Transactional
    public RefreshResponse refresh(RefreshTokenRequest request) {
        // Validate, rotate (delete old), and return user
        User user = refreshTokenService.validateAndRotate(request.getRefreshToken());

        // Guard: refuse to issue tokens for disabled accounts
        if (user.getStatus() == UserStatus.INACTIVE) {
            // Revoke remaining tokens for good measure
            refreshTokenService.revokeAllForUser(user.getId());
            throw new DisabledUserException();
        }

        String newAccessToken  = jwtService.generateAccessToken(user);
        // Issue new refresh token as part of rotation
        String newRefreshToken = refreshTokenService.createRefreshToken(user);

        log.debug("Token refreshed for userId={}", user.getId());

        return new RefreshResponse(newAccessToken, jwtService.getAccessTokenExpirationSeconds());
    }

    // ── Logout ──────────────────────────────────────────────────────────────

    /**
     * Revoke all refresh tokens for the current authenticated user.
     * The access token itself is short-lived (15 min) and cannot be revoked
     * server-side in a stateless JWT architecture — this is documented in ADR-011.
     */
    @Transactional
    public void logout(UUID userId) {
        refreshTokenService.revokeAllForUser(userId);
        log.info("Logout: refresh tokens revoked for userId={}", userId);
    }

    // ── Current User ────────────────────────────────────────────────────────

    /**
     * Return the current authenticated user's profile.
     *
     * <p>Identity is derived entirely from the validated SecurityContext.
     * The userId embedded in the JWT is used to load fresh user data from the
     * database — the client cannot supply or forge the identity.
     *
     * @return UserResponse for the authenticated user
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        UserPrincipal principal = extractCurrentPrincipal();
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> {
                log.error("Authenticated user not found in DB: userId={}", principal.getId());
                throw new InvalidCredentialsException();
            });
        return new UserResponse(user);
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    private UserPrincipal extractCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (UserPrincipal) auth.getPrincipal();
    }

    /**
     * Mask email for safe logging: user@example.com → u***@example.com.
     * Prevents PII from appearing in logs while still aiding debugging.
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String masked = (local.length() > 1)
            ? local.charAt(0) + "***"
            : "***";
        return masked + "@" + parts[1];
    }
}
