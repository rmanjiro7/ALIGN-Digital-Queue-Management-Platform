package com.align.qms.security;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.auth.LoginRequest;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import com.align.qms.user.UserStatus;
import com.align.qms.token.StaffOperationsController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DisplayIdentityIntegrationTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private LocationRepository locationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private WebSocketSecurityInterceptor webSocketSecurityInterceptor;

    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID orgId;
    private UUID locationId1;
    private UUID locationId2;
    private UUID displayUserId;
    private UUID staffUserId;
    private String displayJwt;

    @BeforeEach
    void setUp() throws Exception {
        orgId = UUID.randomUUID();
        locationId1 = UUID.randomUUID();
        locationId2 = UUID.randomUUID();
        displayUserId = UUID.randomUUID();
        staffUserId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, "ORG", "Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId1, orgId, "Loc 1");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId2, orgId, "Loc 2");

        String pwd = passwordEncoder.encode("password123");
        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                displayUserId, orgId, locationId1, "display@example.com", pwd, "Display", "DISPLAY", "ACTIVE");

        jdbcTemplate.update("INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                staffUserId, orgId, locationId1, "staff@example.com", pwd, "Staff", "STAFF", "ACTIVE");
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM users");
        jdbcTemplate.update("DELETE FROM locations");
        jdbcTemplate.update("DELETE FROM organizations");
    }

    @Test
    void test1_displayUserPersistedUnderV6Schema() {
        User fetched = userRepository.findById(displayUserId).orElseThrow();
        assertThat(fetched.getRole()).isEqualTo(UserRole.DISPLAY);
        assertThat(fetched.getLocationId()).isEqualTo(locationId1);
    }

    @Test
    void test2_displayAuthenticationProducesValidJwt() throws Exception {
        LoginRequest req = new LoginRequest("display@example.com", "password123");
        String res = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andReturn().getResponse().getContentAsString();

        displayJwt = objectMapper.readTree(res).get("accessToken").asText();
        assertThat(jwtService.isTokenValid(displayJwt)).isTrue();
        
        String userId = jwtService.extractUserId(displayJwt);
        assertThat(UUID.fromString(userId)).isEqualTo(displayUserId);
    }

    @Test
    void test4_displayStompConnectSucceeds() {
        User displayUser = userRepository.findById(displayUserId).orElseThrow();
        String token = jwtService.generateAccessToken(displayUser);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> processed = webSocketSecurityInterceptor.preSend(message, null);
        StompHeaderAccessor outAccessor = StompHeaderAccessor.getAccessor(processed, StompHeaderAccessor.class);
        assertThat(outAccessor.getUser()).isNotNull();
        assertThat(outAccessor.getUser().getName()).isNotNull();
    }

    @Test
    void test5_displayCanSubscribeToAssignedLocation() {
        User displayUser = userRepository.findById(displayUserId).orElseThrow();
        String token = jwtService.generateAccessToken(displayUser);
        StompHeaderAccessor connAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connAccessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> connMsg = MessageBuilder.createMessage(new byte[0], connAccessor.getMessageHeaders());
        Message<?> connProcessed = webSocketSecurityInterceptor.preSend(connMsg, null);
        
        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setUser(StompHeaderAccessor.getAccessor(connProcessed, StompHeaderAccessor.class).getUser());
        subAccessor.setDestination("/topic/location." + locationId1);
        Message<?> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        Message<?> subProcessed = webSocketSecurityInterceptor.preSend(subMsg, null);
        assertThat(subProcessed).isNotNull(); // Success
    }

    @Test
    void test6_displayCannotSubscribeToDifferentLocation() {
        User displayUser = userRepository.findById(displayUserId).orElseThrow();
        String token = jwtService.generateAccessToken(displayUser);
        StompHeaderAccessor connAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connAccessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> connMsg = MessageBuilder.createMessage(new byte[0], connAccessor.getMessageHeaders());
        Message<?> connProcessed = webSocketSecurityInterceptor.preSend(connMsg, null);
        
        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setUser(StompHeaderAccessor.getAccessor(connProcessed, StompHeaderAccessor.class).getUser());
        subAccessor.setDestination("/topic/location." + locationId2); // Different location
        Message<?> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        assertThatThrownBy(() -> webSocketSecurityInterceptor.preSend(subMsg, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("DISPLAY location mismatch");
    }

    @Test
    void test8_displayCannotCallNext() throws Exception {
        User displayUser = userRepository.findById(displayUserId).orElseThrow();
        String token = jwtService.generateAccessToken(displayUser);
        mockMvc.perform(post("/api/v1/staff/counters/" + UUID.randomUUID() + "/call-next")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void test11_displayCannotComplete() throws Exception {
        User displayUser = userRepository.findById(displayUserId).orElseThrow();
        String token = jwtService.generateAccessToken(displayUser);
        mockMvc.perform(post("/api/v1/staff/tokens/" + UUID.randomUUID() + "/complete?counterId=" + UUID.randomUUID())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
