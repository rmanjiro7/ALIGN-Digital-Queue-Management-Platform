package com.align.qms.security;

import com.align.qms.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    private static final int MAX_BUCKETS = 1000;

    // Separate caches for different endpoint categories
    private final Map<String, Bucket> authBuckets = Collections.synchronizedMap(new LruCache());
    private final Map<String, Bucket> tokenCreationBuckets = Collections.synchronizedMap(new LruCache());
    private final Map<String, Bucket> authenticatedBuckets = Collections.synchronizedMap(new LruCache());
    private final Map<String, Bucket> genericBuckets = Collections.synchronizedMap(new LruCache());

    public RateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void clearBuckets() {
        authBuckets.clear();
        tokenCreationBuckets.clear();
        authenticatedBuckets.clear();
        genericBuckets.clear();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // 1. Exclusions
        if (path.startsWith("/ws-align") ||
            path.startsWith("/actuator/health") ||
            path.startsWith("/v3/api-docs") ||
            path.startsWith("/swagger-ui")) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket bucket;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String method = request.getMethod().toUpperCase();

        // 2. Identify category and get/create bucket
        if (path.equals("/api/v1/auth/login") || path.equals("/api/v1/auth/refresh")) {
            // A. AUTHENTICATION: 10 requests / minute / IP
            bucket = authBuckets.computeIfAbsent(request.getRemoteAddr(), k -> createAuthBucket());
        } else if (path.equals("/api/v1/tokens") && method.equals("POST")) {
            // C. CUSTOMER TOKEN CREATION: 30 requests / minute / IP
            bucket = tokenCreationBuckets.computeIfAbsent(request.getRemoteAddr(), k -> createTokenCreationBucket());
        } else if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            // D. AUTHENTICATED OPERATIONS & E. ANALYTICS: 120 requests / minute / User
            bucket = authenticatedBuckets.computeIfAbsent(authentication.getName(), k -> createAuthenticatedBucket());
        } else {
            // Generic unauthenticated public API: 100 requests / minute / IP
            bucket = genericBuckets.computeIfAbsent(request.getRemoteAddr(), k -> createGenericBucket());
        }

        // 3. Consume token
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .message("Too many requests")
                .code("RATE_LIMIT_EXCEEDED")
                .build();
            
            objectMapper.writeValue(response.getWriter(), errorResponse);
        }
    }

    private Bucket createAuthBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofMinutes(1)).build())
            .build();
    }

    private Bucket createTokenCreationBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(30).refillIntervally(30, Duration.ofMinutes(1)).build())
            .build();
    }

    private Bucket createAuthenticatedBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(120).refillIntervally(120, Duration.ofMinutes(1)).build())
            .build();
    }

    private Bucket createGenericBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(100).refillIntervally(100, Duration.ofMinutes(1)).build())
            .build();
    }

    private static class LruCache extends LinkedHashMap<String, Bucket> {
        public LruCache() {
            super(MAX_BUCKETS, 0.75f, true);
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
            return size() > MAX_BUCKETS;
        }
    }
}
