package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenResponse;
import com.align.qms.token.event.TokenRealtimeEvent;
import com.align.qms.token.event.TokenRealtimePayload;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.mockito.Mockito;
import org.mockito.ArgumentCaptor;

@Import({TokenRealtimeIntegrationTest.TestConfig.class, TokenRealtimeIntegrationTest.RollbackTestConfig.class})
public class TokenRealtimeIntegrationTest extends PostgresIntegrationTest {

    @Autowired private TokenService tokenService;
    @Autowired private StaffOperationsService staffOperationsService;
    @Autowired private QueueRepository queueRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private TokenEventRepository tokenEventRepository;
    @Autowired private RollbackTestService rollbackTestService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private ApplicationEventPublisher eventPublisher;
    @Autowired private TestRealtimeListener realtimeListener;
    
    @MockBean private SimpMessagingTemplate messagingTemplate;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;
    private UUID queueId;
    private UUID counterId;

    @TestConfiguration
    static class TestConfig {
        @Bean
        public TestRealtimeListener testRealtimeListener() {
            return new TestRealtimeListener();
        }
    }

    @TestConfiguration
    static class RollbackTestConfig {
        @Bean
        public RollbackTestService rollbackTestService(TokenRepository tr, com.align.qms.token.TokenEventService tes) {
            return new RollbackTestService(tr, tes);
        }
    }

    static class RollbackTestService {
        private final TokenRepository tr;
        private final com.align.qms.token.TokenEventService tes;

        public RollbackTestService(TokenRepository tr, com.align.qms.token.TokenEventService tes) {
            this.tr = tr;
            this.tes = tes;
        }

        @org.springframework.transaction.annotation.Transactional
        public void simulateRollback(Token token) {
            token.setCalledAt(java.time.Instant.now());
            tr.save(token);
            tes.recordEvent(token, TokenEventType.TOKEN_CALLED, null, null);
            throw new RuntimeException("Force rollback");
        }
    }

    public static class TestRealtimeListener {
        private final List<TokenRealtimeEvent> events = new CopyOnWriteArrayList<>();

        @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
        public void handle(TokenRealtimeEvent event) {
            events.add(event);
        }

        public List<TokenRealtimeEvent> getEvents() {
            return events;
        }

        public void clear() {
            events.clear();
        }
    }

