package com.align.qms.token;

import com.align.qms.PostgresIntegrationTest;
import com.align.qms.exception.StepAwayAlreadyUsedException;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TokenLifecycleTest extends PostgresIntegrationTest {

    @Autowired private TokenService tokenService;
    @Autowired private QueueRepository queueRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private TokenEventRepository tokenEventRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID serviceId;

    @BeforeEach
    void setUp() {
        tokenEventRepository.deleteAll();
        tokenRepository.deleteAll();
        queueRepository.deleteAll();
        
        UUID orgId = UUID.randomUUID();
        UUID locationId = UUID.randomUUID();
        serviceId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId, orgId.toString().substring(0, 8), "Test Org");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locationId, orgId, "Test Loc");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())", serviceId, locationId, orgId, "Test Service", false);

        Queue queue = new Queue(orgId, locationId, serviceId, "Test Queue", "B", 10);
        queueRepository.save(queue);
    }

    @Test
    @DisplayName("Lifecycle: Join -> Step Away -> Return -> Cancel")
    void testTokenLifecycle() {
        // JOIN
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(serviceId);
        TokenResponse token = tokenService.joinQueue(req);
        assertThat(token.getState()).isEqualTo(TokenState.WAITING);

        // STEP AWAY
        TokenResponse steppedAway = tokenService.stepAway(token.getId());
        assertThat(steppedAway.getState()).isEqualTo(TokenState.AWAY);
        assertThat(steppedAway.getStepAwayExpiresAt()).isNotNull();

        // CANNOT STEP AWAY TWICE
        assertThrows(StepAwayAlreadyUsedException.class, () -> {
            tokenService.stepAway(token.getId());
        });

        // RETURN
        TokenResponse returned = tokenService.returnFromStepAway(token.getId());
        assertThat(returned.getState()).isEqualTo(TokenState.WAITING);

        // CANCEL
        TokenResponse cancelled = tokenService.cancelToken(token.getId());
        assertThat(cancelled.getState()).isEqualTo(TokenState.CANCELLED);
        
        // Assert events were recorded
        long eventCount = tokenEventRepository.count();
        assertThat(eventCount).isEqualTo(4); // JOINED, STEPPED_AWAY, RETURNED, CANCELLED
    }

    @Test
    @DisplayName("Lifecycle: Step Away Expiry")
    void testStepAwayExpiry() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(serviceId);
        TokenResponse token = tokenService.joinQueue(req);

        tokenService.stepAway(token.getId());
        
        // Force expire it in DB
        jdbcTemplate.update("UPDATE tokens SET step_away_expires_at = now() - interval '1 minute' WHERE id = ?", token.getId());
        
        assertThrows(com.align.qms.exception.InvalidTokenStateException.class, () -> {
            tokenService.returnFromStepAway(token.getId());
        });
        
        TokenResponse expiredToken = tokenService.getToken(token.getId());
        assertThat(expiredToken.getState()).isEqualTo(TokenState.EXPIRED);
    }

    @Test
    @DisplayName("Lifecycle: Invalid Transitions")
    void testInvalidTransitions() {
        TokenJoinRequest req = new TokenJoinRequest();
        req.setServiceId(serviceId);
        TokenResponse token = tokenService.joinQueue(req);

        // Cannot return if not AWAY
        assertThrows(com.align.qms.exception.InvalidTokenStateException.class, () -> {
            tokenService.returnFromStepAway(token.getId());
        });
    }
}
