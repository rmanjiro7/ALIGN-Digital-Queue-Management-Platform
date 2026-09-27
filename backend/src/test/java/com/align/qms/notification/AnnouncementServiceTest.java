package com.align.qms.notification;

import com.align.qms.notification.dto.AnnouncementRequest;
import com.align.qms.notification.dto.AnnouncementResponse;
import com.align.qms.notification.event.AnnouncementRealtimeEvent;
import com.align.qms.security.TenantContext;
import com.align.qms.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AnnouncementServiceTest {

    private NotificationRepository notificationRepository;
    private ApplicationEventPublisher eventPublisher;
    private AnnouncementService service;
    private UUID orgId;
    private UUID locationId;

    @BeforeEach
    public void setup() {
        notificationRepository = mock(NotificationRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new AnnouncementService(notificationRepository, eventPublisher, new com.fasterxml.jackson.databind.ObjectMapper());
        
        orgId = UUID.randomUUID();
        locationId = UUID.randomUUID();

        UserPrincipal principal = new UserPrincipal(
                UUID.randomUUID(),
                orgId,
                locationId,
                "test@align.local",
                "test",
                com.align.qms.user.UserRole.STAFF,
                true
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @Test
    public void testCreateAnnouncement_success() {
        AnnouncementRequest req = new AnnouncementRequest();
        req.setLocationId(locationId);
        req.setText("Test");

        when(notificationRepository.save(any())).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });

        AnnouncementResponse res = service.createAnnouncement(req);
        
        assertNotNull(res);
        assertEquals(locationId, res.getLocationId());
        
        ArgumentCaptor<AnnouncementRealtimeEvent> eventCaptor = ArgumentCaptor.forClass(AnnouncementRealtimeEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        
        assertEquals("Test", eventCaptor.getValue().getText());
        assertEquals(locationId, eventCaptor.getValue().getLocationId());
    }

    @Test
    public void testCreateAnnouncement_wrongLocation_throwsException() {
        AnnouncementRequest req = new AnnouncementRequest();
        req.setLocationId(UUID.randomUUID());
        req.setText("Test");

        assertThrows(AccessDeniedException.class, () -> service.createAnnouncement(req));
    }
}
