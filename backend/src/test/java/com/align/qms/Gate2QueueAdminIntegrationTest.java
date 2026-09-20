package com.align.qms;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.queue.QueueStatus;
import com.align.qms.queue.dto.CreateQueueRequest;
import com.align.qms.queue.dto.QueueResponse;
import com.align.qms.queue.dto.UpdateQueueConfigRequest;
import com.align.qms.queue.dto.UpdateQueueStatusRequest;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.service.dto.CreateServiceRequest;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.service.dto.UpdateServiceStatusRequest;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class Gate2QueueAdminIntegrationTest extends PostgresIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository orgRepository;
    @Autowired private LocationRepository locRepository;
    @Autowired private ServiceRepository svcRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String platformAdminToken;
    private String org1AdminToken;
    private String org1StaffToken;
    private String org2AdminToken;

    private UUID org1Id;
    private UUID org2Id;
    private UUID loc1Id;
    private UUID loc2Id;
    private UUID svc1Id;
    private UUID svc2DisabledId;
    private UUID svcOrg2Id;

    @BeforeEach
    void setUp() {
        queueRepository.deleteAll();
        svcRepository.deleteAll();
        locRepository.deleteAll();
        userRepository.deleteAll();
        orgRepository.deleteAll();

        // Platform Admin
        User pAdmin = new User(null, "plat2@test.io", passwordEncoder.encode("Pass123!"), "Plat Admin", UserRole.PLATFORM_ADMIN, null);
        userRepository.save(pAdmin);
        platformAdminToken = login("plat2@test.io", "Pass123!");

        // Org 1
        org1Id = createOrg("GATE2A", "Gate2 Org A").getId();
        org1AdminToken = createAndLoginUser(org1Id, "admin1@gate2.io", UserRole.ORG_ADMIN);
        org1StaffToken = createAndLoginUser(org1Id, "staff1@gate2.io", UserRole.STAFF);

        // Org 2
        org2Id = createOrg("GATE2B", "Gate2 Org B").getId();
        org2AdminToken = createAndLoginUser(org2Id, "admin2@gate2.io", UserRole.ORG_ADMIN);

        // Locations
        loc1Id = createLocation(org1Id, org1AdminToken, "Loc 1").getId();
        loc2Id = createLocation(org2Id, org2AdminToken, "Loc 2").getId();

        // Services in Org 1
        svc1Id = createService(loc1Id, org1AdminToken, "Svc 1").getId();
        svc2DisabledId = createService(loc1Id, org1AdminToken, "Svc 2 Disabled").getId();
        updateServiceStatus(svc2DisabledId, org1AdminToken, false);

        // Service in Org 2
        svcOrg2Id = createService(loc2Id, org2AdminToken, "Svc Org2").getId();
    }

    private OrganizationResponse createOrg(String code, String name) {
        CreateOrganizationRequest cOrg = new CreateOrganizationRequest();
        cOrg.setCode(code);
        cOrg.setName(name);
        cOrg.setSector("RETAIL");
        return restTemplate.exchange("/api/v1/tenants", HttpMethod.POST, new HttpEntity<>(cOrg, getHeaders(platformAdminToken)), OrganizationResponse.class).getBody();
    }

    private String createAndLoginUser(UUID orgId, String email, UserRole role) {
        User u = new User(orgId, email, passwordEncoder.encode("Pass123!"), "User", role, null);
        userRepository.save(u);
        return login(email, "Pass123!");
    }

    private LocationResponse createLocation(UUID orgId, String token, String name) {
        CreateLocationRequest req = new CreateLocationRequest();
        req.setOrgId(orgId);
        req.setName(name);
        req.setAddress("Addr");
        req.setIsHq(false);
        return restTemplate.exchange("/api/v1/locations", HttpMethod.POST, new HttpEntity<>(req, getHeaders(token)), LocationResponse.class).getBody();
    }

    private ServiceResponse createService(UUID locationId, String token, String name) {
        CreateServiceRequest req = new CreateServiceRequest();
        req.setLocationId(locationId);
        req.setName(name);
        req.setIsFastTrack(false);
        return restTemplate.exchange("/api/v1/services", HttpMethod.POST, new HttpEntity<>(req, getHeaders(token)), ServiceResponse.class).getBody();
    }

    private void updateServiceStatus(UUID serviceId, String token, boolean enabled) {
        UpdateServiceStatusRequest req = new UpdateServiceStatusRequest();
        req.setEnabled(enabled);
        restTemplate.exchange("/api/v1/services/" + serviceId + "/status", HttpMethod.PUT, new HttpEntity<>(req, getHeaders(token)), ServiceResponse.class);
    }

    private String login(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        return restTemplate.postForEntity("/api/v1/auth/login", req, LoginResponse.class).getBody().getAccessToken();
    }

    private HttpHeaders getHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    // --- Tests ---

    @Test
    void testServiceDiscovery_IncludeDisabledFalse_Public() {
        // F. includeDisabled=false
        ResponseEntity<List<ServiceResponse>> resp = restTemplate.exchange(
            "/api/v1/services?locationId=" + loc1Id, HttpMethod.GET, new HttpEntity<>(getHeaders(null)),
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).hasSize(1);
        assertThat(resp.getBody().get(0).getId()).isEqualTo(svc1Id); // svc2DisabledId should not be here
    }

    @Test
    void testServiceDiscovery_IncludeDisabledTrue_OrgAdmin() {
        // G. includeDisabled=true for ORG_ADMIN
        ResponseEntity<List<ServiceResponse>> resp = restTemplate.exchange(
            "/api/v1/services?locationId=" + loc1Id + "&includeDisabled=true", HttpMethod.GET, new HttpEntity<>(getHeaders(org1AdminToken)),
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).hasSize(2);
    }

    @Test
    void testServiceDiscovery_IncludeDisabledTrue_PlatformAdmin() {
        // H. includeDisabled=true for PLATFORM_ADMIN
        ResponseEntity<List<ServiceResponse>> resp = restTemplate.exchange(
            "/api/v1/services?locationId=" + loc1Id + "&includeDisabled=true", HttpMethod.GET, new HttpEntity<>(getHeaders(platformAdminToken)),
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).hasSize(2);
    }

    @Test
    void testServiceDiscovery_IncludeDisabledTrue_StaffRejected() {
        // I. includeDisabled=true rejected for unauthorized roles
        ResponseEntity<String> resp = restTemplate.exchange(
            "/api/v1/services?locationId=" + loc1Id + "&includeDisabled=true", HttpMethod.GET, new HttpEntity<>(getHeaders(org1StaffToken)),
            String.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void testServiceDiscovery_IncludeDisabledTrue_CrossTenantRejected() {
        // J. cross-tenant service-list rejection
        ResponseEntity<List<ServiceResponse>> resp = restTemplate.exchange(
            "/api/v1/services?locationId=" + loc1Id + "&includeDisabled=true", HttpMethod.GET, new HttpEntity<>(getHeaders(org2AdminToken)),
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isEmpty(); // Because TenantContext filters out services not owned by org2
    }

    @Test
    void testQueueCreationAndDuplicateRejection() {
        // K. duplicate service->queue mapping rejection
        CreateQueueRequest req = new CreateQueueRequest();
        req.setServiceId(svc1Id);
        req.setName("Queue 1");
        req.setTokenPrefix("Q1");
        
        ResponseEntity<QueueResponse> resp = restTemplate.exchange(
            "/api/v1/queues", HttpMethod.POST, new HttpEntity<>(req, getHeaders(org1AdminToken)), QueueResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        
        // Try again -> Conflict
        ResponseEntity<String> conflictResp = restTemplate.exchange(
            "/api/v1/queues", HttpMethod.POST, new HttpEntity<>(req, getHeaders(org1AdminToken)), String.class);
        
        assertThat(conflictResp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void testQueueListByLocation_And_CrossTenantRejection() {
        // A. Queue list by location
        // B. ORG_ADMIN same-tenant access
        CreateQueueRequest req = new CreateQueueRequest();
        req.setServiceId(svc1Id);
        req.setName("Queue A");
        req.setTokenPrefix("QA");
        restTemplate.exchange("/api/v1/queues", HttpMethod.POST, new HttpEntity<>(req, getHeaders(org1AdminToken)), QueueResponse.class);

        ResponseEntity<List<QueueResponse>> listResp = restTemplate.exchange(
            "/api/v1/queues?locationId=" + loc1Id, HttpMethod.GET, new HttpEntity<>(getHeaders(org1AdminToken)),
            new ParameterizedTypeReference<List<QueueResponse>>() {});
        
        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSize(1);
        assertThat(listResp.getBody().get(0).getName()).isEqualTo("Queue A");

        // C. ORG_ADMIN cross-tenant rejection
        ResponseEntity<List<QueueResponse>> crossResp = restTemplate.exchange(
            "/api/v1/queues?locationId=" + loc1Id, HttpMethod.GET, new HttpEntity<>(getHeaders(org2AdminToken)),
            new ParameterizedTypeReference<List<QueueResponse>>() {});
        
        assertThat(crossResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(crossResp.getBody()).isEmpty(); // Filtered by TenantContext

        // D. PLATFORM_ADMIN access
        ResponseEntity<List<QueueResponse>> platResp = restTemplate.exchange(
            "/api/v1/queues?locationId=" + loc1Id, HttpMethod.GET, new HttpEntity<>(getHeaders(platformAdminToken)),
            new ParameterizedTypeReference<List<QueueResponse>>() {});
        
        assertThat(platResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(platResp.getBody()).hasSize(1);
    }

    @Test
    void testQueueStatusAndConfigUpdates() {
        // Create Queue
        CreateQueueRequest req = new CreateQueueRequest();
        req.setServiceId(svc1Id);
        req.setName("Q Update Test");
        req.setTokenPrefix("QU");
        QueueResponse q = restTemplate.exchange("/api/v1/queues", HttpMethod.POST, new HttpEntity<>(req, getHeaders(org1AdminToken)), QueueResponse.class).getBody();
        UUID qId = q.getId();

        // L. queue status enum correctness
        UpdateQueueStatusRequest statusReq = new UpdateQueueStatusRequest();
        statusReq.setStatus(QueueStatus.PAUSED);
        
        ResponseEntity<QueueResponse> statusResp = restTemplate.exchange(
            "/api/v1/queues/" + qId + "/status", HttpMethod.PUT, new HttpEntity<>(statusReq, getHeaders(org1StaffToken)), QueueResponse.class);
        
        assertThat(statusResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(statusResp.getBody().getStatus()).isEqualTo(QueueStatus.PAUSED);

        // M. queue configuration update
        UpdateQueueConfigRequest configReq = new UpdateQueueConfigRequest();
        configReq.setMaxCapacity(200);
        configReq.setAutoPauseAtCapacity(true);
        configReq.setTokenPrefix("QUPD");
        
        ResponseEntity<QueueResponse> configResp = restTemplate.exchange(
            "/api/v1/queues/" + qId + "/config", HttpMethod.PUT, new HttpEntity<>(configReq, getHeaders(org1AdminToken)), QueueResponse.class);
        
        assertThat(configResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(configResp.getBody().getMaxCapacity()).isEqualTo(200);
        assertThat(configResp.getBody().isAutoPauseAtCapacity()).isTrue();
        assertThat(configResp.getBody().getTokenPrefix()).isEqualTo("QUPD");

        // E. STAFF unauthorized admin mutation
        ResponseEntity<String> staffConfigResp = restTemplate.exchange(
            "/api/v1/queues/" + qId + "/config", HttpMethod.PUT, new HttpEntity<>(configReq, getHeaders(org1StaffToken)), String.class);
        
        assertThat(staffConfigResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
