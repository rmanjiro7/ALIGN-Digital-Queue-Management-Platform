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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
        try {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

            if (accessor != null) {
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = extractToken(accessor);
                    if (token == null || !jwtService.isTokenValid(token)) {
                        throw new IllegalArgumentException("Invalid or missing JWT");
                    }

                    UserRole role = jwtService.extractRole(token);
                    Authentication auth;
                    
                    if (role == UserRole.CUSTOMER_TOKEN) {
                        UUID tokenId = UUID.fromString(jwtService.extractUserId(token));
                        UUID orgId = jwtService.extractOrgId(token);
                        UUID locationId = jwtService.extractLocationId(token);
                        
                        UserPrincipal principal = new UserPrincipal(
                                tokenId, orgId, locationId,
                                "customer_" + tokenId + "@anonymous.local", "",
                                UserRole.CUSTOMER_TOKEN, true
                        );
                        auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    } else {
                        String userId = jwtService.extractUserId(token);
                        UserPrincipal userDetails = (UserPrincipal) userDetailsService.loadUserById(UUID.fromString(userId));

                        if (!userDetails.isEnabled()) {
                            throw new IllegalArgumentException("Account disabled");
                        }

                        auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    }
                    
                    StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                    mutableAccessor.setUser(auth);
                    if (mutableAccessor.getSessionAttributes() != null) {
                        mutableAccessor.getSessionAttributes().put("AUTH_USER", auth);
                    }
                    return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    Authentication auth = (Authentication) accessor.getUser();
                    if (auth == null && accessor.getSessionAttributes() != null) {
                        auth = (Authentication) accessor.getSessionAttributes().get("AUTH_USER");
                    }
                    if (auth == null || !auth.isAuthenticated()) {
                        throw new IllegalArgumentException("Not authenticated");
                    }

                    UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
                    String destination = accessor.getDestination();

                    if (principal.getRole() == UserRole.CUSTOMER_TOKEN) {
                        String expectedTopic = "/topic/token/" + principal.getId();
                        if (!expectedTopic.equals(destination)) {
                            throw new IllegalArgumentException("CUSTOMER_TOKEN can only subscribe to its own token topic. Expected: " + expectedTopic + ", Got: " + destination);
                        }
                    } else if (destination != null && destination.startsWith("/topic/token/")) {
                        throw new IllegalArgumentException("Only CUSTOMER_TOKEN can subscribe to token topics");
                    } else if (destination != null && destination.startsWith("/topic/tenant/")) {
                        Matcher m = Pattern.compile("^/topic/tenant/([^/]+)/location/([^/]+)/(public|staff)$").matcher(destination);
                        if (!m.matches()) {
                            throw new IllegalArgumentException("Malformed tenant destination");
                        }
                        UUID orgId;
                        UUID locId;
                        try {
                            orgId = UUID.fromString(m.group(1));
                            locId = UUID.fromString(m.group(2));
                        } catch (IllegalArgumentException e) {
                            throw new IllegalArgumentException("Malformed UUID in destination");
                        }
                        String targetChannel = m.group(3);

                        if (principal.getRole() == UserRole.PLATFORM_ADMIN) {
                            // Allow all
                        } else if (principal.getRole() == UserRole.ORG_ADMIN) {
                            Location location = locationRepository.findById(locId)
                                    .orElseThrow(() -> new IllegalArgumentException("Location not found"));
                            if (!location.getOrgId().equals(principal.getOrgId()) || !orgId.equals(principal.getOrgId())) {
                                throw new IllegalArgumentException("Tenant isolation violation");
                            }
                        } else if (principal.getRole() == UserRole.STAFF) {
                            if (!locId.equals(principal.getLocationId()) || !orgId.equals(principal.getOrgId())) {
                                throw new IllegalArgumentException("STAFF location mismatch");
                            }
                        } else if (principal.getRole() == UserRole.DISPLAY) {
                            if (!"public".equals(targetChannel)) {
                                throw new IllegalArgumentException("DISPLAY can only subscribe to public channel");
                            }
                            if (!locId.equals(principal.getLocationId()) || !orgId.equals(principal.getOrgId())) {
                                throw new IllegalArgumentException("DISPLAY location mismatch");
                            }
                        } else {
                            throw new IllegalArgumentException("Unknown role");
                        }
                    } else if (destination != null && destination.startsWith("/topic/location.")) {
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
                        throw new IllegalArgumentException("Destination not allowed: " + destination);
                    }
                    
                    // Set the user on the message so it's available downstream
                    StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                    mutableAccessor.setUser(auth);
                    return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                } else if (StompCommand.SEND.equals(accessor.getCommand())) {
                    Authentication auth = (Authentication) accessor.getUser();
                    if (auth == null && accessor.getSessionAttributes() != null) {
                        auth = (Authentication) accessor.getSessionAttributes().get("AUTH_USER");
                    }
                    if (auth == null || !auth.isAuthenticated()) {
                        throw new IllegalArgumentException("Not authenticated for SEND");
                    }
                    StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                    mutableAccessor.setUser(auth);
                    return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                } else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                    Authentication auth = (Authentication) accessor.getUser();
                    if (auth == null && accessor.getSessionAttributes() != null) {
                        auth = (Authentication) accessor.getSessionAttributes().get("AUTH_USER");
                    }
                    if (auth != null) {
                        StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                        mutableAccessor.setUser(auth);
                        return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                    }
                }
            }
            return message;
        } catch (Exception ex) {
            System.err.println("[STOMP INTERCEPTOR ERROR] " + ex.getMessage());
            ex.printStackTrace();
            throw ex;
        }
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
