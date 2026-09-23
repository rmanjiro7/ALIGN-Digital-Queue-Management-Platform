package com.align.qms.queue;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.security.JwtService;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.hasSize;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QueueWarningControllerIntegrationTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID org1Id = UUID.randomUUID();
    private UUID org2Id = UUID.randomUUID();
    private UUID loc1Id = UUID.randomUUID();
    private UUID service1Id = UUID.randomUUID();
    private UUID queue1Id = UUID.randomUUID();

    private String staffToken;
    private String adminToken;
    private String platformToken;
    private String displayToken;


    @BeforeEach
    void setup() {
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, 'ORG1', 'Org1', 'ACTIVE')", org1Id);
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, 'ORG2', 'Org2', 'ACTIVE')", org2Id);

        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, 'Loc1', now(), now())", loc1Id, org1Id);

        jdbcTemplate.update("INSERT INTO services (id, org_id, location_id, name, description) VALUES (?, ?, ?, 'Service1', 'Desc')", service1Id, org1Id, loc1Id);

        jdbcTemplate.update("INSERT INTO queues (id, org_id, location_id, service_id, name, capacity_warning_active, wait_warning_active) VALUES (?, ?, ?, ?, 'Queue1', true, false)", queue1Id, org1Id, loc1Id, service1Id);

        String pwd = passwordEncoder.encode("password");

        UUID staffId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, 'staff@org1.com', ?, 'Staff One', 'STAFF', 'ACTIVE', now(), now())", staffId, org1Id, loc1Id, pwd);
        User staff = userRepository.findById(staffId).orElseThrow();
        staffToken = jwtService.generateAccessToken(staff);

        UUID adminId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO users (id, org_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, 'admin@org1.com', ?, 'Admin One', 'ORG_ADMIN', 'ACTIVE', now(), now())", adminId, org1Id, pwd);
        User admin = userRepository.findById(adminId).orElseThrow();
        adminToken = jwtService.generateAccessToken(admin);

        UUID platformId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, 'super@platform.com', ?, 'Super Admin', 'PLATFORM_ADMIN', 'ACTIVE', now(), now())", platformId, pwd);
        User platform = userRepository.findById(platformId).orElseThrow();
        platformToken = jwtService.generateAccessToken(platform);

        UUID displayId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, 'display@org1.com', ?, 'Disp One', 'DISPLAY', 'ACTIVE', now(), now())", displayId, org1Id, loc1Id, pwd);
        User display = userRepository.findById(displayId).orElseThrow();
        displayToken = jwtService.generateAccessToken(display);
    }

    @AfterEach
    void cleanup() {
        jdbcTemplate.execute("DELETE FROM queues");
        jdbcTemplate.execute("DELETE FROM services");
        jdbcTemplate.execute("DELETE FROM users");
        jdbcTemplate.execute("DELETE FROM locations");
        jdbcTemplate.execute("DELETE FROM organizations");
    }

    @Test
    void testStaffCanReadWarnings() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-warnings")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].queueId").value(queue1Id.toString()))
                .andExpect(jsonPath("$[0].capacityWarningActive").value(true))
                .andExpect(jsonPath("$[0].waitWarningActive").value(false));
    }

    @Test
    void testOrgAdminCanReadWarnings() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-warnings")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void testPlatformAdminCanReadWarnings() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-warnings")
                .header("Authorization", "Bearer " + platformToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void testDisplayRejected() throws Exception {
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-warnings")
                .header("Authorization", "Bearer " + displayToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testCrossTenantRejected() throws Exception {
        UUID otherAdminId = UUID.randomUUID();
        String pwd = passwordEncoder.encode("password");
        jdbcTemplate.update("INSERT INTO users (id, org_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, 'admin@org2.com', ?, 'Admin Two', 'ORG_ADMIN', 'ACTIVE', now(), now())", otherAdminId, org2Id, pwd);
        User otherAdmin = userRepository.findById(otherAdminId).orElseThrow();
        String otherAdminToken = jwtService.generateAccessToken(otherAdmin);

        // Expect empty list because TenantContext limits to caller's org queues
        mockMvc.perform(get("/api/v1/locations/" + loc1Id + "/queue-warnings")
                .header("Authorization", "Bearer " + otherAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
