package com.align.qms.user;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.user.dto.CreateUserRequest;
import com.align.qms.user.dto.UpdateUserRequest;
import com.align.qms.user.dto.UpdateUserStatusRequest;
import com.align.qms.user.dto.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class UserManagementIntegrationTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    private static final String PLATFORM_EMAIL = "platform@align-test.io";
    private static final String PLATFORM_PASS = "PlatformPass1!";
    private static final String ORG_ADMIN_EMAIL = "orgadmin@org-alpha.test";
    private static final String ORG_ADMIN_PASS = "OrgAdminPass1!";
    private static final String STAFF_EMAIL = "staff@org-alpha.test";
    private static final String STAFF_PASS = "StaffPass1!";

    private UUID orgAId;
    private UUID orgBId;
    private UUID staffId;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM organizations WHERE code LIKE 'TST-%'");

        orgAId = UUID.randomUUID();
        orgBId = UUID.randomUUID();
        insertFullOrg(orgAId, "TST-ALPHA", "Org Alpha");
        insertFullOrg(orgBId, "TST-BETA", "Org Beta");

        userRepository.save(new User(orgAId, ORG_ADMIN_EMAIL,
            passwordEncoder.encode(ORG_ADMIN_PASS), "Admin Alpha", UserRole.ORG_ADMIN, null));
        User staff = userRepository.save(new User(orgAId, STAFF_EMAIL,
            passwordEncoder.encode(STAFF_PASS), "Staff Alpha", UserRole.STAFF, null));
        staffId = staff.getId();

        userRepository.save(new User(null, PLATFORM_EMAIL,
            passwordEncoder.encode(PLATFORM_PASS), "Platform Admin", UserRole.PLATFORM_ADMIN, null));
    }

    @Test
    @DisplayName("USER-01: ORG_ADMIN can create STAFF user in same org")
    void orgAdmin_createStaffUser_returns201() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        CreateUserRequest req = new CreateUserRequest();
        req.setOrgId(orgAId);
        req.setEmail("newstaff@org-alpha.test");
        req.setPassword("NewStaffPass1!");
        req.setName("New Staff");
        req.setRole(UserRole.STAFF);

        ResponseEntity<UserResponse> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.POST,
            new HttpEntity<>(req, bearerJson(token)),
            UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getEmail()).isEqualTo("newstaff@org-alpha.test");
        assertThat(response.getBody().getOrgId()).isEqualTo(orgAId);
        assertThat(response.getBody().getRole()).isEqualTo(UserRole.STAFF);
    }

    @Test
    @DisplayName("USER-02: ORG_ADMIN cannot create another ORG_ADMIN")
    void orgAdmin_createOrgAdmin_returns403() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        CreateUserRequest req = new CreateUserRequest();
        req.setOrgId(orgAId);
        req.setEmail("newadmin@org-alpha.test");
        req.setPassword("NewAdminPass1!");
        req.setName("New Admin");
        req.setRole(UserRole.ORG_ADMIN);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.POST,
            new HttpEntity<>(req, bearerJson(token)),
            String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("USER-03: PLATFORM_ADMIN can create ORG_ADMIN for any org")
    void platformAdmin_createOrgAdmin_returns201() {
        String token = loginToken(PLATFORM_EMAIL, PLATFORM_PASS);

        CreateUserRequest req = new CreateUserRequest();
        req.setOrgId(orgBId);
        req.setEmail("admin@org-beta.test");
        req.setPassword("AdminPass1!");
        req.setName("Admin Beta");
        req.setRole(UserRole.ORG_ADMIN);

        ResponseEntity<UserResponse> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.POST,
            new HttpEntity<>(req, bearerJson(token)),
            UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getOrgId()).isEqualTo(orgBId);
        assertThat(response.getBody().getRole()).isEqualTo(UserRole.ORG_ADMIN);
    }

    @Test
    @DisplayName("USER-04: STAFF cannot access user endpoints")
    void staff_accessUsers_returns403() {
        String token = loginToken(STAFF_EMAIL, STAFF_PASS);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.GET,
            new HttpEntity<>(bearerJson(token)),
            String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("USER-05: ORG_ADMIN lists users in their org")
    void orgAdmin_listUsers_returnsOnlyOrgUsers() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        ResponseEntity<List<UserResponse>> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.GET,
            new HttpEntity<>(bearerJson(token)),
            new ParameterizedTypeReference<List<UserResponse>>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().stream().allMatch(u -> u.getOrgId().equals(orgAId))).isTrue();
    }

    @Test
    @DisplayName("USER-06: PLATFORM_ADMIN lists all users")
    void platformAdmin_listUsers_returnsAllUsers() {
        String token = loginToken(PLATFORM_EMAIL, PLATFORM_PASS);

        ResponseEntity<List<UserResponse>> response = restTemplate.exchange(
            url("/api/v1/users"),
            HttpMethod.GET,
            new HttpEntity<>(bearerJson(token)),
            new ParameterizedTypeReference<List<UserResponse>>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().size()).isGreaterThanOrEqualTo(3); // Platform, Admin A, Staff A
    }

    @Test
    @DisplayName("USER-07: ORG_ADMIN updates user in their org")
    void orgAdmin_updateUser_returns200() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        UpdateUserRequest req = new UpdateUserRequest();
        req.setName("Updated Staff Name");
        
        ResponseEntity<UserResponse> response = restTemplate.exchange(
            url("/api/v1/users/" + staffId),
            HttpMethod.PUT,
            new HttpEntity<>(req, bearerJson(token)),
            UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getName()).isEqualTo("Updated Staff Name");
    }

    @Test
    @DisplayName("USER-08: ORG_ADMIN updates user status in their org")
    void orgAdmin_updateUserStatus_returns200() {
        String token = loginToken(ORG_ADMIN_EMAIL, ORG_ADMIN_PASS);

        UpdateUserStatusRequest req = new UpdateUserStatusRequest();
        req.setStatus(UserStatus.INACTIVE);

        ResponseEntity<UserResponse> response = restTemplate.exchange(
            url("/api/v1/users/" + staffId + "/status"),
            HttpMethod.PATCH,
            new HttpEntity<>(req, bearerJson(token)),
            UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getStatus()).isEqualTo(UserStatus.INACTIVE);
    }

    // --- Helper Methods ---

    private String loginToken(String email, String password) {
        LoginRequest req = new LoginRequest(email, password);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<LoginResponse> resp = restTemplate.postForEntity(
            url("/api/v1/auth/login"), new HttpEntity<>(req, headers), LoginResponse.class);
        assertThat(resp.getStatusCode()).as("Login must succeed for test fixture").isEqualTo(HttpStatus.OK);
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
        jdbcTemplate.update(
            "INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE') " +
            "ON CONFLICT (id) DO NOTHING",
            id, code, name);
    }
}
