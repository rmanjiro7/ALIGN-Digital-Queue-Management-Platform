package com.align.qms.analytics;

import com.align.qms.PostgresIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public abstract class BaseAnalyticsIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected AnalyticsService analyticsService;

    protected UUID orgId1 = UUID.randomUUID();
    protected UUID orgId2 = UUID.randomUUID();
    
    protected UUID loc1Org1 = UUID.randomUUID();
    protected UUID loc2Org1 = UUID.randomUUID();
    
    protected UUID queue1Loc1 = UUID.randomUUID();
    protected UUID service1Loc1 = UUID.randomUUID();
    protected UUID counter1Loc1 = UUID.randomUUID();
    protected UUID staff1Org1 = UUID.randomUUID();

    protected UUID staff2Org1 = UUID.randomUUID(); // No completions

    protected Instant baseTime;

    @BeforeEach
    void setUpData() {
        jdbcTemplate.update("DELETE FROM token_events");
        jdbcTemplate.update("DELETE FROM tokens");
        jdbcTemplate.update("DELETE FROM queues");
        jdbcTemplate.update("DELETE FROM services");
        jdbcTemplate.update("DELETE FROM counters");
        jdbcTemplate.update("DELETE FROM users");
        jdbcTemplate.update("DELETE FROM locations");
        jdbcTemplate.update("DELETE FROM organizations");

        // Base time is top of the current hour minus 2 days, to avoid time-zone boundary shifts in "TODAY" logic if we need to
        baseTime = Instant.now().truncatedTo(ChronoUnit.HOURS).minus(2, ChronoUnit.DAYS);

        // Orgs
        insertOrg(orgId1, "ORG_ANALYTICS_1", "Org 1");
        insertOrg(orgId2, "ORG_ANALYTICS_2", "Org 2");

        // Locations
        insertLoc(loc1Org1, orgId1, "Loc 1");
        insertLoc(loc2Org1, orgId1, "Loc 2");

        // Users
        insertUser(staff1Org1, orgId1, loc1Org1, "staff1@test.com", "STAFF");
        insertUser(staff2Org1, orgId1, loc1Org1, "staff2@test.com", "STAFF");

        // Services & Queues
        insertService(service1Loc1, orgId1, loc1Org1, "Service 1");
        insertQueue(queue1Loc1, orgId1, loc1Org1, service1Loc1, "Queue 1");
        
        // Counters
        insertCounter(counter1Loc1, orgId1, loc1Org1, 1, "Counter 1", "ACTIVE", "ONLINE");

        // -- Test Data Generation --
        
        // 1. Completed token (wait 5 mins, service 10 mins, total 15 mins)
        // joined = baseTime, called = +5m, served = +5m, completed = +15m
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T01", "COMPLETED",
                baseTime,
                baseTime.plus(5, ChronoUnit.MINUTES),
                baseTime.plus(5, ChronoUnit.MINUTES),
                baseTime.plus(15, ChronoUnit.MINUTES));

        // 2. Completed token (wait 10 mins, service 20 mins)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T02", "COMPLETED",
                baseTime.plus(1, ChronoUnit.HOURS),
                baseTime.plus(1, ChronoUnit.HOURS).plus(10, ChronoUnit.MINUTES),
                baseTime.plus(1, ChronoUnit.HOURS).plus(10, ChronoUnit.MINUTES),
                baseTime.plus(1, ChronoUnit.HOURS).plus(30, ChronoUnit.MINUTES));

        // 3. No-show token (wait 5 mins, no service time)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T03", "NO_SHOW",
                baseTime.plus(2, ChronoUnit.HOURS),
                baseTime.plus(2, ChronoUnit.HOURS).plus(5, ChronoUnit.MINUTES),
                null,
                null);

        // 4. Cancelled token (no wait/call/serve time)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                null, null, "T04", "CANCELLED",
                baseTime.plus(3, ChronoUnit.HOURS),
                null, null, null);

        // 5. Expired token
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                null, null, "T05", "EXPIRED",
                baseTime.plus(4, ChronoUnit.HOURS),
                null, null, null);

        // 6. Waiting token
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                null, null, "T06", "WAITING",
                baseTime.plus(5, ChronoUnit.HOURS),
                null, null, null);

        // 7. Called token (not yet served)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T07", "CALLED",
                baseTime.plus(6, ChronoUnit.HOURS),
                baseTime.plus(6, ChronoUnit.HOURS).plus(1, ChronoUnit.MINUTES),
                null, null);

        // 8. In service token (served, not completed)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T08", "IN_SERVICE",
                baseTime.plus(7, ChronoUnit.HOURS),
                baseTime.plus(7, ChronoUnit.HOURS).plus(1, ChronoUnit.MINUTES),
                baseTime.plus(7, ChronoUnit.HOURS).plus(2, ChronoUnit.MINUTES),
                null);

        // 9. Null data token: served but missing call (rare anomaly, robust check)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T09", "COMPLETED",
                baseTime.plus(8, ChronoUnit.HOURS),
                null,
                baseTime.plus(8, ChronoUnit.HOURS).plus(1, ChronoUnit.MINUTES),
                baseTime.plus(8, ChronoUnit.HOURS).plus(5, ChronoUnit.MINUTES));

        // 10. Outside date range (for filtering test)
        insertToken(UUID.randomUUID(), orgId1, loc1Org1, queue1Loc1, service1Loc1,
                staff1Org1, counter1Loc1, "T10", "COMPLETED",
                baseTime.minus(400, ChronoUnit.DAYS),
                baseTime.minus(400, ChronoUnit.DAYS).plus(5, ChronoUnit.MINUTES),
                baseTime.minus(400, ChronoUnit.DAYS).plus(5, ChronoUnit.MINUTES),
                baseTime.minus(400, ChronoUnit.DAYS).plus(15, ChronoUnit.MINUTES));

        // 11. Org 2 token (for tenant isolation)
        UUID loc1Org2 = UUID.randomUUID();
        UUID service1Org2 = UUID.randomUUID();
        UUID queue1Org2 = UUID.randomUUID();
        
        insertLoc(loc1Org2, orgId2, "Loc 1 Org 2");
        insertService(service1Org2, orgId2, loc1Org2, "Service 1 Org 2");
        insertQueue(queue1Org2, orgId2, loc1Org2, service1Org2, "Queue 1 Org 2");
        
        insertToken(UUID.randomUUID(), orgId2, loc1Org2, queue1Org2, service1Org2,
                null, null, "T11", "COMPLETED",
                baseTime,
                baseTime.plus(5, ChronoUnit.MINUTES),
                baseTime.plus(5, ChronoUnit.MINUTES),
                baseTime.plus(15, ChronoUnit.MINUTES));
    }

    protected void setAuth(UUID orgId, String role) {
        com.align.qms.security.UserPrincipal principal = org.mockito.Mockito.mock(com.align.qms.security.UserPrincipal.class);
        org.mockito.Mockito.when(principal.getId()).thenReturn(UUID.randomUUID());
        org.mockito.Mockito.when(principal.getOrgId()).thenReturn(orgId);
        org.mockito.Mockito.when(principal.getRole()).thenReturn(com.align.qms.user.UserRole.valueOf(role));
        org.mockito.Mockito.when(principal.getAuthorities()).thenAnswer(i -> 
            java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role)));
        
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    protected void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private void insertOrg(UUID id, String code, String name) {
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", id, code, name);
    }

    private void insertLoc(UUID id, UUID org, String name) {
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", id, org, name);
    }

    private void insertUser(UUID id, UUID org, UUID loc, String email, String role) {
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'hash', 'Name', ?, 'ACTIVE', now(), now())", id, org, loc, email, role);
    }

    private void insertService(UUID id, UUID org, UUID loc, String name) {
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, false, now(), now())", id, loc, org, name);
    }

    private void insertQueue(UUID id, UUID org, UUID loc, UUID svc, String name) {
        jdbcTemplate.update("INSERT INTO queues (id, location_id, org_id, service_id, name, token_prefix, max_capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'T', 10, now(), now())", id, loc, org, svc, name);
    }
    
    private void insertCounter(UUID id, UUID org, UUID loc, Integer num, String name, String status, String avail) {
        jdbcTemplate.update("INSERT INTO counters (id, org_id, location_id, number, name, status, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", id, org, loc, num, name, status, avail);
    }

    private void insertToken(UUID id, UUID org, UUID loc, UUID q, UUID svc, UUID staff, UUID ctr, String tokenNumber, String state, Instant joined, Instant called, Instant served, Instant comp) {
        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, queue_id, service_id, called_by_staff_id, counter_id, token_number, state, joined_at, called_at, served_at, completed_at, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                id, org, loc, q, svc, staff, ctr, tokenNumber, state, 
                joined != null ? java.sql.Timestamp.from(joined) : null, 
                called != null ? java.sql.Timestamp.from(called) : null, 
                served != null ? java.sql.Timestamp.from(served) : null, 
                comp != null ? java.sql.Timestamp.from(comp) : null);
    }
}
