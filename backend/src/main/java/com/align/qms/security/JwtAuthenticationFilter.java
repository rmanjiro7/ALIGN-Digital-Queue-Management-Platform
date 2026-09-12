package com.align.qms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter — runs once per request before Spring Security authorization.
 *
 * <p>Processing sequence:
 * <ol>
 *   <li>Extract the Bearer token from the {@code Authorization} header.</li>
 *   <li>Extract the userId from the token (even if expired — to load UserDetails).</li>
 *   <li>Load {@link UserPrincipal} via {@link UserDetailsServiceImpl}
 *       (verifies the account still exists and is active).</li>
 *   <li>Validate the token (signature + expiry). Only if valid, set the
 *       {@link org.springframework.security.core.context.SecurityContext}.</li>
 *   <li>If anything is invalid, do NOT set SecurityContext — downstream
 *       {@link AuthEntryPoint} returns 401.</li>
 * </ol>
 *
 * <p>Security notes:
 * <ul>
 *   <li>The Authorization header value is never logged.</li>
 *   <li>Any exception during JWT processing is silently swallowed here —
 *       the SecurityContext remains unauthenticated, triggering the 401 handler.</li>
 *   <li>The filter is stateless — no session is created or used.</li>
 * </ul>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService              jwtService;
    private final UserDetailsServiceImpl  userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   UserDetailsServiceImpl userDetailsService) {
        this.jwtService         = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            processToken(token, request);
        }

        filterChain.doFilter(request, response);
    }

    private void processToken(String token, HttpServletRequest request) {
        try {
            // Extract userId without throwing on expiry — we want to load UserDetails first
            String userId = jwtService.extractUserIdUnchecked(token);
            if (userId == null) {
                log.debug("JWT filter: could not extract userId from token");
                return;
            }

            // Load the user by UUID — verifies account still exists and is ACTIVE.
            // JWT subject is userId (UUID string), not email.
            UserDetails userDetails = userDetailsService.loadUserById(
                java.util.UUID.fromString(userId)
            );

            // Full token validation: signature + expiry
            if (!jwtService.isTokenValid(token)) {
                log.debug("JWT filter: token invalid or expired for userId={}", userId);
                return;
            }

            // Account must be enabled (status = ACTIVE)
            if (!userDetails.isEnabled()) {
                log.debug("JWT filter: account disabled for userId={}", userId);
                return;
            }

            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
                );
            authToken.setDetails(
                new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authToken);

        } catch (Exception e) {
            // Any exception during JWT processing = unauthenticated request.
            // AuthEntryPoint will handle the 401 response.
            log.debug("JWT filter: exception during token processing: {}", e.getMessage());
        }
    }

    /**
     * Extract the raw JWT from the Authorization header (strips "Bearer " prefix).
     * Returns null if header is absent or malformed.
     * The header value is never logged.
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
