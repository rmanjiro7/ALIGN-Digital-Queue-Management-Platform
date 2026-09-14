package com.align.qms.analytics;

import com.align.qms.location.LocationRepository;
import com.align.qms.security.TenantContext;
import com.align.qms.security.UserPrincipal;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsServiceTest {

    private AnalyticsRepository analyticsRepository;
    private LocationRepository locationRepository;
    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsRepository = mock(AnalyticsRepository.class);
        locationRepository = mock(LocationRepository.class);
        analyticsService = new AnalyticsService(analyticsRepository, locationRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(UserRole role, UUID orgId) {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(UUID.randomUUID());
        when(principal.getOrgId()).thenReturn(orgId);
        when(principal.getRole()).thenReturn(role);
        when(principal.getAuthorities()).thenAnswer(i -> 
            java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.name())));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @Test
    void missingDates_throwsIllegalArgumentException() {
        setSecurityContext(UserRole.ORG_ADMIN, UUID.randomUUID());
        assertThrows(IllegalArgumentException.class, () ->
            analyticsService.getOverview(null, null, null, Instant.now())
        );
    }

    @Test
    void invertedDates_throwsIllegalArgumentException() {
        setSecurityContext(UserRole.ORG_ADMIN, UUID.randomUUID());
        assertThrows(IllegalArgumentException.class, () ->
            analyticsService.getOverview(null, null, Instant.now(), Instant.now().minusSeconds(3600))
        );
    }

    @Test
    void rangeTooLarge_throwsIllegalArgumentException() {
        setSecurityContext(UserRole.ORG_ADMIN, UUID.randomUUID());
        Instant start = Instant.now();
        Instant end = start.plus(366, ChronoUnit.DAYS);
        assertThrows(IllegalArgumentException.class, () ->
            analyticsService.getOverview(null, null, start, end)
        );
    }

    @Test
    void rangeExactly365Days_success() {
        setSecurityContext(UserRole.ORG_ADMIN, UUID.randomUUID());
        Instant start = Instant.now();
        Instant end = start.plus(365, ChronoUnit.DAYS);
        
        when(analyticsRepository.getOverviewMetrics(any(), any(), any(), any()))
            .thenReturn(mock(com.align.qms.analytics.projection.OverviewProjection.class));
            
        analyticsService.getOverview(null, null, start, end); // Should not throw
    }

    @Test
    void platformAdmin_withoutOrgId_throwsIllegalArgumentException() {
        setSecurityContext(UserRole.PLATFORM_ADMIN, null);
        assertThrows(IllegalArgumentException.class, () ->
            analyticsService.getOverview(null, null, Instant.now(), Instant.now().plusSeconds(3600))
        );
    }
    
    @Test
    void orgAdmin_requestingDifferentOrg_throwsIllegalArgumentException() {
        setSecurityContext(UserRole.ORG_ADMIN, UUID.randomUUID());
        assertThrows(IllegalArgumentException.class, () ->
            analyticsService.getOverview(UUID.randomUUID(), null, Instant.now(), Instant.now().plusSeconds(3600))
        );
    }
}
