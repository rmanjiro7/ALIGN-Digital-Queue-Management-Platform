package com.align.qms.location;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.counter.CounterRepository;
import com.align.qms.location.dto.LocationSnapshotResponse;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.JwtService;
import com.align.qms.service.ServiceRepository;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocationSnapshotIntegrationTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private LocationRepository locationRepository;
    @Autowired private CounterRepository counterRepository;
    @Autowired private QueueRepository queueRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID org1Id;
    private UUID org2Id;
    private UUID loc1Id;
    private UUID loc2Id;
    private UUID displayUserLoc1Id;
    private UUID staffUserLoc1Id;
    private UUID orgAdminOrg1Id;
    private UUID platformAdminId;

    private UUID serviceId;
    private UUID queueId;
    private UUID counter1Id;
    private UUID counter2Id;
    
    private UUID tokenAId; // WAITING
    private UUID tokenBId; // CALLED
    private UUID tokenCId; // IN_SERVICE
    private UUID tokenDId; // COMPLETED

    @BeforeEach
    void setUp() {
        org1Id = UUID.randomUUID();
        org2Id = UUID.randomUUID();
        loc1Id = UUID.randomUUID();
        loc2Id = UUID.randomUUID();
        displayUserLoc1Id = UUID.randomUUID();
        staffUserLoc1Id = UUID.randomUUID();
        orgAdminOrg1Id = UUID.randomUUID();
        platformAdminId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", org1Id, "ORG1", "Org1");
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", org2Id, "ORG2", "Org2");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", loc1Id, org1Id, "Loc1");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", loc2Id, org2Id, "Loc2");

        String pwd = passwordEncoder.encode("password");

        // Display user for Loc1
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                displayUserLoc1Id, org1Id, loc1Id, "display1@test.com", pwd, "Display 1", "DISPLAY", "ACTIVE");
        
        // Staff user for Loc1
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                staffUserLoc1Id, org1Id, loc1Id, "staff1@test.com", pwd, "Staff 1", "STAFF", "ACTIVE");

        // Org Admin for Org1
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                orgAdminOrg1Id, org1Id, null, "admin1@test.com", pwd, "Admin 1", "ORG_ADMIN", "ACTIVE");

        // Platform Admin
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                platformAdminId, null, null, "platform@test.com", pwd, "Platform", "PLATFORM_ADMIN", "ACTIVE");

        serviceId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO services (id, org_id, location_id, name, description, icon, enabled, is_fast_track) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                serviceId, org1Id, loc1Id, "Test Service", "Test", "icon", true, false);

        queueId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO queues (id, org_id, location_id, service_id, name, token_prefix, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                queueId, org1Id, loc1Id, serviceId, "Test Queue", "TQ", "ACTIVE");

        counter1Id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO counters (id, org_id, location_id, number, name, status, availability) VALUES (?, ?, ?, ?, ?, ?, ?)",
                counter1Id, org1Id, loc1Id, 1, "C1", "ACTIVE", "ONLINE");

        counter2Id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO counters (id, org_id, location_id, number, name, status, availability) VALUES (?, ?, ?, ?, ?, ?, ?)",
                counter2Id, org1Id, loc1Id, 2, "C2", "ACTIVE", "ONLINE");

        tokenAId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, service_id, queue_id, token_number, state, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now(), now())",
                tokenAId, org1Id, loc1Id, serviceId, queueId, "A001", "WAITING");

        tokenBId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, service_id, queue_id, token_number, state, counter_id, called_at, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now(), now(), now())",
                tokenBId, org1Id, loc1Id, serviceId, queueId, "B001", "CALLED", counter1Id);
        
        jdbcTemplate.update("UPDATE counters SET current_serving_token_id = ?, service_start_time = now() WHERE id = ?", tokenBId, counter1Id);

        tokenCId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, service_id, queue_id, token_number, state, counter_id, called_at, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now(), now(), now())",
                tokenCId, org1Id, loc1Id, serviceId, queueId, "C001", "IN_SERVICE", counter2Id);

        jdbcTemplate.update("UPDATE counters SET current_serving_token_id = ? WHERE id = ?", tokenCId, counter2Id);

        tokenDId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, service_id, queue_id, token_number, state, counter_id, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now(), now())",
                tokenDId, org1Id, loc1Id, serviceId, queueId, "D001", "COMPLETED", counter2Id);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM tokens");
        jdbcTemplate.update("DELETE FROM counters");
        jdbcTemplate.update("DELETE FROM queues");
        jdbcTemplate.update("DELETE FROM services");
        jdbcTemplate.update("DELETE FROM users");
        jdbcTemplate.update("DELETE FROM locations");
        jdbcTemplate.update("DELETE FROM organizations");
    }

    private String getJwt(UUID userId) {
        User u = userRepository.findById(userId).orElseThrow();
        return jwtService.generateAccessToken(u);
    }

    @Test
    void test1_displayCanFetchAssignedLocationSnapshot() throws Exception {
        String res = mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(displayUserLoc1Id)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        LocationSnapshotResponse snapshot = objectMapper.readValue(res, LocationSnapshotResponse.class);
        assertThat(snapshot.getLocationId()).isEqualTo(loc1Id);
        assertThat(snapshot.getWaitingTokens()).hasSize(1);
        assertThat(snapshot.getWaitingTokens().get(0).getId()).isEqualTo(tokenAId);
        assertThat(snapshot.getActiveTokens()).hasSize(2); // B and C
        assertThat(snapshot.getCounters()).hasSize(2);
        assertThat(snapshot.getServices()).hasSize(1);
        assertThat(snapshot.getServices().get(0).getId()).isEqualTo(serviceId);
        
        assertThat(snapshot.getActiveTokens()).noneMatch(t -> t.getId().equals(tokenDId));
    }

    @Test
    void test2_displayCannotFetchAnotherLocationInSameOrg() throws Exception {
        UUID otherLoc = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", otherLoc, org1Id, "Loc3");

        mockMvc.perform(get("/api/v1/locations/" + otherLoc + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(displayUserLoc1Id)))
                .andExpect(status().isForbidden());
    }

    @Test
    void test3_displayCannotFetchAnotherOrganizationLocation() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc2Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(displayUserLoc1Id)))
                .andExpect(status().isForbidden());
    }

    @Test
    void test4_staffCanFetchAuthorizedLocation() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(staffUserLoc1Id)))
                .andExpect(status().isOk());
    }

    @Test
    void test5_staffCannotFetchAnotherLocation() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc2Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(staffUserLoc1Id)))
                .andExpect(status().isForbidden());
    }

    @Test
    void test6_orgAdminCanFetchLocationsInItsOrganization() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(orgAdminOrg1Id)))
                .andExpect(status().isOk());
    }

    @Test
    void test7_orgAdminCannotFetchAnotherOrganizationLocation() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc2Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(orgAdminOrg1Id)))
                .andExpect(status().isForbidden());
    }

    @Test
    void test8_platformAdminCanFetchAnyLocation() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(platformAdminId)))
                .andExpect(status().isOk());
        
        mockMvc.perform(get("/api/v1/locations/" + loc2Id + "/queue-snapshot")
                .header("Authorization", "Bearer " + getJwt(platformAdminId)))
                .andExpect(status().isOk());
    }

    @Test
    void test9_unauthenticatedRejected() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-snapshot"))
                .andExpect(status().isUnauthorized()); // 401
    }
}
