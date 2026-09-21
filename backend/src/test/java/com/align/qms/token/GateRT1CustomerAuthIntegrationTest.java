package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.JwtService;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class GateRT1CustomerAuthIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private QueueRepository queueRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    
    private UUID orgAId = UUID.randomUUID();
    private UUID locAId = UUID.randomUUID();
    private UUID srvAId = UUID.randomUUID();
    private UUID queueAId = UUID.randomUUID();

    @BeforeEach
    public void setup() {
        jdbcTemplate.update("DELETE FROM counter_service_assignments");
        tokenRepository.deleteAll();
        queueRepository.deleteAll();
        serviceRepository.deleteAll();
        locationRepository.deleteAll();
        organizationRepository.deleteAll();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE')", 
                            orgAId, "ORG-A", "Org A");
        
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, status, is_hq) VALUES (?, ?, ?, 'ACTIVE', true)", 
                            locAId, orgAId, "Loc A");
        
        jdbcTemplate.update("INSERT INTO services (id, org_id, location_id, name, enabled, is_fast_track) VALUES (?, ?, ?, ?, true, false)", 
                            srvAId, orgAId, locAId, "Service A");
        
        jdbcTemplate.update("INSERT INTO queues (id, org_id, location_id, service_id, name, token_prefix, max_capacity, status, auto_pause_at_capacity) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', false)", 
                            queueAId, orgAId, locAId, srvAId, "Queue A", "A-", 100);
    }

    @Test
    public void testCustomerRealtimeCredentialIssuedOnJoin() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(srvAId);
        req.setCustomerName("Alice");

        ResponseEntity<TokenResponse> response = restTemplate.postForEntity(
                "/api/v1/tokens", req, TokenResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        TokenResponse tokenResp = response.getBody();
        assertThat(tokenResp).isNotNull();
        assertThat(tokenResp.getId()).isNotNull();
        
        // A. Token-scoped credential issued after successful queue join
        String jwt = tokenResp.getRealtimeToken();
        assertThat(jwt).isNotNull().isNotEmpty();

        // B. Credential contains correct tokenId/orgId/locationId
        assertThat(jwtService.isTokenValid(jwt)).isTrue();
        assertThat(jwtService.extractUserId(jwt)).isEqualTo(tokenResp.getId().toString()); // subject
        assertThat(jwtService.extractOrgId(jwt)).isEqualTo(orgAId);
        assertThat(jwtService.extractLocationId(jwt)).isEqualTo(locAId);
        assertThat(jwtService.extractRole(jwt).name()).isEqualTo("CUSTOMER_TOKEN");

        // F. Realtime credential is not granted STAFF/ADMIN authorities
        assertThat(jwtService.extractRole(jwt).name()).isNotEqualTo("STAFF");
        assertThat(jwtService.extractRole(jwt).name()).isNotEqualTo("ORG_ADMIN");
    }

    @Test
    public void testCustomerRealtimeCredentialCannotBeUsedForRestAuth() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(srvAId);
        req.setCustomerName("Bob");

        ResponseEntity<TokenResponse> joinResp = restTemplate.postForEntity(
                "/api/v1/tokens", req, TokenResponse.class);
        String jwt = joinResp.getBody().getRealtimeToken();

        // E. Credential cannot be used as normal user authentication
        // Attempt to hit an admin endpoint or authenticated endpoint with this JWT
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // GET /api/v1/locations (Admin API)
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/locations", HttpMethod.GET, request, String.class);

        // The JWT filter extracts subject, tries to load User, fails because it's a tokenId, leaves unauthenticated => 401
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    public void testCustomerRealtimeCredentialCannotHitSecuredTokenEndpoints() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(srvAId);
        req.setCustomerName("Charlie");

        ResponseEntity<TokenResponse> joinResp = restTemplate.postForEntity(
                "/api/v1/tokens", req, TokenResponse.class);
        TokenResponse token = joinResp.getBody();
        String jwt = token.getRealtimeToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Even hitting the GET /api/v1/locations requires standard auth (e.g. staff/admin)
        // because the filter won't authenticate a CUSTOMER_TOKEN
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/locations", HttpMethod.GET, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    public void testIdempotencyReturnsRealtimeToken() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(srvAId);
        req.setCustomerName("Dave");
        req.setIdempotencyKey("test-idemp-123");

        ResponseEntity<TokenResponse> joinResp1 = restTemplate.postForEntity(
                "/api/v1/tokens", req, TokenResponse.class);
        String jwt1 = joinResp1.getBody().getRealtimeToken();
        assertThat(jwt1).isNotNull();

        // H. Existing token-join/idempotency behavior remains unchanged
        ResponseEntity<TokenResponse> joinResp2 = restTemplate.postForEntity(
                "/api/v1/tokens", req, TokenResponse.class);
        String jwt2 = joinResp2.getBody().getRealtimeToken();
        assertThat(jwt2).isNotNull();

        assertThat(joinResp1.getBody().getId()).isEqualTo(joinResp2.getBody().getId());
    }
}
