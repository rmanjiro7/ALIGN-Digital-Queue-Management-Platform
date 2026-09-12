package com.align.qms;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 0 Foundation Integration Test.
 *
 * <p>Verifies the complete Phase 0 startup chain against a real PostgreSQL
 * database (Testcontainers):
 * <ol>
 *   <li>Application context loads successfully</li>
 *   <li>PostgreSQL connection is established</li>
 *   <li>Flyway migrations execute without error</li>
 *   <li>/actuator/health returns HTTP 200 with UP status</li>
 * </ol>
 */
class AlignApplicationTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    /**
     * Context load is implicitly verified by the test class starting —
     * if the ApplicationContext fails to load, all tests in this class fail.
     * This explicit test documents that intent.
     */
    @Test
    void contextLoads() {
        // If this test runs, the ApplicationContext started successfully,
        // PostgreSQL connected, and Flyway migrations completed.
    }

    /**
     * Verifies GET /actuator/health returns HTTP 200 and body contains
     * "UP" status indicating all health indicators are healthy.
     */
    @Test
    void actuatorHealth_returnsUp() {
        String url = "http://localhost:" + port + "/actuator/health";
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

        assertThat(response.getStatusCode())
            .as("GET /actuator/health should return HTTP 200")
            .isEqualTo(HttpStatus.OK);

        assertThat(response.getBody())
            .as("Health response should contain status UP")
            .contains("\"status\":\"UP\"");
    }

    /**
     * Verifies GET /actuator/info returns HTTP 200 (public) or 401 (protected).
     * Phase 1: /actuator/info requires authentication — expect 401 without token.
     * This is correct behavior: only /actuator/health is public.
     */
    @Test
    void actuatorInfo_returns200() {
        String url = "http://localhost:" + port + "/actuator/info";
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

        // Phase 1: Spring Security now protects all actuator endpoints except /health.
        // /actuator/info returns 401 without a valid JWT — this is correct behavior.
        assertThat(response.getStatusCode())
            .as("GET /actuator/info without auth should return HTTP 401 (protected in Phase 1)")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * Verifies that unknown endpoints return 401 without auth (Phase 1).
     * Spring Security intercepts all requests; unauthenticated access to any
     * protected endpoint returns 401 before routing occurs.
     * A request with a valid JWT to an unknown endpoint would return 404.
     */
    @Test
    void unknownEndpoint_returns404() {
        String url = "http://localhost:" + port + "/api/v1/nonexistent";
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

        // Phase 1: Without a valid JWT, Spring Security returns 401 before
        // the request reaches the routing layer (which would produce 404).
        // This is correct deny-by-default security behavior.
        assertThat(response.getStatusCode())
            .as("Unknown endpoint without auth returns 401 (protected by Spring Security)")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
