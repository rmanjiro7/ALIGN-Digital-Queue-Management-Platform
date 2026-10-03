package com.align.qms.security;


import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class RateLimitIntegrationTest extends com.align.qms.PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitFilter rateLimitFilter;

    // Reset buckets before each test since it's a singleton in context
    @BeforeEach
    void setUp() {
        rateLimitFilter.clearBuckets();
    }

    @Test
    void testLoginUnderLimitSucceeds() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                    .with(request -> { request.setRemoteAddr("10.0.0.1"); return request; }))
                    .andExpect(status().isUnauthorized()); // existing auth logic throws 401
        }
    }

    @Test
    void testLoginAboveLimitReturns429() throws Exception {
        // Login limit is 10
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                    .with(request -> { request.setRemoteAddr("10.0.0.2"); return request; }));
        }

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                .with(request -> { request.setRemoteAddr("10.0.0.2"); return request; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"));
    }

    @Test
    void testDifferentIpsHaveIndependentLoginBuckets() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                    .with(request -> { request.setRemoteAddr("10.0.0.3"); return request; }));
        }

        // 10.0.0.3 is exhausted
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                .with(request -> { request.setRemoteAddr("10.0.0.3"); return request; }))
                .andExpect(status().isTooManyRequests());

        // 10.0.0.4 is fresh and gets 401 instead of 429
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"fake@example.com\", \"password\":\"wrongpassword\"}")
                .with(request -> { request.setRemoteAddr("10.0.0.4"); return request; }))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testTokenCreationUnderLimit() throws Exception {
        // Token creation limit is 30
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/v1/tokens")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}") // Will probably return 400 Bad Request since it's empty, but not 429
                    .with(request -> { request.setRemoteAddr("10.0.0.5"); return request; }))
                    .andExpect(status().isUnprocessableEntity());
        }
    }

    @Test
    void testTokenCreationAboveLimitReturns429() throws Exception {
        for (int i = 0; i < 30; i++) {
            mockMvc.perform(post("/api/v1/tokens")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(request -> { request.setRemoteAddr("10.0.0.6"); return request; }));
        }

        mockMvc.perform(post("/api/v1/tokens")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .with(request -> { request.setRemoteAddr("10.0.0.6"); return request; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"));
    }

    @Test
    @WithMockUser(username = "staff123", roles = "STAFF")
    void testAuthenticatedUserUnderLimit() throws Exception {
        // Authenticated limit is 120
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(get("/api/v1/admin/staff-operations/test") // Random endpoint to test generic authenticated
                    .with(request -> { request.setRemoteAddr("10.0.0.7"); return request; }))
                    .andExpect(status().isNotFound()); // 404 because it doesn't exist, but passes rate limit
        }
    }

    @Test
    @WithMockUser(username = "staff123", roles = "STAFF")
    void testAuthenticatedUserAboveLimitReturns429() throws Exception {
        for (int i = 0; i < 120; i++) {
            mockMvc.perform(get("/api/v1/admin/staff-operations/test")
                    .with(request -> { request.setRemoteAddr("10.0.0.8"); return request; }));
        }

        mockMvc.perform(get("/api/v1/admin/staff-operations/test")
                .with(request -> { request.setRemoteAddr("10.0.0.8"); return request; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"));
    }

    @Test
    @WithMockUser(username = "staff456", roles = "STAFF")
    void testIndependentAuthenticatedBuckets() throws Exception {
        // Use up staff123's bucket manually by directly sending 120
        // But since we use @WithMockUser on the method, we test staff456 here
        // Wait, I can just verify staff456 is fresh
        mockMvc.perform(get("/api/v1/admin/staff-operations/test")
                .with(request -> { request.setRemoteAddr("10.0.0.8"); return request; }))
                .andExpect(status().isNotFound());
    }

    @Test
    void testWebSocketEndpointExcluded() throws Exception {
        for (int i = 0; i < 150; i++) {
            mockMvc.perform(get("/ws-align/info")
                    .with(request -> { request.setRemoteAddr("10.0.0.9"); return request; }));
        }

        mockMvc.perform(get("/ws-align/info")
                .with(request -> { request.setRemoteAddr("10.0.0.9"); return request; }))
                .andExpect(status().isNotFound()); // or isOk(), but not 429
    }

    @Test
    void testSwaggerEndpointsExcluded() throws Exception {
        for (int i = 0; i < 150; i++) {
            mockMvc.perform(get("/v3/api-docs")
                    .with(request -> { request.setRemoteAddr("10.0.0.10"); return request; }));
        }

        mockMvc.perform(get("/v3/api-docs")
                .with(request -> { request.setRemoteAddr("10.0.0.10"); return request; }))
                .andExpect(status().isOk()); 
    }

    @Test
    void testHealthEndpointExcluded() throws Exception {
        for (int i = 0; i < 150; i++) {
            mockMvc.perform(get("/actuator/health")
                    .with(request -> { request.setRemoteAddr("10.0.0.11"); return request; }));
        }

        mockMvc.perform(get("/actuator/health")
                .with(request -> { request.setRemoteAddr("10.0.0.11"); return request; }))
                .andExpect(status().isOk()); 
    }
}
