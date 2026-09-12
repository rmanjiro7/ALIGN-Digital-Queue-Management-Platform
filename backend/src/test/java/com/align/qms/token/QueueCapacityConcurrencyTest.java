package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.exception.QueueFullException;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.token.dto.TokenJoinRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class QueueCapacityConcurrencyTest extends PostgresIntegrationTest {

    @Autowired private TokenService tokenService;
    @Autowired private QueueRepository queueRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        queueRepository.deleteAll();
        
        orgId = UUID.randomUUID();
        locationId = UUID.randomUUID();
        serviceId = UUID.randomUUID();

        // Stub parent domain entities to satisfy foreign key constraints
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "A", 10);
        queueRepository.save(queue);
    }

    @Test
    @DisplayName("Concurrency: EXACTLY 10 requests succeed when capacity is 10 and 100 concurrent requests arrive")
    void testQueueCapacityConcurrency() throws InterruptedException {
        int totalRequests = 100;
        int maxCapacity = 10;
        
        ExecutorService executor = Executors.newFixedThreadPool(totalRequests);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalRequests);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        List<Exception> otherExceptions = Collections.synchronizedList(new ArrayList<>());
        List<com.align.qms.token.dto.TokenResponse> successfulTokens = Collections.synchronizedList(new ArrayList<>());
        
        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    
                    TokenJoinRequest request = new TokenJoinRequest();
                    request.setServiceId(serviceId);
                    request.setCustomerName("Test Customer");
                    
                    com.align.qms.token.dto.TokenResponse token = tokenService.joinQueue(request);
                    successfulTokens.add(token);
                    successCount.incrementAndGet();
                } catch (QueueFullException e) {
                    failCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                    otherExceptions.add(e);
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        
        // Unleash all threads
        latch.countDown();
        doneLatch.await();
        
        assertThat(otherExceptions).isEmpty();
        assertThat(successCount.get()).isEqualTo(maxCapacity);
        assertThat(failCount.get()).isEqualTo(totalRequests - maxCapacity);
        
        long count = tokenRepository.count();
        assertThat(count).isEqualTo(maxCapacity);
        
        // 6. Verify there are no duplicate token numbers.
        long distinctTokenNumbers = successfulTokens.stream()
                .map(com.align.qms.token.dto.TokenResponse::getTokenNumber)
                .distinct()
                .count();
        assertThat(distinctTokenNumbers).isEqualTo(maxCapacity);
        
        // 7. Verify queues.next_token_number remains consistent with the number of successfully issued tokens.
        Queue updatedQueue = queueRepository.findByServiceId(serviceId).orElseThrow();
        // Since capacity was 10, next_token_number should have been incremented exactly 10 times.
        // Assuming it starts at 1, after 10 successful tokens, it should be 11.
        assertThat(updatedQueue.getNextTokenNumber()).isEqualTo(11);
    }
}
