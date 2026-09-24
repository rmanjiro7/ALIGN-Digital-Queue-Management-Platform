package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterRepository;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class ConcurrentCallNextTest extends PostgresIntegrationTest {

    @Autowired private StaffOperationsService staffOperationsService;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgId;
    private UUID queueId;
    private List<Counter> counters;

    private UUID serviceId;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        counterRepository.deleteAll();
        queueRepository.deleteAll();

        orgId = UUID.randomUUID();
        UUID locationId = UUID.randomUUID();
        serviceId = UUID.randomUUID();

        // Stub parent domain entities
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "A", 100);
        queue = queueRepository.save(queue);
        queueId = queue.getId();

        // Create 10 tokens
        for (int i = 1; i <= 10; i++) {
            Token token = new Token(orgId, locationId, serviceId, queueId, "A" + i, "Customer " + i, null, null);
            org.springframework.test.util.ReflectionTestUtils.setField(token, "joinedAt", Instant.now().plusMillis(i)); // Ensure strict ordering
            tokenRepository.save(token);
        }

        // Create 10 counters
        counters = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            Counter counter = new Counter(orgId, locationId, i, "Counter " + i);
            counter.setAvailability(CounterAvailability.ONLINE);
            counter = counterRepository.save(counter);
            counters.add(counter);
            jdbcTemplate.update("INSERT INTO counter_service_assignments (id, counter_id, service_id, created_at) VALUES (?, ?, ?, now())", UUID.randomUUID(), counter.getId(), serviceId);
        }
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

    private void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Concurrency: 10 counters call next simultaneously; all 10 tokens are assigned correctly without conflicts")
    void testConcurrentCallNext() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<Token> successfulCalls = Collections.synchronizedList(new ArrayList<>());
        List<Exception> exceptions = Collections.synchronizedList(new ArrayList<>());

        UUID staffId = UUID.randomUUID();
        // Insert mock user into DB to satisfy tokens.called_by_staff_id foreign key
        jdbcTemplate.update("INSERT INTO users (id, org_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", 
                staffId, orgId, "staff" + staffId + "@test.com", "hash", "Staff Name", "STAFF", "ACTIVE");
        
        // Setup SecurityContext for all threads
        setContext(orgId, staffId);

        for (int i = 0; i < threadCount; i++) {
            final UUID counterId = counters.get(i).getId();
            executor.submit(() -> {
                // Must set TenantContext in the thread
                setContext(orgId, staffId);
                try {
                    latch.await();
                    Token calledToken = staffOperationsService.callNext(counterId);
                    successfulCalls.add(calledToken);
                } catch (Exception e) {
                    e.printStackTrace();
                    exceptions.add(e);
                } finally {
                    doneLatch.countDown();
                    clearContext();
                }
            });
        }

        // Unleash all threads
        latch.countDown();
        doneLatch.await();
        executor.shutdown();
        clearContext();

        // There should be no exceptions and exactly 10 tokens assigned
        assertThat(exceptions).isEmpty();
        assertThat(successfulCalls).hasSize(10);

        // Every token should have a different token number and assigned to a different counter
        long distinctTokens = successfulCalls.stream().map(Token::getId).distinct().count();
        long distinctCounters = successfulCalls.stream().map(Token::getCounterId).distinct().count();
        
        assertThat(distinctTokens).isEqualTo(10);
        assertThat(distinctCounters).isEqualTo(10);

        // Verify database state
        List<Token> allTokens = tokenRepository.findAll();
        for (Token token : allTokens) {
            assertThat(token.getState()).isEqualTo(TokenState.CALLED);
            assertThat(token.getCounterId()).isNotNull();
            assertThat(token.getCalledAt()).isNotNull();
            assertThat(token.getCalledByStaffId()).isEqualTo(staffId);
        }
        
        List<Counter> allCounters = counterRepository.findAll();
        for (Counter counter : allCounters) {
            assertThat(counter.getCurrentServingTokenId()).isNotNull();
        }
    }
}
