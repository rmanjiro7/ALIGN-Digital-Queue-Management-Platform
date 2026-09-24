package com.align.qms.token;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.CounterRepository;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.queue.QueueStatus;
import com.align.qms.security.JwtService;
import com.align.qms.token.dto.TokenTransferRequest;
import com.align.qms.token.dto.TokenResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TokenTransferIntegrationTest extends com.align.qms.PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QueueRepository queueRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private CounterRepository counterRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private com.align.qms.user.UserRepository userRepository;

    private UUID orgId;
    private UUID locationId;
    private UUID locationId2;
    private Queue sourceQueue;
    private Queue targetQueue;
    private Queue otherLocationQueue;
    private String staffToken;
    private String otherLocationStaffToken;

    @BeforeEach
    void setUp() {
        Organization org = new Organization("TEST_ORG", "Test Organization", "TEST", "test@example.com");
        org = organizationRepository.saveAndFlush(org);
        orgId = org.getId();

        Location loc1 = new Location(orgId, "Location 1", null, null, null, null, true);
        loc1 = locationRepository.saveAndFlush(loc1);
        locationId = loc1.getId();

        Location loc2 = new Location(orgId, "Location 2", null, null, null, null, true);
        loc2 = locationRepository.saveAndFlush(loc2);
        locationId2 = loc2.getId();

        ServiceEntity svc1 = new ServiceEntity(orgId, locationId, "Service 1", null, null, false, null);
        svc1 = serviceRepository.saveAndFlush(svc1);

        ServiceEntity svc2 = new ServiceEntity(orgId, locationId, "Service 2", null, null, false, null);
        svc2 = serviceRepository.saveAndFlush(svc2);

        ServiceEntity svc3 = new ServiceEntity(orgId, locationId2, "Service 3", null, null, false, null);
        svc3 = serviceRepository.saveAndFlush(svc3);

        sourceQueue = new Queue(orgId, locationId, svc1.getId(), "Source Queue", "SRC", 100);
        sourceQueue.setStatus(QueueStatus.ACTIVE);
        sourceQueue = queueRepository.saveAndFlush(sourceQueue);

        targetQueue = new Queue(orgId, locationId, svc2.getId(), "Target Queue", "TGT", 5);
        targetQueue.setStatus(QueueStatus.ACTIVE);
        targetQueue = queueRepository.saveAndFlush(targetQueue);

        otherLocationQueue = new Queue(orgId, locationId2, svc3.getId(), "Other Location Queue", "OTH", 100);
        otherLocationQueue.setStatus(QueueStatus.ACTIVE);
        otherLocationQueue = queueRepository.saveAndFlush(otherLocationQueue);

        com.align.qms.user.User staff = new com.align.qms.user.User(orgId, "staff1@example.com", "hash", "Staff 1", com.align.qms.user.UserRole.STAFF, locationId);
        staff = userRepository.saveAndFlush(staff);
        staffToken = jwtService.generateAccessToken(staff);

        com.align.qms.user.User otherStaff = new com.align.qms.user.User(orgId, "staff2@example.com", "hash", "Staff 2", com.align.qms.user.UserRole.STAFF, locationId2);
        otherStaff = userRepository.saveAndFlush(otherStaff);
        otherLocationStaffToken = jwtService.generateAccessToken(otherStaff);
    }

    private Token createWaitingToken(Queue queue) {
        Token token = new Token(
                queue.getOrgId(),
                queue.getLocationId(),
                queue.getServiceId(),
                queue.getId(),
                queue.getTokenPrefix() + "-" + java.util.UUID.randomUUID().toString().substring(0, 4),
                "John Doe",
                "555-1234",
                null
        );
        return tokenRepository.saveAndFlush(token);
    }

    @Test
    void shouldTransferWaitingToken() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        TokenTransferRequest request = new TokenTransferRequest(targetQueue.getServiceId(), null);

        MvcResult result = mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        TokenResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), TokenResponse.class);

        assertThat(response.getQueueId()).isEqualTo(targetQueue.getId());
        assertThat(response.getState()).isEqualTo(TokenState.WAITING);

        Token updatedOldToken = tokenRepository.findById(oldToken.getId()).orElseThrow();
        assertThat(updatedOldToken.getState()).isEqualTo(TokenState.TRANSFERRED);
        assertThat(updatedOldToken.getTransferredToTokenId()).isEqualTo(response.getId());

        Token newToken = tokenRepository.findById(response.getId()).orElseThrow();
        assertThat(newToken.getPriorityTimestamp()).isEqualTo(oldToken.getJoinedAt()); // Uses old token's joinedAt
    }

    @Test
    void shouldTransferCalledTokenAndClearCounter() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);
        oldToken.transitionTo(TokenState.CALLED);

        Counter counter = new Counter(orgId, locationId, 1, "Counter 1");
        counter.setCurrentServingTokenId(oldToken.getId());
        counter = counterRepository.saveAndFlush(counter);

        oldToken.setCounterId(counter.getId());
        oldToken = tokenRepository.saveAndFlush(oldToken);

        TokenTransferRequest request = new TokenTransferRequest(targetQueue.getServiceId(), null);

        mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        Counter updatedCounter = counterRepository.findById(counter.getId()).orElseThrow();
        assertThat(updatedCounter.getCurrentServingTokenId()).isNull();
    }

    @Test
    void shouldFailTransferCrossLocation() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        TokenTransferRequest request = new TokenTransferRequest(otherLocationQueue.getServiceId(), null);

        mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRespectTargetQueueCapacity() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        // Fill target queue
        for (int i = 0; i < 5; i++) {
            createWaitingToken(targetQueue);
        }

        TokenTransferRequest request = new TokenTransferRequest(targetQueue.getServiceId(), null);

        mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldIdempotentlyTransfer() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        TokenTransferRequest request = new TokenTransferRequest(targetQueue.getServiceId(), "my-idemp-key");

        MvcResult result1 = mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();
        TokenResponse response1 = objectMapper.readValue(result1.getResponse().getContentAsString(), TokenResponse.class);

        // Call again
        MvcResult result2 = mockMvc.perform(post("/api/v1/tokens/{id}/transfer", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();
        TokenResponse response2 = objectMapper.readValue(result2.getResponse().getContentAsString(), TokenResponse.class);

        assertThat(response1.getId()).isEqualTo(response2.getId());
    }

    @Test
    // Create token as CUSTOMER
    void shouldRecoverTransferredTokenAsCustomer() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        // Transfer manually
        Token newToken = new Token(
                targetQueue.getOrgId(),
                targetQueue.getLocationId(),
                targetQueue.getServiceId(),
                targetQueue.getId(),
                "TGT-" + java.util.UUID.randomUUID().toString().substring(0, 4),
                oldToken.getCustomerName(),
                oldToken.getCustomerPhone(),
                null
        );
        newToken = tokenRepository.saveAndFlush(newToken);

        oldToken.transitionTo(TokenState.TRANSFERRED);
        oldToken.setTransferredToTokenId(newToken.getId());
        tokenRepository.saveAndFlush(oldToken);

        String oldTokenJwt = jwtService.generateCustomerRealtimeToken(oldToken);

        MvcResult result = mockMvc.perform(get("/api/v1/tokens/{id}/transfer-recovery", oldToken.getId())
                .header("Authorization", "Bearer " + oldTokenJwt))
                .andExpect(status().isOk())
                .andReturn();

        TokenResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), TokenResponse.class);
        assertThat(response.getId()).isEqualTo(newToken.getId());
        assertThat(response.getRealtimeToken()).isNotNull();
    }

    @Test
    void shouldDenyRecoveryForAnonymousCaller() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);

        mockMvc.perform(get("/api/v1/tokens/{id}/transfer-recovery", oldToken.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldDenyRecoveryForDifferentCustomerToken() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);
        Token differentToken = createWaitingToken(sourceQueue);
        Token targetToken = createWaitingToken(targetQueue);

        oldToken.transitionTo(TokenState.TRANSFERRED);
        oldToken.setTransferredToTokenId(targetToken.getId());
        tokenRepository.saveAndFlush(oldToken);

        String differentTokenJwt = jwtService.generateCustomerRealtimeToken(differentToken);

        mockMvc.perform(get("/api/v1/tokens/{id}/transfer-recovery", oldToken.getId())
                .header("Authorization", "Bearer " + differentTokenJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldDenyRecoveryForStaff() throws Exception {
        Token oldToken = createWaitingToken(sourceQueue);
        Token targetToken = createWaitingToken(targetQueue);

        oldToken.transitionTo(TokenState.TRANSFERRED);
        oldToken.setTransferredToTokenId(targetToken.getId());
        tokenRepository.saveAndFlush(oldToken);

        mockMvc.perform(get("/api/v1/tokens/{id}/transfer-recovery", oldToken.getId())
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());
    }
}
