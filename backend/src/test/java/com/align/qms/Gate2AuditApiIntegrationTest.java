package com.align.qms;

import com.align.qms.audit.AdminAuditRepository;
import com.align.qms.audit.AdminAuditEvent;
import com.align.qms.audit.dto.AdminAuditResponse;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.counter.CounterRepository;
import com.align.qms.counter.CounterStatus;
import com.align.qms.counter.CounterAvailability;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.counter.dto.CreateCounterRequest;
import com.align.qms.counter.dto.UpdateCounterStatusRequest;
import com.align.qms.counter.dto.UpdateCounterAvailabilityRequest;
import com.align.qms.location.LocationRepository;
import com.align.qms.location.LocationStatus;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.location.dto.UpdateLocationStatusRequest;
import com.align.qms.location.dto.UpdateLocationRequest;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.organization.OrganizationStatus;
import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.organization.dto.UpdateOrganizationStatusRequest;
import com.align.qms.organization.dto.UpdateOrganizationRequest;
import com.align.qms.queue.QueueRepository;
import com.align.qms.queue.QueueStatus;
import com.align.qms.queue.dto.CreateQueueRequest;
import com.align.qms.queue.dto.QueueResponse;
import com.align.qms.queue.dto.UpdateQueueConfigRequest;
import com.align.qms.queue.dto.UpdateQueueStatusRequest;
import com.align.qms.service.ServiceRepository;
import com.align.qms.service.dto.CreateServiceRequest;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.service.dto.UpdateServiceRequest;
import com.align.qms.service.dto.UpdateServiceStatusRequest;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class Gate2AuditApiIntegrationTest extends PostgresIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository orgRepository;
    @Autowired private LocationRepository locRepository;
    @Autowired private ServiceRepository svcRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private AdminAuditRepository adminAuditRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String platformAdminToken;
    private String orgAdminToken;
    private String staffToken;
    
    private UUID platformAdminId;
    private UUID orgAdminId;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;
    private UUID queueId;
    private UUID counterId;

    @BeforeEach
    void setUp() {
        adminAuditRepository.deleteAll();
        orgRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Setup Platform Admin
        User pAdmin = new User(null, "plat@test.io", passwordEncoder.encode("Pass123!"), "Plat Admin", UserRole.PLATFORM_ADMIN, null);
        userRepository.save(pAdmin);
        platformAdminId = pAdmin.getId();
        platformAdminToken = login("plat@test.io", "Pass123!");

        // 2. Setup Organization
        CreateOrganizationRequest cOrg = new CreateOrganizationRequest();
        cOrg.setCode("GATE2");
        cOrg.setName("Gate2 Org");
        cOrg.setSector("RETAIL");
        ResponseEntity<OrganizationResponse> orgResp = restTemplate.exchange(
            "/api/v1/tenants", HttpMethod.POST, new HttpEntity<>(cOrg, getHeaders(platformAdminToken)), OrganizationResponse.class);
        orgId = orgResp.getBody().getId();

        // 3. Setup Org Admin and Staff
        User oAdmin = new User(orgId, "admin@gate2.io", passwordEncoder.encode("Pass123!"), "Org Admin", UserRole.ORG_ADMIN, null);
        userRepository.save(oAdmin);
        orgAdminId = oAdmin.getId();
        orgAdminToken = login("admin@gate2.io", "Pass123!");

        User staff = new User(orgId, "staff@gate2.io", passwordEncoder.encode("Pass123!"), "Staff User", UserRole.STAFF, null);
        userRepository.save(staff);
        staffToken = login("staff@gate2.io", "Pass123!");

        // 4. Setup Location
        CreateLocationRequest cLoc = new CreateLocationRequest();
        cLoc.setOrgId(orgId);
        cLoc.setName("Loc 1");
        cLoc.setAddress("Addr 1");
        cLoc.setIsHq(true);
        ResponseEntity<LocationResponse> locResp = restTemplate.exchange(
            "/api/v1/locations", HttpMethod.POST, new HttpEntity<>(cLoc, getHeaders(orgAdminToken)), LocationResponse.class);
        locationId = locResp.getBody().getId();

        // 5. Setup Service
        CreateServiceRequest cSvc = new CreateServiceRequest();
        cSvc.setLocationId(locationId);
        cSvc.setName("Svc 1");
        cSvc.setIsFastTrack(false);
        ResponseEntity<ServiceResponse> svcResp = restTemplate.exchange(
            "/api/v1/services", HttpMethod.POST, new HttpEntity<>(cSvc, getHeaders(orgAdminToken)), ServiceResponse.class);
        serviceId = svcResp.getBody().getId();

        // 6. Setup Queue
        CreateQueueRequest cQueue = new CreateQueueRequest();
        cQueue.setServiceId(serviceId);
        cQueue.setName("Q1");
        ResponseEntity<QueueResponse> queueResp = restTemplate.exchange(
            "/api/v1/queues", HttpMethod.POST, new HttpEntity<>(cQueue, getHeaders(orgAdminToken)), QueueResponse.class);
        queueId = queueResp.getBody().getId();

        // 7. Setup Counter
        CreateCounterRequest cCount = new CreateCounterRequest();
        cCount.setLocationId(locationId);
        cCount.setNumber(1);
        cCount.setName("C1");
        ResponseEntity<CounterResponse> countResp = restTemplate.exchange(
            "/api/v1/counters", HttpMethod.POST, new HttpEntity<>(cCount, getHeaders(orgAdminToken)), CounterResponse.class);
        counterId = countResp.getBody().getId();
    }

    private String login(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        ResponseEntity<LoginResponse> resp = restTemplate.postForEntity("/api/v1/auth/login", req, LoginResponse.class);
        return resp.getBody().getAccessToken();
    }

    private HttpHeaders getHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    @Test
    void testAuditHooksAndReadApi() {
        // We already created Org, Loc, Svc, Queue, Counter. Let's verify audit logs for them.
        List<AdminAuditEvent> events = adminAuditRepository.findAll();
        // user creations are also logged (pAdmin, oAdmin, staff) -> 3
        // org, loc, svc, queue, counter creations -> 5
        // total -> 8 initial events
        
        ResponseEntity<CustomPageImpl<AdminAuditResponse>> resp = restTemplate.exchange(
            "/api/v1/audit", HttpMethod.GET, new HttpEntity<>(getHeaders(orgAdminToken)), new ParameterizedTypeReference<CustomPageImpl<AdminAuditResponse>>() {});
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        // Execute updates
        
        // Org update
        UpdateOrganizationRequest uOrg = new UpdateOrganizationRequest();
        uOrg.setName("Updated Org");
        restTemplate.exchange("/api/v1/tenants/" + orgId, HttpMethod.PUT, new HttpEntity<>(uOrg, getHeaders(platformAdminToken)), OrganizationResponse.class);
        
        // Verify Target org logic
        AdminAuditEvent orgUpdateEvent = adminAuditRepository.findAll().stream().filter(e -> "UPDATE".equals(e.getAction()) && "ORGANIZATION".equals(e.getEntityType())).findFirst().orElseThrow();
        assertThat(orgUpdateEvent.getOrgId()).isEqualTo(orgId);
        assertThat(orgUpdateEvent.getActorId()).isEqualTo(platformAdminId);

        // Loc update
        UpdateLocationRequest uLoc = new UpdateLocationRequest();
        uLoc.setName("Updated Loc");
        restTemplate.exchange("/api/v1/locations/" + locationId, HttpMethod.PUT, new HttpEntity<>(uLoc, getHeaders(orgAdminToken)), LocationResponse.class);
        
        // Svc update status
        UpdateServiceStatusRequest uSvcStatus = new UpdateServiceStatusRequest();
        uSvcStatus.setEnabled(false);
        restTemplate.exchange("/api/v1/services/" + serviceId + "/status", HttpMethod.PATCH, new HttpEntity<>(uSvcStatus, getHeaders(orgAdminToken)), ServiceResponse.class);
        
        // Queue update config
        UpdateQueueConfigRequest uQueueConf = new UpdateQueueConfigRequest();
        uQueueConf.setMaxCapacity(200);
        restTemplate.exchange("/api/v1/queues/" + queueId + "/config", HttpMethod.PUT, new HttpEntity<>(uQueueConf, getHeaders(orgAdminToken)), QueueResponse.class);
        
        // Counter update availability
        UpdateCounterAvailabilityRequest uCountAvail = new UpdateCounterAvailabilityRequest();
        uCountAvail.setAvailability(CounterAvailability.ONLINE);
        restTemplate.exchange("/api/v1/counters/" + counterId + "/availability", HttpMethod.PUT, new HttpEntity<>(uCountAvail, getHeaders(orgAdminToken)), CounterResponse.class);

        // Read API entity filter
        ResponseEntity<CustomPageImpl<AdminAuditResponse>> entityResp = restTemplate.exchange(
            "/api/v1/audit/entity/COUNTER/" + counterId, HttpMethod.GET, new HttpEntity<>(getHeaders(orgAdminToken)), new ParameterizedTypeReference<CustomPageImpl<AdminAuditResponse>>() {});
        
        assertThat(entityResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entityResp.getBody().getContent()).hasSize(2); // CREATE and UPDATE_AVAILABILITY

        // No-op test (counter availability again)
        restTemplate.exchange("/api/v1/counters/" + counterId + "/availability", HttpMethod.PUT, new HttpEntity<>(uCountAvail, getHeaders(orgAdminToken)), CounterResponse.class);
        
        ResponseEntity<CustomPageImpl<AdminAuditResponse>> entityRespAfterNoOp = restTemplate.exchange(
            "/api/v1/audit/entity/COUNTER/" + counterId, HttpMethod.GET, new HttpEntity<>(getHeaders(orgAdminToken)), new ParameterizedTypeReference<CustomPageImpl<AdminAuditResponse>>() {});
        
        assertThat(entityRespAfterNoOp.getBody().getContent()).hasSize(2); // still 2
    }

    public static class CustomPageImpl<T> {
        private List<T> content;
        public List<T> getContent() { return content; }
        public void setContent(List<T> content) { this.content = content; }
    }
}
