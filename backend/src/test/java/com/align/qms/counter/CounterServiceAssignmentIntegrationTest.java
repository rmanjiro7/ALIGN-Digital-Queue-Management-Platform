package com.align.qms.counter;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.audit.AdminAuditRepository;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.service.dto.ServiceResponse;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class CounterServiceAssignmentIntegrationTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private CounterServiceAssignmentRepository assignmentRepository;
    @Autowired private AdminAuditRepository adminAuditRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    private static final String ORG_ADMIN_EMAIL = "admin_asgn@test.com";
    private static final String ORG_ADMIN_PASS = "AdminPass1!";
    private static final String PLATFORM_ADMIN_EMAIL = "platform_asgn@test.com";
    private static final String PLATFORM_ADMIN_PASS = "PlatformPass1!";
    private static final String STAFF_EMAIL = "staff_asgn@test.com";
    private static final String STAFF_PASS = "StaffPass1!";

    private UUID orgId;
    private UUID otherOrgId;
    private UUID locationId;
    private UUID otherLocationId;
    private UUID counterId;
    private UUID serviceId;
    private UUID otherServiceId;
    private UUID otherOrgServiceId;

    @BeforeEach
    void setUp() {
        assignmentRepository.deleteAll();
        adminAuditRepository.deleteAll();
        counterRepository.deleteAll();
        serviceRepository.deleteAll();
        userRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM locations WHERE name LIKE '%Asgn Loc%'");
        jdbcTemplate.update("DELETE FROM organizations WHERE code LIKE 'ASGN-%'");

        orgId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE')", orgId, "ASGN-ORG1", "Asgn Org 1");

        otherOrgId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE')", otherOrgId, "ASGN-ORG2", "Asgn Org 2");

        locationId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, city, is_hq) VALUES (?, ?, ?, 'City', false)", locationId, orgId, "Asgn Loc 1");

        otherLocationId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, city, is_hq) VALUES (?, ?, ?, 'City', false)", otherLocationId, orgId, "Asgn Loc 2");

        User admin = new User(orgId, ORG_ADMIN_EMAIL, passwordEncoder.encode(ORG_ADMIN_PASS), "Admin", UserRole.ORG_ADMIN, locationId);
        userRepository.save(admin);

        User platformAdmin = new User(null, PLATFORM_ADMIN_EMAIL, passwordEncoder.encode(PLATFORM_ADMIN_PASS), "Platform", UserRole.PLATFORM_ADMIN, null);
        userRepository.save(platformAdmin);

        User staff = new User(orgId, STAFF_EMAIL, passwordEncoder.encode(STAFF_PASS), "Staff", UserRole.STAFF, locationId);
        userRepository.save(staff);

        Counter counter = new Counter(orgId, locationId, 1, "Counter 1");
        counter = counterRepository.save(counter);
        counterId = counter.getId();

        ServiceEntity service = new ServiceEntity(orgId, locationId, "Service 1", "Desc", "icon", false, "");
        service = serviceRepository.save(service);
        serviceId = service.getId();

        ServiceEntity otherService = new ServiceEntity(orgId, otherLocationId, "Service 2", "Desc", "icon", false, "");
        otherService = serviceRepository.save(otherService);
        otherServiceId = otherService.getId();
        
        ServiceEntity otherOrgService = new ServiceEntity(otherOrgId, locationId, "Service 3", "Desc", "icon", false, "");
        otherOrgService = serviceRepository.save(otherOrgService);
        otherOrgServiceId = otherOrgService.getId();
    }

    @Test
    @DisplayName("ASGN-01: ORG_ADMIN can assign, list, and remove valid assignments with audit")
    void adminCanManageAssignments() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        // 1. Assign
        ResponseEntity<Void> assignResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + serviceId),
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(assignResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 2. Persisted?
        assertThat(assignmentRepository.findAll()).hasSize(1);
        
        // 3. Duplicate assignment -> 409
        ResponseEntity<Void> dupResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + serviceId),
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(dupResp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        
        // 4. List
        ResponseEntity<List<ServiceResponse>> listResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services"),
            HttpMethod.GET, new HttpEntity<>(null, bearerJson(token)), 
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSize(1);
        assertThat(listResp.getBody().get(0).getId()).isEqualTo(serviceId);

        // 5. Audit logs for create
        assertThat(adminAuditRepository.findAll().stream()
            .anyMatch(a -> a.getAction().equals("CREATE_COUNTER_SERVICE_ASSIGNMENT"))).isTrue();

        // 6. Remove
        ResponseEntity<Void> removeResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + serviceId),
            HttpMethod.DELETE, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(removeResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // 7. Persisted removal
        assertThat(assignmentRepository.findAll()).isEmpty();
        
        // 8. Audit logs for remove
        assertThat(adminAuditRepository.findAll().stream()
            .anyMatch(a -> a.getAction().equals("REMOVE_COUNTER_SERVICE_ASSIGNMENT"))).isTrue();
    }

    @Test
    @DisplayName("ASGN-02: PLATFORM_ADMIN can manage assignments")
    void platformAdminCanManageAssignments() {
        String token = loginToken(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASS);

        ResponseEntity<Void> assignResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + serviceId),
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(assignResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("ASGN-03: STAFF can list but not mutate assignments")
    void staffCanListButNotMutate() {
        String token = loginToken(STAFF_EMAIL, STAFF_PASS);

        ResponseEntity<Void> assignResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + serviceId),
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(assignResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        
        ResponseEntity<List<ServiceResponse>> listResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services"),
            HttpMethod.GET, new HttpEntity<>(null, bearerJson(token)), 
            new ParameterizedTypeReference<List<ServiceResponse>>() {});
        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("ASGN-04: Anonymous cannot access assignment API")
    void anonymousCannotAccess() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> listResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services"),
            HttpMethod.GET, new HttpEntity<>(null, headers), 
            String.class);
        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("ASGN-05: Cross-location assignment rejected")
    void crossLocationAssignmentRejected() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        ResponseEntity<Void> assignResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + otherLocationId), // Doesn't match
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(assignResp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("ASGN-06: Cross-tenant assignment rejected")
    void crossTenantAssignmentRejected() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        ResponseEntity<Void> assignResp = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/services/" + otherOrgServiceId),
            HttpMethod.POST, new HttpEntity<>(null, bearerJson(token)), Void.class);
        assertThat(assignResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN); // TenantContext throws 403 AccessDenied
    }

    private String loginToken(String email, String password) {
        LoginRequest req = new LoginRequest(email, password);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<LoginResponse> resp = restTemplate.postForEntity(
            url("/api/v1/auth/login"), new HttpEntity<>(req, headers), LoginResponse.class);
        assertThat(resp.getStatusCode()).as("Login must succeed").isEqualTo(HttpStatus.OK);
        return resp.getBody().getAccessToken();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders bearerJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }
}