    @BeforeEach
    void setUp() {
        tokenEventRepository.deleteAll();
        tokenRepository.deleteAll();
        queueRepository.deleteAll();
        realtimeListener.clear();
        Mockito.reset(messagingTemplate);

        orgId = UUID.randomUUID();
        locationId = UUID.randomUUID();
        serviceId = UUID.randomUUID();
        counterId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        String testEmail = UUID.randomUUID().toString() + "@align.com";
        jdbcTemplate.update("INSERT INTO users (id, org_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", userId, orgId, testEmail, "hash", "Test Staff", "STAFF", "ACTIVE");

        com.align.qms.user.User user = new com.align.qms.user.User(orgId, testEmail, "hash", "Test Staff", com.align.qms.user.UserRole.STAFF, locationId);
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(user);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);
        jdbcTemplate.update("INSERT INTO counters (id, org_id, location_id, name, number, status, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", counterId, orgId, locationId, "Counter 1", 1, "ACTIVE", "ONLINE");
        jdbcTemplate.update("INSERT INTO counter_service_assignments (id, counter_id, service_id, created_at) VALUES (?, ?, ?, now())", UUID.randomUUID(), counterId, serviceId);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "B", 10);
        queue = queueRepository.save(queue);
        queueId = queue.getId();
    }

    @Test
    void callNext_PublishesEventAfterCommit() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse token = tokenService.joinQueue(joinReq);
        
        realtimeListener.clear(); // clear JOIN event
        Mockito.reset(messagingTemplate);

        Token called = staffOperationsService.callNext(counterId);

        // Verify AFTER_COMMIT fired and template was called
        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<TokenRealtimePayload> payloadCaptor = ArgumentCaptor.forClass(TokenRealtimePayload.class);
        
        Mockito.verify(messagingTemplate, Mockito.timeout(1000).times(4))
                .convertAndSend(destinationCaptor.capture(), payloadCaptor.capture());
        
        List<String> destinations = destinationCaptor.getAllValues();
        List<TokenRealtimePayload> payloads = payloadCaptor.getAllValues();
        
        assertThat(destinations).containsExactlyInAnyOrder(
            "/topic/location." + locationId,
            String.format("/topic/tenant/%s/location/%s/public", orgId, locationId),
            String.format("/topic/tenant/%s/location/%s/staff", orgId, locationId),
            String.format("/topic/token/%s", called.getId())
        );
        
        // All payloads should be identical
        TokenRealtimePayload payload = payloads.get(0);
        for (TokenRealtimePayload p : payloads) {
            assertThat(p).isEqualTo(payload);
        }
        
        assertThat(payload.getEventType()).isEqualTo(TokenEventType.TOKEN_CALLED);
        assertThat(payload.getLocationId()).isEqualTo(locationId);
        assertThat(payload.getTokenId()).isEqualTo(called.getId());
        assertThat(payload.getCounterNumber()).isEqualTo(1);
    }

    @Test
    void startService_PublishesEventAfterCommit() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse tokenResp = tokenService.joinQueue(joinReq);
        Token token = staffOperationsService.callNext(counterId);

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);
        
        Token serving = staffOperationsService.startService(token.getId(), counterId);

        ArgumentCaptor<TokenRealtimePayload> payloadCaptor = ArgumentCaptor.forClass(TokenRealtimePayload.class);
        Mockito.verify(messagingTemplate, Mockito.timeout(1000)).convertAndSend(Mockito.eq("/topic/location." + locationId), payloadCaptor.capture());
        
        assertThat(payloadCaptor.getValue().getEventType()).isEqualTo(TokenEventType.TOKEN_SERVING_STARTED);
    }

    @Test
    void complete_PublishesEventAfterCommit() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse tokenResp = tokenService.joinQueue(joinReq);
        Token token = staffOperationsService.callNext(counterId);
        token = staffOperationsService.startService(token.getId(), counterId);

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);
        
        Token completed = staffOperationsService.completeService(token.getId(), counterId);

        ArgumentCaptor<TokenRealtimePayload> payloadCaptor = ArgumentCaptor.forClass(TokenRealtimePayload.class);
        Mockito.verify(messagingTemplate, Mockito.timeout(1000)).convertAndSend(Mockito.eq("/topic/location." + locationId), payloadCaptor.capture());
        
        assertThat(payloadCaptor.getValue().getEventType()).isEqualTo(TokenEventType.TOKEN_COMPLETED);
    }

    @Test
    void noShow_PublishesEventAfterCommit() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse tokenResp = tokenService.joinQueue(joinReq);
        Token token = staffOperationsService.callNext(counterId);

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);
        
        Token noShow = staffOperationsService.noShow(token.getId(), counterId);

        ArgumentCaptor<TokenRealtimePayload> payloadCaptor = ArgumentCaptor.forClass(TokenRealtimePayload.class);
        Mockito.verify(messagingTemplate, Mockito.timeout(1000)).convertAndSend(Mockito.eq("/topic/location." + locationId), payloadCaptor.capture());
        
        assertThat(payloadCaptor.getValue().getEventType()).isEqualTo(TokenEventType.TOKEN_NO_SHOW);
    }

    @Test
    void recall_PublishesEventAfterCommit() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse tokenResp = tokenService.joinQueue(joinReq);
        Token token = staffOperationsService.callNext(counterId);

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);
        
        Token recalled = staffOperationsService.recall(token.getId(), counterId);

        ArgumentCaptor<TokenRealtimePayload> payloadCaptor = ArgumentCaptor.forClass(TokenRealtimePayload.class);
        Mockito.verify(messagingTemplate, Mockito.timeout(1000)).convertAndSend(Mockito.eq("/topic/location." + locationId), payloadCaptor.capture());
        
        assertThat(payloadCaptor.getValue().getEventType()).isEqualTo(TokenEventType.TOKEN_RECALLED);
    }

    @Test
    void concurrentCallNext_PublishesSeparateEvents() throws InterruptedException {
        // Create a second counter for concurrency
        UUID counterId2 = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO counters (id, org_id, location_id, name, number, status, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())", counterId2, orgId, locationId, "Counter 2", 2, "ACTIVE", "ONLINE");
        jdbcTemplate.update("INSERT INTO counter_service_assignments (id, counter_id, service_id, created_at) VALUES (?, ?, ?, now())", UUID.randomUUID(), counterId2, serviceId);

        // Create 2 tokens
        TokenJoinRequest joinReq1 = new TokenJoinRequest();
        joinReq1.setServiceId(serviceId);
        tokenService.joinQueue(joinReq1);
        
        TokenJoinRequest joinReq2 = new TokenJoinRequest();
        joinReq2.setServiceId(serviceId);
        tokenService.joinQueue(joinReq2);

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);

        CountDownLatch latch = new CountDownLatch(2);
        
        org.springframework.security.core.Authentication currentAuth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        Runnable task1 = () -> {
            try {
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(currentAuth);
                staffOperationsService.callNext(counterId);
            } catch (Exception e) {
            } finally {
                org.springframework.security.core.context.SecurityContextHolder.clearContext();
                latch.countDown();
            }
        };

        Runnable task2 = () -> {
            try {
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(currentAuth);
                staffOperationsService.callNext(counterId2);
            } catch (Exception e) {
            } finally {
                org.springframework.security.core.context.SecurityContextHolder.clearContext();
                latch.countDown();
            }
        };

        Thread t1 = new Thread(task1);
        Thread t2 = new Thread(task2);
        t1.start();
        t2.start();

        latch.await(5, TimeUnit.SECONDS);

        Mockito.verify(messagingTemplate, Mockito.timeout(2000).times(2))
               .convertAndSend(Mockito.eq("/topic/location." + locationId), Mockito.any(TokenRealtimePayload.class));
    }

    @Test
    void testRollback_DoesNotPublishEvent() {
        TokenJoinRequest joinReq = new TokenJoinRequest();
        joinReq.setServiceId(serviceId);
        TokenResponse tokenResp = tokenService.joinQueue(joinReq);
        Token token = tokenRepository.findById(tokenResp.getId()).get();

        realtimeListener.clear();
        Mockito.reset(messagingTemplate);

        try {
            rollbackTestService.simulateRollback(token);
        } catch (RuntimeException e) {
            // expected
        }

        // Verify AFTER_COMMIT did not fire because transaction rolled back
        Mockito.verify(messagingTemplate, Mockito.after(1000).never())
               .convertAndSend(Mockito.anyString(), Mockito.any(TokenRealtimePayload.class));
    }
}
