package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.UserPrincipal;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenResponse;
import com.align.qms.user.User;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TenantIsolationTest extends PostgresIntegrationTest {

    @Autowired private TokenService tokenService;
    @Autowired private QueueRepository queueRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgA;
    private UUID orgB;
    private UUID serviceA;
    private TokenResponse tokenA;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        queueRepository.deleteAll();
        
        orgA = UUID.randomUUID();
        orgB = UUID.randomUUID();
        UUID locationA = UUID.randomUUID();
        serviceA = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgA, "OA-" + orgA.toString().substring(0, 8), "Org A");
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgB, "OB-" + orgB.toString().substring(0, 8), "Org B");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationA, orgA, "Loc A");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceA, locationA, orgA, "Service A", false);

        Queue queueA = new Queue(orgA, locationA, serviceA, "Queue A", "A", 10);
        queueRepository.save(queueA);

        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(serviceA);
        tokenA = tokenService.joinQueue(req);
    }

    private void setSecurityContext(UUID orgId, UserRole role) {
        UserPrincipal principal = org.mockito.Mockito.mock(UserPrincipal.class);
        org.mockito.Mockito.when(principal.getRole()).thenReturn(role);
        org.mockito.Mockito.when(principal.getOrgId()).thenReturn(orgId);
        
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Tenant Isolation: Unauthenticated user can read token by ID (public access)")
    void testUnauthenticatedAccessAllowed() {
        clearSecurityContext();
        TokenResponse res = tokenService.getToken(tokenA.getId());
        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(tokenA.getId());
    }

    @Test
    @DisplayName("Tenant Isolation: Staff from same org can read token")
    void testSameOrgStaffAccessAllowed() {
        setSecurityContext(orgA, UserRole.STAFF);
        TokenResponse res = tokenService.getToken(tokenA.getId());
        assertThat(res).isNotNull();
    }

    @Test
    @DisplayName("Tenant Isolation: Staff from DIFFERENT org CANNOT read token")
    void testDifferentOrgStaffAccessDenied() {
        setSecurityContext(orgB, UserRole.STAFF); // Authenticated as Org B
        
        assertThrows(AccessDeniedException.class, () -> {
            tokenService.getToken(tokenA.getId());
        });
        
        assertThrows(AccessDeniedException.class, () -> {
            tokenService.cancelToken(tokenA.getId());
        });
    }

    @Test
    @DisplayName("Tenant Isolation: Platform admin can read any token")
    void testPlatformAdminAccessAllowed() {
        setSecurityContext(null, UserRole.PLATFORM_ADMIN); // Platform admins have null orgId
        TokenResponse res = tokenService.getToken(tokenA.getId());
        assertThat(res).isNotNull();
    }
}
