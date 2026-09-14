package com.align.qms.counter;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.auth.LoginRequest;
import com.align.qms.auth.LoginResponse;
import com.align.qms.counter.dto.CounterResponse;
import com.align.qms.counter.dto.UpdateCounterAvailabilityRequest;
import com.align.qms.counter.log.CounterAvailabilityLog;
import com.align.qms.counter.log.CounterAvailabilityLogRepository;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class CounterAvailabilityHistoryTest extends PostgresIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private CounterAvailabilityLogRepository logRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    private static final String STAFF_EMAIL = "staff_hist@test.com";
    private static final String STAFF_PASS = "StaffPass1!";

    private UUID orgId;
    private UUID locationId;
    private UUID counterId;
    private UUID staffId;

    @BeforeEach
    void setUp() {
        logRepository.deleteAll();
        counterRepository.deleteAll();
        userRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM locations WHERE name = 'Hist Loc'");
        jdbcTemplate.update("DELETE FROM organizations WHERE code = 'HIST-ORG'");

        orgId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE')", orgId, "HIST-ORG", "Hist Org");

        locationId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, city, is_hq) VALUES (?, ?, ?, 'City', false)", locationId, orgId, "Hist Loc");

        User staff = new User(orgId, STAFF_EMAIL,
            passwordEncoder.encode(STAFF_PASS), "Staff", UserRole.STAFF, locationId);
        staff = userRepository.save(staff);
        staffId = staff.getId();

        Counter counter = new Counter(orgId, locationId, 1, "Counter 1");
        counter = counterRepository.save(counter);
        counterId = counter.getId();
    }

    @Test
    @DisplayName("HIST-01: Updating counter availability logs changes correctly")
    void updateAvailability_logsChangesCorrectly() {
        String token = loginToken(STAFF_EMAIL, STAFF_PASS);

        // 1. OFFLINE -> ONLINE (Creates 1 log)
        UpdateCounterAvailabilityRequest req = new UpdateCounterAvailabilityRequest();
        req.setAvailability(CounterAvailability.ONLINE);

        ResponseEntity<CounterResponse> response = restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/availability"),
            HttpMethod.PUT,
            new HttpEntity<>(req, bearerJson(token)),
            CounterResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<CounterAvailabilityLog> logs = logRepository.findByCounterIdOrderByChangedAtDesc(counterId);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOldAvailability()).isEqualTo("OFFLINE");
        assertThat(logs.get(0).getNewAvailability()).isEqualTo("ONLINE");

        // 2. ONLINE -> ONLINE (Creates 0 additional logs)
        restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/availability"),
            HttpMethod.PUT,
            new HttpEntity<>(req, bearerJson(token)),
            CounterResponse.class);
            
        logs = logRepository.findByCounterIdOrderByChangedAtDesc(counterId);
        assertThat(logs).hasSize(1); // Still 1

        // 3. ONLINE -> OFFLINE (Creates 1 additional log)
        req.setAvailability(CounterAvailability.OFFLINE);
        restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/availability"),
            HttpMethod.PUT,
            new HttpEntity<>(req, bearerJson(token)),
            CounterResponse.class);
            
        logs = logRepository.findByCounterIdOrderByChangedAtDesc(counterId);
        assertThat(logs).hasSize(2);
        assertThat(logs.get(0).getOldAvailability()).isEqualTo("ONLINE");
        assertThat(logs.get(0).getNewAvailability()).isEqualTo("OFFLINE");

        // 4. OFFLINE -> OFFLINE (Creates 0 additional logs)
        restTemplate.exchange(
            url("/api/v1/counters/" + counterId + "/availability"),
            HttpMethod.PUT,
            new HttpEntity<>(req, bearerJson(token)),
            CounterResponse.class);
            
        logs = logRepository.findByCounterIdOrderByChangedAtDesc(counterId);
        assertThat(logs).hasSize(2); // Still 2
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
