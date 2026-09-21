package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterRepository;
import com.align.qms.exception.UnauthorizedTenantAccessException;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StaffOperationsSecurityTest extends PostgresIntegrationTest {

    @Autowired private StaffOperationsService staffOperationsService;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgIdA;
    private UUID orgIdB;
    private Counter counterA;
    private Token tokenA;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM counter_service_assignments");
        tokenRepository.deleteAll();
        counterRepository.deleteAll();
        queueRepository.deleteAll();

        orgIdA = UUID.randomUUID();
        orgIdB = UUID.randomUUID();
        UUID locationIdA = UUID.randomUUID();
        UUID serviceIdA = UUID.randomUUID();

        // Stub parent domain entities
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgIdA, orgIdA.toString().substring(0, 8), "Test Org A");
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgIdB, orgIdB.toString().substring(0, 8), "Test Org B");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationIdA, orgIdA, "Test Loc A");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceIdA, locationIdA, orgIdA, "Test Service A", false);

        Queue queueA = new Queue(orgIdA, locationIdA, serviceIdA, "Test Queue A", "A", 100);
        queueA = queueRepository.save(queueA);

        counterA = new Counter(orgIdA, locationIdA, 1, "Counter 1");
        counterA.setAvailability(CounterAvailability.ONLINE);
        counterA = counterRepository.save(counterA);

        tokenA = new Token(orgIdA, locationIdA, serviceIdA, queueA.getId(), "A1", "Customer A1", null, null);
        tokenA.setJoinedAt(Instant.now());
        tokenA = tokenRepository.save(tokenA);
    }

    private void setContext(UUID orgId, UUID staffId) {
        com.align.qms.security.UserPrincipal principal = org.mockito.Mockito.mock(com.align.qms.security.UserPrincipal.class);
        org.mockito.Mockito.when(principal.getId()).thenReturn(staffId);
        org.mockito.Mockito.when(principal.getOrgId()).thenReturn(orgId);
        org.mockito.Mockito.when(principal.getRole()).thenReturn(com.align.qms.user.UserRole.STAFF);
        org.mockito.Mockito.when(principal.getAuthorities()).thenReturn((java.util.Collection) java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STAFF")));
        
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    private void clearContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Security: CALL NEXT rejects staff from wrong organization")
    void callNextRejectsWrongTenant() {
        // Staff belongs to Org B, trying to call next on Counter in Org A
        setContext(orgIdB, UUID.randomUUID());

        assertThatThrownBy(() -> staffOperationsService.callNext(counterA.getId()))
                .isInstanceOf(UnauthorizedTenantAccessException.class)
                .hasMessageContaining("Staff must belong to the same organization as the counter");

        clearContext();
    }
}
