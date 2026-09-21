package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterRepository;
import com.align.qms.counter.CounterServiceAssignment;
import com.align.qms.counter.CounterServiceAssignmentRepository;
import com.align.qms.exception.NoWaitingTokensException;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CallNextRoutingIntegrationTest extends PostgresIntegrationTest {

    @Autowired private StaffOperationsService staffOperationsService;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private CounterServiceAssignmentRepository assignmentRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceAId;
    private UUID serviceBId;
    private UUID staffId;

    private Counter counter1;
    private Counter counter2;
    private Queue queueA;
    private Queue queueB;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        assignmentRepository.deleteAll();
        counterRepository.deleteAll();
        queueRepository.deleteAll();

        orgId = UUID.randomUUID();
        locationId = UUID.randomUUID();
        serviceAId = UUID.randomUUID();
        serviceBId = UUID.randomUUID();
        staffId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Routing Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Routing Loc");
        jdbcTemplate.update("INSERT INTO users (id, org_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", staffId, orgId, staffId.toString().substring(0,8) + "@test.com", "pass", "Staff", "STAFF", "ACTIVE");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceAId, locationId, orgId, "Service A", false);
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceBId, locationId, orgId, "Service B", false);

        queueA = queueRepository.save(new Queue(orgId, locationId, serviceAId, "Queue A", "A", 100));
        queueB = queueRepository.save(new Queue(orgId, locationId, serviceBId, "Queue B", "B", 100));

        counter1 = counterRepository.save(createOnlineCounter(1, "Counter 1"));
        counter2 = counterRepository.save(createOnlineCounter(2, "Counter 2"));

        setContext(orgId, staffId);
    }

    private Counter createOnlineCounter(int number, String name) {
        Counter c = new Counter(orgId, locationId, number, name);
        c.setAvailability(CounterAvailability.ONLINE);
        return c;
    }

    private void setContext(UUID orgId, UUID staffId) {
        com.align.qms.security.UserPrincipal principal = org.mockito.Mockito.mock(com.align.qms.security.UserPrincipal.class);
        org.mockito.Mockito.when(principal.getId()).thenReturn(staffId);
        org.mockito.Mockito.when(principal.getOrgId()).thenReturn(orgId);
        org.mockito.Mockito.when(principal.getRole()).thenReturn(com.align.qms.user.UserRole.STAFF);
        org.mockito.Mockito.when(principal.getAuthorities()).thenReturn((java.util.Collection) List.of(new SimpleGrantedAuthority("ROLE_STAFF")));
        
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @Test
    @DisplayName("Routing: Counter with 0 assignments throws NoWaitingTokensException")
    void zeroAssignments() {
        createToken(serviceAId, queueA, "A1", Instant.now().minus(10, ChronoUnit.MINUTES));

        // Counter 1 has no assignments
        assertThatThrownBy(() -> staffOperationsService.callNext(counter1.getId()))
                .isInstanceOf(NoWaitingTokensException.class);
    }

    @Test
    @DisplayName("Routing: Counter selects only from assigned service")
    void assignedServiceOnly() {
        assignmentRepository.save(new CounterServiceAssignment(counter1.getId(), serviceAId));

        createToken(serviceBId, queueB, "B1", Instant.now().minus(15, ChronoUnit.MINUTES));
        Token tokenA = createToken(serviceAId, queueA, "A1", Instant.now().minus(10, ChronoUnit.MINUTES));

        // Token B is older, but Counter 1 is only assigned to Service A
        Token called = staffOperationsService.callNext(counter1.getId());
        assertThat(called.getId()).isEqualTo(tokenA.getId());
        assertThat(called.getState()).isEqualTo(TokenState.CALLED);
    }

    @Test
    @DisplayName("Routing: Counter selects oldest token across multiple assigned services")
    void multipleAssignedServices() {
        assignmentRepository.save(new CounterServiceAssignment(counter1.getId(), serviceAId));
        assignmentRepository.save(new CounterServiceAssignment(counter1.getId(), serviceBId));

        Token tokenA = createToken(serviceAId, queueA, "A1", Instant.now().minus(10, ChronoUnit.MINUTES));
        Token tokenB = createToken(serviceBId, queueB, "B1", Instant.now().minus(15, ChronoUnit.MINUTES));
        Token tokenB2 = createToken(serviceBId, queueB, "B2", Instant.now().minus(5, ChronoUnit.MINUTES));

        // Token B1 is the oldest among all assigned services
        Token called1 = staffOperationsService.callNext(counter1.getId());
        assertThat(called1.getId()).isEqualTo(tokenB.getId());

        // Refresh counter serving state since callNext mutates it
        clearServingState(counter1.getId());

        // Token A1 is the next oldest
        Token called2 = staffOperationsService.callNext(counter1.getId());
        assertThat(called2.getId()).isEqualTo(tokenA.getId());
    }

    @Test
    @DisplayName("Routing: Concurrent callNext on shared service safely claims distinct tokens")
    void concurrentSharedService() throws Exception {
        assignmentRepository.save(new CounterServiceAssignment(counter1.getId(), serviceAId));
        assignmentRepository.save(new CounterServiceAssignment(counter2.getId(), serviceAId));

        Token tokenA1 = createToken(serviceAId, queueA, "A1", Instant.now().minus(10, ChronoUnit.MINUTES));
        Token tokenA2 = createToken(serviceAId, queueA, "A2", Instant.now().minus(9, ChronoUnit.MINUTES));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        Future<Token> future1 = executor.submit(() -> {
            latch.await();
            setContext(orgId, staffId); // Thread-local context for security
            return staffOperationsService.callNext(counter1.getId());
        });

        Future<Token> future2 = executor.submit(() -> {
            latch.await();
            setContext(orgId, staffId); // Thread-local context for security
            return staffOperationsService.callNext(counter2.getId());
        });

        latch.countDown();
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        Token called1 = future1.get();
        Token called2 = future2.get();

        assertThat(called1.getId()).isNotEqualTo(called2.getId());
        assertThat(List.of(called1.getId(), called2.getId()))
                .containsExactlyInAnyOrder(tokenA1.getId(), tokenA2.getId());
    }

    @Test
    @DisplayName("Routing: Location Isolation prevents calling tokens from other locations")
    void locationIsolation() {
        assignmentRepository.save(new CounterServiceAssignment(counter1.getId(), serviceAId));

        UUID loc2Id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", loc2Id, orgId, "Loc 2");

        Token tokenLoc2 = createToken(serviceAId, queueA, "A1", Instant.now().minus(10, ChronoUnit.MINUTES));
        // Manually override the token's location to Loc 2
        jdbcTemplate.update("UPDATE tokens SET location_id = ? WHERE id = ?", loc2Id, tokenLoc2.getId());

        // Even though Service A is assigned, the token is at a different location
        assertThatThrownBy(() -> staffOperationsService.callNext(counter1.getId()))
                .isInstanceOf(NoWaitingTokensException.class);
    }

    private Token createToken(UUID serviceId, Queue queue, String tokenNumber, Instant joinedAt) {
        Token t = new Token(orgId, locationId, serviceId, queue.getId(), tokenNumber, "Cust " + tokenNumber, null, null);
        t.setJoinedAt(joinedAt);
        return tokenRepository.save(t);
    }

    private void clearServingState(UUID counterId) {
        Counter c = counterRepository.findById(counterId).orElseThrow();
        c.setCurrentServingTokenId(null);
        counterRepository.save(c);
    }
}
