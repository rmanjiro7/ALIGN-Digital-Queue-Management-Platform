package com.align.qms.token;

import com.align.qms.counter.CounterRepository;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.location.LocationScheduleService;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.queue.QueueStatus;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.token.event.TokenRealtimeEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class JourneyServiceTest extends com.align.qms.PostgresIntegrationTest {

    @Autowired private JourneyService journeyService;
    @Autowired private JourneyRepository journeyRepository;
    @Autowired private JourneyStageRepository journeyStageRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private LocationRepository locationRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private StaffOperationsService staffOperationsService;
    @Autowired private TokenService tokenService;

    private UUID orgId;
    private UUID locationId;
    private ServiceEntity svc1;
    private ServiceEntity svc2;
    private Queue queue1;
    private Queue queue2;

    @BeforeEach
    void setUp() {
        Organization org = new Organization("JOURNEY_ORG", "Journey Org", "JRN", "journey@test.com");
        org = organizationRepository.saveAndFlush(org);
        orgId = org.getId();

        Location loc1 = new Location(orgId, "Journey Location", null, null, null, null, true);
        loc1 = locationRepository.saveAndFlush(loc1);
        locationId = loc1.getId();

        svc1 = new ServiceEntity(orgId, locationId, "Journey Svc 1", null, null, false, null);
        svc1 = serviceRepository.saveAndFlush(svc1);

        svc2 = new ServiceEntity(orgId, locationId, "Journey Svc 2", null, null, false, null);
        svc2 = serviceRepository.saveAndFlush(svc2);

        queue1 = new Queue(orgId, locationId, svc1.getId(), "Queue 1", "Q1", 100);
        queue1.setStatus(QueueStatus.ACTIVE);
        queue1 = queueRepository.saveAndFlush(queue1);

        queue2 = new Queue(orgId, locationId, svc2.getId(), "Queue 2", "Q2", 100);
        queue2.setStatus(QueueStatus.ACTIVE);
        queue2 = queueRepository.saveAndFlush(queue2);
    }

    @Test
    public void testMultiStageJourneyProgression() {
        // Setup Journey
        Journey journey = new Journey();
        journey.setOrgId(orgId);
        journey.setLocationId(locationId);
        journey.setCustomerName("Test Customer");
        journey.setCustomerPhone("1234");
        journey.setStatus("ACTIVE");
        journey = journeyRepository.saveAndFlush(journey);

        JourneyStage stage1 = new JourneyStage();
        stage1.setJourneyId(journey.getId());
        stage1.setServiceId(svc1.getId());
        stage1.setSequenceOrder(1);
        stage1.setStatus("ACTIVE");
        stage1 = journeyStageRepository.saveAndFlush(stage1);

        JourneyStage stage2 = new JourneyStage();
        stage2.setJourneyId(journey.getId());
        stage2.setServiceId(svc2.getId());
        stage2.setSequenceOrder(2);
        stage2.setStatus("PENDING");
        stage2 = journeyStageRepository.saveAndFlush(stage2);

        // Create initial token
        Token t1 = new Token(orgId, locationId, svc1.getId(), queue1.getId(), "Q1-001", "Test Customer", "1234", null, false);
        t1.setJourneyStageId(stage1.getId());
        t1 = tokenRepository.saveAndFlush(t1);

        // Act: Complete token 1
        t1.transitionTo(TokenState.CALLED);
        t1.transitionTo(TokenState.IN_SERVICE);
        t1.transitionTo(TokenState.COMPLETED);
        t1 = tokenRepository.saveAndFlush(t1);
        
        TokenEvent tokenEvent = new TokenEvent(t1.getId(), TokenEventType.TOKEN_COMPLETED, TokenState.IN_SERVICE, TokenState.COMPLETED, null, null, null, null);
        tokenEvent.setOrgId(orgId);
        
        com.align.qms.token.event.TokenRealtimePayload payload = new com.align.qms.token.event.TokenRealtimePayload(tokenEvent, t1, null);
        TokenRealtimeEvent event = new TokenRealtimeEvent(this, payload);
        journeyService.handleTokenCompleted(event);

        // Assert: Stage 1 Completed, Stage 2 Active, New Token Created
        JourneyStage s1 = journeyStageRepository.findById(stage1.getId()).get();
        JourneyStage s2 = journeyStageRepository.findById(stage2.getId()).get();
        assertThat(s1.getStatus()).isEqualTo("COMPLETED");
        assertThat(s2.getStatus()).isEqualTo("ACTIVE");

        Token updatedT1 = tokenRepository.findById(t1.getId()).get();
        assertThat(updatedT1.getTransferredToTokenId()).isNotNull();

        Token nextToken = tokenRepository.findById(updatedT1.getTransferredToTokenId()).get();
        assertThat(nextToken.getQueueId()).isEqualTo(queue2.getId());
        assertThat(nextToken.getJourneyStageId()).isEqualTo(stage2.getId());
        assertThat(nextToken.getState()).isEqualTo(TokenState.WAITING);
    }

    @Test
    public void testFailedNextStageActivationTargetQueueFull() {
        // Force queue 2 to be unavailable
        queue2.setStatus(QueueStatus.CLOSED);
        queueRepository.saveAndFlush(queue2);

        Journey journey = new Journey();
        journey.setOrgId(orgId);
        journey.setLocationId(locationId);
        journey.setCustomerName("Test Customer");
        journey.setCustomerPhone("1234");
        journey.setStatus("ACTIVE");
        journey = journeyRepository.saveAndFlush(journey);

        JourneyStage stage1 = new JourneyStage();
        stage1.setJourneyId(journey.getId());
        stage1.setServiceId(svc1.getId());
        stage1.setSequenceOrder(1);
        stage1.setStatus("ACTIVE");
        stage1 = journeyStageRepository.saveAndFlush(stage1);

        JourneyStage stage2 = new JourneyStage();
        stage2.setJourneyId(journey.getId());
        stage2.setServiceId(svc2.getId());
        stage2.setSequenceOrder(2);
        stage2.setStatus("PENDING");
        stage2 = journeyStageRepository.saveAndFlush(stage2);

        Token t1 = new Token(orgId, locationId, svc1.getId(), queue1.getId(), "Q1-001", "Test Customer", "1234", null, false);
        t1.setJourneyStageId(stage1.getId());
        t1 = tokenRepository.saveAndFlush(t1);

        t1.transitionTo(TokenState.CALLED);
        t1.transitionTo(TokenState.IN_SERVICE);
        t1.transitionTo(TokenState.COMPLETED);
        t1 = tokenRepository.saveAndFlush(t1);
        
        TokenEvent tokenEvent = new TokenEvent(t1.getId(), TokenEventType.TOKEN_COMPLETED, TokenState.IN_SERVICE, TokenState.COMPLETED, null, null, null, null);
        tokenEvent.setOrgId(orgId);
        
        com.align.qms.token.event.TokenRealtimePayload payload = new com.align.qms.token.event.TokenRealtimePayload(tokenEvent, t1, null);
        TokenRealtimeEvent event = new TokenRealtimeEvent(this, payload);
        journeyService.handleTokenCompleted(event);

        // Assert: Stage 1 is Completed, but Stage 2 remains Pending
        JourneyStage s1 = journeyStageRepository.findById(stage1.getId()).get();
        JourneyStage s2 = journeyStageRepository.findById(stage2.getId()).get();
        assertThat(s1.getStatus()).isEqualTo("COMPLETED");
        assertThat(s2.getStatus()).isEqualTo("PENDING");

        Token updatedT1 = tokenRepository.findById(t1.getId()).get();
        assertThat(updatedT1.getTransferredToTokenId()).isNull(); // No token created
    }
}
