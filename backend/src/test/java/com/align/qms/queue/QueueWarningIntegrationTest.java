package com.align.qms.queue;

import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.event.QueueWarningType;
import com.align.qms.queue.event.QueueWarningTransition;
import com.align.qms.queue.event.QueueWarningEvent;
import com.align.qms.token.Token;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.TokenService;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
@RecordApplicationEvents
public class QueueWarningIntegrationTest extends com.align.qms.PostgresIntegrationTest {

    @Autowired
    private QueueWarningService queueWarningService;

    @Autowired
    private QueueRepository queueRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private ApplicationEvents applicationEvents;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;
    private UUID queueId;

    @BeforeEach
    void setUp() {
        queueRepository.deleteAll();
        serviceRepository.deleteAll();
        organizationRepository.deleteAll();
        tokenRepository.deleteAll();

        orgId = UUID.randomUUID();
        Organization org = new Organization("TEST", "Test Org", "TEST", "test@example.com");
        org = organizationRepository.save(org);
        orgId = org.getId();

        Location loc = new Location(orgId, "Test Loc", null, null, null, null, true);
        loc = locationRepository.save(loc);
        locationId = loc.getId();

        ServiceEntity service = new ServiceEntity(orgId, locationId, "Test Service", null, null, false, null);
        service = serviceRepository.save(service);
        serviceId = service.getId();

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "T", 10);
        queue = queueRepository.save(queue);
        queueId = queue.getId();
    }

    @Test
    @WithMockUser(username = "admin", authorities = "PLATFORM_ADMIN")
    void testCapacityWarningTriggerAndClear() {
        Organization org = organizationRepository.findById(orgId).get();
        org.setCapacityThresholdPercent((short) 50); // Warning at 5 active tokens
        organizationRepository.save(org);

        // Add 4 tokens -> 40% (No warning)
        for (int i = 0; i < 4; i++) {
            TokenJoinRequest req = new TokenJoinRequest();
            req.setServiceId(serviceId);
            tokenService.joinQueue(req);
        }

        Queue q = queueRepository.findById(queueId).get();
        assertThat(q.isCapacityWarningActive()).isFalse();
        assertThat(applicationEvents.stream(QueueWarningEvent.class)).isEmpty();

        // Add 1 token -> 50% (Trigger warning)
        TokenJoinRequest req5 = new TokenJoinRequest();
        req5.setServiceId(serviceId);
        tokenService.joinQueue(req5);

        q = queueRepository.findById(queueId).get();
        assertThat(q.isCapacityWarningActive()).isTrue();

        long triggerCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getWarningType() == QueueWarningType.QUEUE_CAPACITY_WARNING)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.TRIGGERED)
            .count();
        assertThat(triggerCount).isEqualTo(1);

        // Verify WebSocket dispatch
        verify(messagingTemplate, times(1)).convertAndSend(
            eq(String.format("/topic/tenant/%s/location/%s/staff", orgId, locationId)),
            any(com.align.qms.queue.event.QueueWarningPayload.class)
        );

        // Add another token -> 60% (Warning remains, NO NEW EVENT)
        TokenJoinRequest req6 = new TokenJoinRequest();
        req6.setServiceId(serviceId);
        tokenService.joinQueue(req6);

        long newTriggerCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getWarningType() == QueueWarningType.QUEUE_CAPACITY_WARNING)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.TRIGGERED)
            .count();
        assertThat(newTriggerCount).isEqualTo(1); // Still 1

        // Cancel 2 tokens -> 40% (Clear warning)
        Token t1 = tokenRepository.findByQueueIdAndStateOrderByPriorityTimestampAscJoinedAtAsc(queueId, TokenState.WAITING).get(0);
        Token t2 = tokenRepository.findByQueueIdAndStateOrderByPriorityTimestampAscJoinedAtAsc(queueId, TokenState.WAITING).get(1);
        tokenService.cancelToken(t1.getId());
        tokenService.cancelToken(t2.getId());

        q = queueRepository.findById(queueId).get();
        assertThat(q.isCapacityWarningActive()).isFalse();

        long clearCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getWarningType() == QueueWarningType.QUEUE_CAPACITY_WARNING)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.CLEARED)
            .count();
        assertThat(clearCount).isEqualTo(1);
    }

    @Test
    void testConcurrentCapacityEvaluationsDoNotSpamEvents() throws InterruptedException {
        // Force the queue into an arbitrary state just at the threshold boundary
        Organization org = organizationRepository.findById(orgId).get();
        org.setCapacityThresholdPercent((short) 10);
        organizationRepository.save(org);

        Queue q = queueRepository.findById(queueId).get();
        q.setMaxCapacity(100);
        queueRepository.save(q);

        // Create 10 tokens manually directly into the database to bypass application events
        for (int i = 0; i < 10; i++) {
            Token t = new Token(orgId, locationId, serviceId, queueId, "T-" + i, "Name", "Phone", null);
            tokenRepository.save(t);
        }

        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch latch = new CountDownLatch(5);

        for (int i = 0; i < 5; i++) {
            executor.submit(() -> {
                try {
                    queueWarningService.evaluateCapacityWarning(queueId);
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(5, TimeUnit.SECONDS);

        // Due to the atomic transition, only ONE TRIGGERED event should be published
        long triggerCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.TRIGGERED)
            .count();
        assertThat(triggerCount).isEqualTo(1);
    }
}
