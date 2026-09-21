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
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SkipLockedConcurrencyTest extends PostgresIntegrationTest {

    @Autowired private TokenRepository tokenRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private TransactionTemplate transactionTemplate;

    private UUID orgId;
    private UUID locationId;
    private UUID queueId;
    private List<Token> createdTokens;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM counter_service_assignments");
        tokenRepository.deleteAll();
        counterRepository.deleteAll();
        queueRepository.deleteAll();

        orgId = UUID.randomUUID();
        locationId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();

        // Stub parent domain entities
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "A", 100);
        queue = queueRepository.save(queue);
        queueId = queue.getId();

        // Insert 10 tokens
        createdTokens = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            Token token = new Token(orgId, locationId, serviceId, queueId, "A" + i, "Customer " + i, null, null);
            token.setJoinedAt(Instant.now().plusMillis(i)); // Ensure strict ordering
            createdTokens.add(tokenRepository.save(token));
        }
    }

    @Test
    @DisplayName("Concurrency: SKIP LOCKED skips the first token locked by an active transaction")
    void testSkipLocked() throws InterruptedException {
        CountDownLatch tx1Ready = new CountDownLatch(1);
        CountDownLatch tx2Ready = new CountDownLatch(1);
        CountDownLatch finishTx1 = new CountDownLatch(1);

        ExecutorService executor = Executors.newFixedThreadPool(2);

        List<Token> tx1Result = Collections.synchronizedList(new ArrayList<>());
        List<Token> tx2Result = Collections.synchronizedList(new ArrayList<>());
        List<Exception> exceptions = Collections.synchronizedList(new ArrayList<>());

        // Thread 1: Acquire lock on the first token and hold it
        executor.submit(() -> {
            try {
                transactionTemplate.execute(status -> {
                    Token t1 = tokenRepository.findNextWaitingTokenWithLock(locationId).orElse(null);
                    if (t1 != null) {
                        tx1Result.add(t1);
                    }
                    tx1Ready.countDown();
                    try {
                        // Wait for Thread 2 to finish executing its query
                        finishTx1.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return null;
                });
            } catch (Exception e) {
                exceptions.add(e);
            }
        });

        // Thread 2: Start after Thread 1 acquires lock, and attempt to fetch next token
        executor.submit(() -> {
            try {
                tx1Ready.await(5, TimeUnit.SECONDS); // Wait for T1 to hold the lock
                
                transactionTemplate.execute(status -> {
                    Token t2 = tokenRepository.findNextWaitingTokenWithLock(locationId).orElse(null);
                    if (t2 != null) {
                        tx2Result.add(t2);
                    }
                    tx2Ready.countDown();
                    return null;
                });
                
            } catch (Exception e) {
                exceptions.add(e);
            } finally {
                // Now T1 can commit and release the lock
                finishTx1.countDown();
            }
        });

        boolean finished = tx2Ready.await(10, TimeUnit.SECONDS);
        assertThat(finished).isTrue();
        executor.shutdown();

        assertThat(exceptions).isEmpty();
        
        // T1 should get the first token in the queue
        assertThat(tx1Result).hasSize(1);
        Token t1 = tx1Result.get(0);
        assertThat(t1.getTokenNumber()).isEqualTo("A1");
        
        // T2 should SKIP the locked first token and get the SECOND token immediately without blocking
        assertThat(tx2Result).hasSize(1);
        Token t2 = tx2Result.get(0);
        assertThat(t2.getTokenNumber()).isEqualTo("A2");
    }
}
