package com.align.qms.analytics;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.security.UserPrincipal;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AnalyticsControllerSmokeTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private UserPrincipal createPrincipal(UserRole role, UUID orgId) {
        UserPrincipal principal = org.mockito.Mockito.mock(UserPrincipal.class);
        org.mockito.Mockito.when(principal.getId()).thenReturn(UUID.randomUUID());
        org.mockito.Mockito.when(principal.getOrgId()).thenReturn(orgId);
        org.mockito.Mockito.when(principal.getRole()).thenReturn(role);
        org.mockito.Mockito.when(principal.getLocationId()).thenReturn(UUID.randomUUID());
        org.mockito.Mockito.when(principal.getAuthorities()).thenAnswer(i -> 
            java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.name())));
        return principal;
    }

    @Test
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview?startDate=2023-01-01T00:00:00Z&endDate=2023-01-02T00:00:00Z"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void staff_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview?startDate=2023-01-01T00:00:00Z&endDate=2023-01-02T00:00:00Z")
               .with(user(createPrincipal(UserRole.STAFF, UUID.randomUUID()))))
               .andExpect(status().isForbidden());
    }
    
    @Test
    void display_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview?startDate=2023-01-01T00:00:00Z&endDate=2023-01-02T00:00:00Z")
               .with(user(createPrincipal(UserRole.DISPLAY, UUID.randomUUID()))))
               .andExpect(status().isForbidden());
    }

    @Test
    void orgAdmin_success() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview?startDate=2023-01-01T00:00:00Z&endDate=2023-01-02T00:00:00Z")
               .with(user(createPrincipal(UserRole.ORG_ADMIN, UUID.randomUUID()))))
               .andExpect(status().isOk());
    }
    
    @Test
    void platformAdmin_success() throws Exception {
        UUID randomOrg = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/analytics/overview?startDate=2023-01-01T00:00:00Z&endDate=2023-01-02T00:00:00Z&orgId=" + randomOrg)
               .with(user(createPrincipal(UserRole.PLATFORM_ADMIN, null))))
               .andExpect(status().isOk());
    }
}
