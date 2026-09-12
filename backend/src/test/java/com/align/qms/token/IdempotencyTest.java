package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyTest extends PostgresIntegrationTest {

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

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "A", 100);
        queueRepository.save(queue);
    }

    @Test
    @DisplayName("Idempotency: Same idempotency key returns existing token instead of creating new one")
    void testIdempotentJoin() {
        String idempotencyKey = UUID.randomUUID().toString();
        
        TokenJoinRequest request1 = new TokenJoinRequest();
        request1.setServiceId(serviceId);
        request1.setCustomerName("Test 1");
        request1.setIdempotencyKey(idempotencyKey);
        
        TokenResponse response1 = tokenService.joinQueue(request1);
        assertThat(response1).isNotNull();
        
        TokenJoinRequest request2 = new TokenJoinRequest();
        request2.setServiceId(serviceId);
        request2.setCustomerName("Test 2"); // different name, but same key
        request2.setIdempotencyKey(idempotencyKey);
        
        TokenResponse response2 = tokenService.joinQueue(request2);
        
        // Assert identical tokens are returned
        assertThat(response2.getId()).isEqualTo(response1.getId());
        assertThat(response2.getTokenNumber()).isEqualTo(response1.getTokenNumber());
        assertThat(response2.getCustomerName()).isEqualTo("Test 1"); // Original data is retained
        
        // Ensure only one token was actually inserted
        assertThat(tokenRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Idempotency: 100 concurrent identical requests produce exactly one token and return same result")
    void testConcurrentIdempotentJoin() throws InterruptedException {
        String idempotencyKey = UUID.randomUUID().toString();
        int totalRequests = 100;
        
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(totalRequests);
        java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(totalRequests);
        
        java.util.List<TokenResponse> responses = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
        java.util.List<Exception> exceptions = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
        
        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    
                    TokenJoinRequest request = new TokenJoinRequest();
                    request.setServiceId(serviceId);
                    request.setCustomerName("Concurrent Customer");
                    request.setIdempotencyKey(idempotencyKey);
                    
                    TokenResponse response = tokenService.joinQueue(request);
                    responses.add(response);
                } catch (Exception e) {
                    exceptions.add(e);
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        
        latch.countDown();
        doneLatch.await();
        
        assertThat(exceptions).isEmpty();
        assertThat(responses).hasSize(totalRequests);
        
        UUID firstId = responses.get(0).getId();
        for (TokenResponse response : responses) {
            assertThat(response.getId()).isEqualTo(firstId);
        }
        
        assertThat(tokenRepository.count()).isEqualTo(1);
    }
}
