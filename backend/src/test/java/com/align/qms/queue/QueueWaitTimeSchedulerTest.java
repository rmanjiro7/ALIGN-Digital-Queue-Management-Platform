package com.align.qms.queue;

import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.event.QueueWarningEvent;
import com.align.qms.queue.event.QueueWarningTransition;
import com.align.qms.queue.event.QueueWarningType;
import com.align.qms.token.Token;
import com.align.qms.token.TokenRepository;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
@RecordApplicationEvents
public class QueueWaitTimeSchedulerTest extends com.align.qms.PostgresIntegrationTest {

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
        Organization org = new Organization("TEST2", "Test Org 2", "TEST2", "test2@example.com");
        org = organizationRepository.save(org);
        orgId = org.getId();

        Location loc = new Location(orgId, "Test Loc 2", null, null, null, null, true);
        loc = locationRepository.save(loc);
        locationId = loc.getId();

        ServiceEntity service = new ServiceEntity(orgId, locationId, "Test Service 2", null, null, false, null);
        service = serviceRepository.save(service);
        serviceId = service.getId();

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue 2", "W", 10);
        queue = queueRepository.save(queue);
        queueId = queue.getId();
    }

    @Test
    void testWaitWarningEvaluatedCorrectly() {
        Organization org = organizationRepository.findById(orgId).get();
        org.setMaxWaitThresholdMins(5); // Warning at 5 mins
        organizationRepository.save(org);

        // Add a token that joined 4 mins ago (No warning)
        Token t = new Token(orgId, locationId, serviceId, queueId, "W-1", "Name", "Phone", null, false);
        ReflectionTestUtils.setField(t, "joinedAt", Instant.now().minus(4, ChronoUnit.MINUTES));
        tokenRepository.save(t);

        queueWarningService.evaluateWaitTimeWarnings();

        Queue q = queueRepository.findById(queueId).get();
        assertThat(q.isWaitWarningActive()).isFalse();

        // Add a new token that is 7 mins old (Trigger warning)
        Token t2 = new Token(orgId, locationId, serviceId, queueId, "W-2", "Name2", "Phone2", null, false);
        ReflectionTestUtils.setField(t2, "joinedAt", Instant.now().minus(7, ChronoUnit.MINUTES));
        tokenRepository.save(t2);

        queueWarningService.evaluateWaitTimeWarnings();

        q = queueRepository.findById(queueId).get();
        assertThat(q.isWaitWarningActive()).isTrue();

        long triggerCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getWarningType() == QueueWarningType.QUEUE_WAIT_WARNING)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.TRIGGERED)
            .count();
        assertThat(triggerCount).isEqualTo(1);

        verify(messagingTemplate, times(1)).convertAndSend(
            eq(String.format("/topic/tenant/%s/location/%s/staff", orgId, locationId)),
            any(com.align.qms.queue.event.QueueWarningPayload.class)
        );

        // Disable warning rule (Wait threshold 0)
        org.setMaxWaitThresholdMins(0);
        organizationRepository.save(org);

        // This will be triggered either by the scheduled task or by the OrganizationRulesUpdatedEvent
        // We'll call the scheduler explicitly here
        queueWarningService.evaluateWaitTimeWarnings();

        q = queueRepository.findById(queueId).get();
        assertThat(q.isWaitWarningActive()).isFalse();

        long clearCount = applicationEvents.stream(QueueWarningEvent.class)
            .filter(e -> e.getPayload().getWarningType() == QueueWarningType.QUEUE_WAIT_WARNING)
            .filter(e -> e.getPayload().getTransition() == QueueWarningTransition.CLEARED)
            .count();
        assertThat(clearCount).isEqualTo(1);
    }
}
