package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsSummaryResponse;
import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import com.align.qms.exception.GlobalExceptionHandler;
import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.exception.OrganizationNotFoundException;
import com.align.qms.exception.UnauthorizedTenantAccessException;
import com.align.qms.location.LocationRepository;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.TenantContext;
import com.align.qms.security.UserPrincipal;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Isolated unit and controller regression tests for ALIGN Analytics validation,
 * location ownership enforcement, and centralized error handling (Phase 2I).
 *
 * <p>Demonstrably isolated: uses pure Mockito mocks and MockMvc standaloneSetup.
 * Does not start Spring application context, does not connect to PostgreSQL,
 * and does not execute database operations or start Testcontainers.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class AnalyticsImplementationTest {

    @Mock
    private AnalyticsRepository analyticsRepository;

    @Mock
    private QueueRepository queueRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private LocationRepository locationRepository;

    private AnalyticsService analyticsService;
    private AnalyticsController analyticsController;
    private MockMvc mockMvc;

    private final UUID orgId1 = UUID.fromString("e2e00000-0000-0000-0000-000000000001");
    private final UUID loc1Org1 = UUID.fromString("e2e00000-0000-0000-0000-000000000002");
    private final UUID orgId2 = UUID.fromString("22f5b505-8fb0-4f15-a191-d741602e5bbf");
    private final UUID loc1Org2 = UUID.fromString("a3e8316f-34a4-4176-8291-7b68221df402");

    private final Organization org1 = new Organization("ORG-E2E", "E2E Organization", "Technology", "admin@align.local");
    private final Organization org2 = new Organization("SYNC-C452-O0", "Sync Org 0", "Retail", "admin2@align.local");

    private Instant start;
    private Instant end;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(
            analyticsRepository,
            queueRepository,
            organizationRepository,
            locationRepository
        );
        analyticsController = new AnalyticsController(analyticsService);
        mockMvc = MockMvcBuilders.standaloneSetup(analyticsController)
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

        start = Instant.now().minus(1, ChronoUnit.DAYS);
        end = Instant.now();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setAuth(UUID orgId, String role) {
        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(UUID.randomUUID());
        lenient().when(principal.getOrgId()).thenReturn(orgId);
        lenient().when(principal.getRole()).thenReturn(UserRole.valueOf(role));
        lenient().when(principal.getAuthorities()).thenAnswer(i ->
            List.of(new SimpleGrantedAuthority("ROLE_" + role)));

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Service-Level Tests: Location Ownership & Guard Verification
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void testSummaryMetrics_ValidOrgAndLocation_Success() {
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(loc1Org1, orgId1)).thenReturn(true);

        when(analyticsRepository.getOperationalTokenVolume(orgId1, loc1Org1, null, null, start, end)).thenReturn(5L);
        when(analyticsRepository.getCompletedTokens(orgId1, loc1Org1, null, null, start, end)).thenReturn(2L);
        when(analyticsRepository.getEventVolume(orgId1, loc1Org1, null, null, start, end, "TOKEN_NO_SHOW")).thenReturn(1L);
        when(analyticsRepository.getEventVolume(orgId1, loc1Org1, null, null, start, end, "TOKEN_CANCELLED")).thenReturn(1L);
        when(analyticsRepository.getEventVolume(orgId1, loc1Org1, null, null, start, end, "TOKEN_TRANSFERRED")).thenReturn(1L);
        when(analyticsRepository.getCurrentQueueLoad(orgId1, loc1Org1, null, null)).thenReturn(1L);

        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);

        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume());
        assertEquals(2, summary.getCompletedTokens());
        assertEquals(1, summary.getNoShows());
        assertEquals(1, summary.getCancellations());
        assertEquals(1, summary.getTransfers());
        assertEquals(1, summary.getCurrentQueueLoad());
        assertEquals(2.0 / 5.0, summary.getCompletionRate(), 0.001);

        verify(organizationRepository).findById(orgId1);
        verify(locationRepository).existsByIdAndOrgId(loc1Org1, orgId1);
        verify(analyticsRepository).getOperationalTokenVolume(orgId1, loc1Org1, null, null, start, end);
    }

    @Test
    void testSummaryMetrics_OmittedLocation_PreservesOrgWideBehavior() {
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(analyticsRepository.getOperationalTokenVolume(orgId1, null, null, null, start, end)).thenReturn(5L);

        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, null, null, null, start, end);

        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume());
        verify(organizationRepository).findById(orgId1);
        verifyNoInteractions(locationRepository);
    }

    @Test
    void testTenantIsolation_OrgAdminForeignLocationReturnsNoData() {
        // Replaces previous test: foreign location now explicitly throws LocationNotFoundException
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(loc1Org2, orgId1)).thenReturn(false);

        LocationNotFoundException ex = assertThrows(LocationNotFoundException.class, () ->
            analyticsService.getSummary(orgId1, loc1Org2, null, null, start, end)
        );

        assertEquals("Location not found: " + loc1Org2, ex.getMessage());
        verify(locationRepository).existsByIdAndOrgId(loc1Org2, orgId1);
        verifyNoInteractions(analyticsRepository);
        verifyNoInteractions(queueRepository);
    }

    @Test
    void testTenantIsolation_NonexistentLocation_ThrowsLocationNotFoundException() {
        UUID nonexistentLocId = UUID.randomUUID();
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(nonexistentLocId, orgId1)).thenReturn(false);

        assertThrows(LocationNotFoundException.class, () ->
            analyticsService.getSummary(orgId1, nonexistentLocId, null, null, start, end)
        );

        verifyNoInteractions(analyticsRepository);
    }

    @Test
    void testQueueAnalytics_MismatchedLocation_ThrowsBeforeQueueLookup() {
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(loc1Org2, orgId1)).thenReturn(false);

        assertThrows(LocationNotFoundException.class, () ->
            analyticsService.getQueueAnalytics(orgId1, loc1Org2, start, end)
        );

        verifyNoInteractions(queueRepository);
        verifyNoInteractions(analyticsRepository);
    }

    @Test
    void testTenantIsolation_OrgAdminCannotAccessAnotherOrg() {
        setAuth(orgId2, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));

        assertThrows(UnauthorizedTenantAccessException.class, () ->
            analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end)
        );

        verifyNoInteractions(locationRepository);
        verifyNoInteractions(analyticsRepository);
    }

    @Test
    void testPlatformAdmin_CanQueryAuthorizedTargetOrg() {
        setAuth(null, "PLATFORM_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(loc1Org1, orgId1)).thenReturn(true);
        when(analyticsRepository.getOperationalTokenVolume(orgId1, loc1Org1, null, null, start, end)).thenReturn(5L);

        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);

        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume());
        verify(analyticsRepository).getOperationalTokenVolume(orgId1, loc1Org1, null, null, start, end);
    }

    @Test
    void testPlatformAdmin_CannotCombineTargetOrgWithForeignResource() {
        setAuth(null, "PLATFORM_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));
        when(locationRepository.existsByIdAndOrgId(loc1Org2, orgId1)).thenReturn(false);

        assertThrows(LocationNotFoundException.class, () ->
            analyticsService.getSummary(orgId1, loc1Org2, null, null, start, end)
        );

        verifyNoInteractions(analyticsRepository);
    }

    @Test
    void testNonexistentOrganization_ThrowsOrganizationNotFoundException() {
        UUID nonexistentOrgId = UUID.randomUUID();
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(nonexistentOrgId)).thenReturn(Optional.empty());

        assertThrows(OrganizationNotFoundException.class, () ->
            analyticsService.getSummary(nonexistentOrgId, null, null, null, start, end)
        );

        verifyNoInteractions(locationRepository);
        verifyNoInteractions(analyticsRepository);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTTP-Level Controller & Exception Handler Regression Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void testHttp_MissingRequiredOrgId_Returns400_InvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                .param("start", start.toString())
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.message").value("Required parameter 'orgId' is missing"));
    }

    @Test
    void testHttp_MissingRequiredStart_Returns400_InvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                .param("orgId", orgId1.toString())
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.message").value("Required parameter 'start' is missing"));
    }

    @Test
    void testHttp_MissingRequiredLocationIdOnQueues_Returns400_InvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/queues")
                .param("orgId", orgId1.toString())
                .param("start", start.toString())
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.message").value("Required parameter 'locationId' is missing"));
    }

    @Test
    void testHttp_MalformedUuid_Returns400_InvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                .param("orgId", "not-a-valid-uuid")
                .param("start", start.toString())
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.message").value("Invalid value for parameter 'orgId'"));
    }

    @Test
    void testHttp_MalformedTimestamp_Returns400_InvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                .param("orgId", orgId1.toString())
                .param("start", "invalid-timestamp")
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.message").value("Invalid value for parameter 'start'"));
    }

    @Test
    void testHttp_UnexpectedServerException_Returns500_InternalServerError() throws Exception {
        when(analyticsRepository.getOperationalTokenVolume(any(), any(), any(), any(), any(), any()))
            .thenThrow(new RuntimeException("Simulated unexpected database failure"));
        setAuth(orgId1, "ORG_ADMIN");
        when(organizationRepository.findById(orgId1)).thenReturn(Optional.of(org1));

        mockMvc.perform(get("/api/v1/analytics/summary")
                .param("orgId", orgId1.toString())
                .param("start", start.toString())
                .param("end", end.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500))
            .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
            .andExpect(jsonPath("$.message").value("An unexpected error occurred"));
    }
}
