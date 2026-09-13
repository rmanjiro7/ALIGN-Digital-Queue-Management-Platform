package com.align.qms.security;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.user.UserRole;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Component
public class WebSocketSecurityInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final LocationRepository locationRepository;

    public WebSocketSecurityInterceptor(JwtService jwtService,
                                        UserDetailsServiceImpl userDetailsService,
                                        LocationRepository locationRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.locationRepository = locationRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String token = extractToken(accessor);
                if (token == null || !jwtService.isTokenValid(token)) {
                    throw new IllegalArgumentException("Invalid or missing JWT");
                }

                String userId = jwtService.extractUserId(token);
                UserPrincipal userDetails = (UserPrincipal) userDetailsService.loadUserById(UUID.fromString(userId));

                if (!userDetails.isEnabled()) {
                    throw new IllegalArgumentException("Account disabled");
                }

                Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                
                StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                mutableAccessor.setUser(auth);
                return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
            } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                Authentication auth = (Authentication) accessor.getUser();
                if (auth == null || !auth.isAuthenticated()) {
                    throw new IllegalArgumentException("Not authenticated");
                }

                UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
                String destination = accessor.getDestination();

                if (destination != null && destination.startsWith("/topic/location.")) {
                    String locIdStr = destination.substring("/topic/location.".length());
                    UUID locId;
                    try {
                        locId = UUID.fromString(locIdStr);
                    } catch (IllegalArgumentException e) {
                        throw new IllegalArgumentException("Malformed destination");
                    }

                    if (principal.getRole() == UserRole.PLATFORM_ADMIN) {
                        // Allow all
                    } else if (principal.getRole() == UserRole.ORG_ADMIN) {
                        Location location = locationRepository.findById(locId)
                                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
                        if (!location.getOrgId().equals(principal.getOrgId())) {
                            throw new IllegalArgumentException("Tenant isolation violation");
                        }
                    } else if (principal.getRole() == UserRole.STAFF || principal.getRole() == UserRole.DISPLAY) {
                        if (!locId.equals(principal.getLocationId())) {
                            throw new IllegalArgumentException(principal.getRole().name() + " location mismatch");
                        }
                    } else {
                        throw new IllegalArgumentException("Unknown role");
                    }
                } else {
                    throw new IllegalArgumentException("Destination not allowed");
                }
            }
        }
        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
