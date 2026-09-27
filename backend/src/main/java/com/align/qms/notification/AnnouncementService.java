package com.align.qms.notification;

import com.align.qms.notification.dto.AnnouncementRequest;
import com.align.qms.notification.dto.AnnouncementResponse;
import com.align.qms.notification.event.AnnouncementRealtimeEvent;
import com.align.qms.security.TenantContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.align.qms.security.UserPrincipal;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AnnouncementService {

    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public AnnouncementService(NotificationRepository notificationRepository, ApplicationEventPublisher eventPublisher, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AnnouncementResponse createAnnouncement(AnnouncementRequest request) {
        UUID orgId = TenantContext.getCurrentOrgId();
        
        // Authorization check for location scoping
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            boolean isStaff = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
            if (isStaff && !request.getLocationId().equals(principal.getLocationId())) {
                throw new AccessDeniedException("Staff can only make announcements for their assigned location");
            }
        }

        Notification notification = new Notification();
        notification.setOrgId(orgId);
        notification.setLocationId(request.getLocationId());
        notification.setTokenId(request.getTokenId());
        notification.setType(NotificationType.BROADCAST_ANNOUNCEMENT);
        notification.setChannel(NotificationChannel.REALTIME);
        
        try {
            notification.setPayload(objectMapper.writeValueAsString(java.util.Map.of("message", request.getText())));
        } catch (Exception e) {
            notification.setPayload("{}");
        }
        
        notification.setStatus(NotificationStatus.SENT); // Immediate delivery conceptually
        notification.setIdempotencyKey("ANNOUNCE_" + UUID.randomUUID().toString()); // Assuming no strict idempotency key passed from client

        Notification saved = notificationRepository.save(notification);

        eventPublisher.publishEvent(new AnnouncementRealtimeEvent(
            this,
            orgId,
            request.getLocationId(),
            request.getText(),
            request.getTokenId(),
            request.getTokenNumber(),
            request.getCounterId(),
            request.getCounterNumber()
        ));

        return new AnnouncementResponse(
            saved.getId(),
            saved.getLocationId(),
            saved.getPayload(),
            saved.getStatus().name(),
            saved.getCreatedAt()
        );
    }
}
