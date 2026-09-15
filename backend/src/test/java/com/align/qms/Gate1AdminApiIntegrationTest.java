package com.align.qms;

import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.counter.CounterRepository;
import com.align.qms.counter.CounterStatus;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.counter.dto.CreateCounterRequest;
import com.align.qms.counter.dto.UpdateCounterStatusRequest;
import com.align.qms.location.LocationRepository;
import com.align.qms.location.LocationStatus;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.location.dto.LocationResponse;
import com.align.qms.location.dto.UpdateLocationStatusRequest;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.organization.OrganizationStatus;
import com.align.qms.organization.dto.CreateOrganizationRequest;
import com.align.qms.organization.dto.OrganizationResponse;
import com.align.qms.organization.dto.UpdateOrganizationStatusRequest;
import com.align.qms.service.ServiceRepository;
import com.align.qms.service.dto.CreateServiceRequest;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.service.dto.UpdateServiceRequest;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class Gate1AdminApiIntegrationTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository orgRepository;
    @Autowired private LocationRepository locRepository;
    @Autowired private ServiceRepository svcRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String platformAdminToken;
    private String orgAdminToken;
    private String staffToken;

    private UUID orgId;
    private UUID locationId;
    private UUID serviceId;
    private UUID counterId;

    @BeforeEach
    void setUp() {
        orgRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Setup Platform Admin
        User pAdmin = new User(null, "plat@test.io", passwordEncoder.encode("Pass123!"), "Plat Admin", UserRole.PLATFORM_ADMIN, null);
        userRepository.save(pAdmin);
        platformAdminToken = login("plat@test.io", "Pass123!");

        // 2. Setup Organization
        CreateOrganizationRequest cOrg = new CreateOrganizationRequest();
        cOrg.setCode("GATE1");
        cOrg.setName("Gate1 Org");
        cOrg.setSector("RETAIL");
        ResponseEntity<OrganizationResponse> orgResp = restTemplate.exchange(
            "/api/v1/tenants", HttpMethod.POST, new HttpEntity<>(cOrg, getHeaders(platformAdminToken)), OrganizationResponse.class);
        orgId = orgResp.getBody().getId();

        // 3. Setup Org Admin and Staff
        User oAdmin = new User(orgId, "admin@gate1.io", passwordEncoder.encode("Pass123!"), "Org Admin", UserRole.ORG_ADMIN, null);
        userRepository.save(oAdmin);
        orgAdminToken = login("admin@gate1.io", "Pass123!");

        User staff = new User(orgId, "staff@gate1.io", passwordEncoder.encode("Pass123!"), "Staff User", UserRole.STAFF, null);
        userRepository.save(staff);
        staffToken = login("staff@gate1.io", "Pass123!");

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

        // 6. Setup Counter
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
    void testGetCounterById() {
        ResponseEntity<CounterResponse> resp = restTemplate.exchange(
            "/api/v1/counters/" + counterId, HttpMethod.GET, new HttpEntity<>(getHeaders(orgAdminToken)), CounterResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getId()).isEqualTo(counterId);

        // Staff can also get
        ResponseEntity<CounterResponse> respStaff = restTemplate.exchange(
            "/api/v1/counters/" + counterId, HttpMethod.GET, new HttpEntity<>(getHeaders(staffToken)), CounterResponse.class);
        assertThat(respStaff.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testUpdateOrganizationStatus() {
        UpdateOrganizationStatusRequest req = new UpdateOrganizationStatusRequest();
        req.setStatus(OrganizationStatus.SUSPENDED);

        // Platform Admin can update
        ResponseEntity<OrganizationResponse> resp = restTemplate.exchange(
            "/api/v1/tenants/" + orgId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(platformAdminToken)), OrganizationResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getStatus()).isEqualTo(OrganizationStatus.SUSPENDED);

        // Org Admin cannot update
        ResponseEntity<String> respAdmin = restTemplate.exchange(
            "/api/v1/tenants/" + orgId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(orgAdminToken)), String.class);
        assertThat(respAdmin.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void testUpdateLocationStatus() {
        UpdateLocationStatusRequest req = new UpdateLocationStatusRequest();
        req.setStatus(LocationStatus.INACTIVE);

        // Org Admin can update
        ResponseEntity<LocationResponse> resp = restTemplate.exchange(
            "/api/v1/locations/" + locationId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(orgAdminToken)), LocationResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getStatus()).isEqualTo(LocationStatus.INACTIVE);

        // Staff cannot update
        ResponseEntity<String> respStaff = restTemplate.exchange(
            "/api/v1/locations/" + locationId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(staffToken)), String.class);
        assertThat(respStaff.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void testUpdateServiceField() {
        UpdateServiceRequest req = new UpdateServiceRequest();
        req.setName("Updated Svc");
        req.setIsFastTrack(true);

        ResponseEntity<ServiceResponse> resp = restTemplate.exchange(
            "/api/v1/services/" + serviceId, HttpMethod.PUT, new HttpEntity<>(req, getHeaders(orgAdminToken)), ServiceResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getName()).isEqualTo("Updated Svc");
        assertThat(resp.getBody().isFastTrack()).isTrue();
    }

    @Test
    void testUpdateCounterStatus() {
        UpdateCounterStatusRequest req = new UpdateCounterStatusRequest();
        req.setStatus(CounterStatus.PAUSED);

        // Org Admin can update
        ResponseEntity<CounterResponse> resp = restTemplate.exchange(
            "/api/v1/counters/" + counterId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(orgAdminToken)), CounterResponse.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getStatus()).isEqualTo(CounterStatus.PAUSED);

        // Staff cannot update
        req.setStatus(CounterStatus.CLOSED);
        ResponseEntity<String> respStaff = restTemplate.exchange(
            "/api/v1/counters/" + counterId + "/status", HttpMethod.PATCH, new HttpEntity<>(req, getHeaders(staffToken)), String.class);
        assertThat(respStaff.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
