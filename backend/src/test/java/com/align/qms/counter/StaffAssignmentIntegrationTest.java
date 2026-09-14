package com.align.qms.counter;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.counter.dto.CounterAssignmentRequest;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import com.align.qms.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class StaffAssignmentIntegrationTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Autowired private com.align.qms.audit.AdminAuditRepository adminAuditRepository;

    private static final String ORG_ADMIN_EMAIL = "admin@assign.test";
    private static final String ORG_ADMIN_PASS = "OrgAdminPass1!";
    private static final String STAFF_EMAIL = "staff@assign.test";
    private static final String STAFF_PASS = "StaffPass1!";

    private UUID orgId;
    private UUID locationId;
    private UUID counterId;
    private UUID staffId;
    private UUID adminUserId;

    @BeforeEach
    void setUp() {
        adminAuditRepository.deleteAll();
        counterRepository.deleteAll();
        userRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM locations WHERE name LIKE 'Assign %'");
        jdbcTemplate.update("DELETE FROM organizations WHERE code = 'ASSIGN-ORG'");

        orgId = UUID.randomUUID();
        insertFullOrg(orgId, "ASSIGN-ORG", "Assign Org");

        locationId = UUID.randomUUID();
        insertLocation(locationId, orgId, "Assign Loc");

        User admin = new User(orgId, ORG_ADMIN_EMAIL,
            passwordEncoder.encode(ORG_ADMIN_PASS), "Admin", UserRole.ORG_ADMIN, null);
        adminUserId = userRepository.save(admin).getId();
        
        User staff = new User(orgId, STAFF_EMAIL,
            passwordEncoder.encode(STAFF_PASS), "Staff", UserRole.STAFF, locationId);
        staff = userRepository.save(staff);
        staffId = staff.getId();

        Counter counter = new Counter(orgId, locationId, 1, "Counter 1");
        counter = counterRepository.save(counter);
        counterId = counter.getId();
    }

    @Test
    @DisplayName("ASSIGN-01: Assigning active staff succeeds and creates audit log")
    void assign_activeStaff_succeeds() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        CounterAssignmentRequest req = new CounterAssignmentRequest();
        req.setStaffUserId(staffId);

        ResponseEntity<CounterResponse> response = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/assignment"),
            HttpMethod.POST,
            new HttpEntity<>(req, bearerJson(token)),
            CounterResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getAssignedStaffId()).isEqualTo(staffId);

        User staff = userRepository.findById(staffId).orElseThrow();
        assertThat(staff.getAssignedCounterNumber()).isEqualTo(1);

        java.util.List<com.align.qms.audit.AdminAuditEvent> audits = adminAuditRepository.findAll();
        assertThat(audits).hasSize(1);
        com.align.qms.audit.AdminAuditEvent audit = audits.get(0);
        assertThat(audit.getAction()).isEqualTo("ASSIGN_STAFF");
        assertThat(audit.getActorId()).isEqualTo(adminUserId);
        assertThat(audit.getEntityType()).isEqualTo("COUNTER");
        assertThat(audit.getEntityId()).isEqualTo(counterId);
        assertThat(audit.getBeforeState().has("assignedStaffId")).isFalse();
        assertThat(audit.getAfterState().get("assignedStaffId").asText()).isEqualTo(staffId.toString());
    }

    @Test
    @DisplayName("ASSIGN-02: Assigning inactive staff fails and creates zero audit logs")
    void assign_inactiveStaff_fails() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);
        
        User staff = userRepository.findById(staffId).orElseThrow();
        staff.setStatus(UserStatus.INACTIVE);
        userRepository.save(staff);
        adminAuditRepository.deleteAll(); // clear the updateStatus log from test setup

        CounterAssignmentRequest req = new CounterAssignmentRequest();
        req.setStaffUserId(staffId);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/assignment"),
            HttpMethod.POST,
            new HttpEntity<>(req, bearerJson(token)),
            String.class);

        // We threw IllegalArgumentException in service which should map to 400
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(adminAuditRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("ASSIGN-03: Unassigning clears entities and creates audit log")
    void unassign_clearsEntities() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        // Assign first
        CounterAssignmentRequest req = new CounterAssignmentRequest();
        req.setStaffUserId(staffId);
        restTemplate.exchange(url("/api/v1/counters/" + counterId + "/assignment"),
            HttpMethod.POST, new HttpEntity<>(req, bearerJson(token)), CounterResponse.class);

        adminAuditRepository.deleteAll();

        // Unassign
        ResponseEntity<CounterResponse> response = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/assignment"),
            HttpMethod.DELETE,
            new HttpEntity<>(bearerJson(token)),
            CounterResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getAssignedStaffId()).isNull();

        User staff = userRepository.findById(staffId).orElseThrow();
        assertThat(staff.getAssignedCounterNumber()).isNull();

        java.util.List<com.align.qms.audit.AdminAuditEvent> audits = adminAuditRepository.findAll();
        assertThat(audits).hasSize(1);
        com.align.qms.audit.AdminAuditEvent audit = audits.get(0);
        assertThat(audit.getAction()).isEqualTo("UNASSIGN_STAFF");
        assertThat(audit.getActorId()).isEqualTo(adminUserId);
        assertThat(audit.getBeforeState().get("assignedStaffId").asText()).isEqualTo(staffId.toString());
        assertThat(audit.getAfterState().has("assignedStaffId")).isFalse();
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

    private void insertFullOrg(UUID id, String code, String name) {
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE') ON CONFLICT DO NOTHING", id, code, name);
    }

    private void insertLocation(UUID id, UUID orgId, String name) {
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, city, is_hq) VALUES (?, ?, ?, 'City', false) ON CONFLICT DO NOTHING", id, orgId, name);
    }
}
