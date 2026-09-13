package com.align.qms.security;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.user.User;
import com.align.qms.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class WebSocketSecurityInterceptorTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @Mock
    private LocationRepository locationRepository;

    @InjectMocks
    private WebSocketSecurityInterceptor interceptor;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private Message<?> createMessage(StompCommand command, String destination, Authentication auth, String token) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (auth != null) {
            accessor.setUser(auth);
        }
        if (token != null) {
            accessor.addNativeHeader("Authorization", "Bearer " + token);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void validConnect_Succeeds() {
        String token = "valid_token";
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.isEnabled()).thenReturn(true);
        when(principal.getAuthorities()).thenReturn(List.of());

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(userId.toString());
        when(userDetailsService.loadUserById(userId)).thenReturn(principal);

        Message<?> msg = createMessage(StompCommand.CONNECT, null, null, token);
        Message<?> result = interceptor.preSend(msg, null);

        StompHeaderAccessor resAccessor = StompHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);
        assertThat(resAccessor.getUser()).isNotNull();
        assertThat(((Authentication) resAccessor.getUser()).isAuthenticated()).isTrue();
    }

    @Test
    void invalidConnect_Rejected() {
        String token = "invalid_token";
        when(jwtService.isTokenValid(token)).thenReturn(false);

        Message<?> msg = createMessage(StompCommand.CONNECT, null, null, token);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(msg, null));
    }

    @Test
    void missingAuth_Rejected() {
        Message<?> msg = createMessage(StompCommand.CONNECT, null, null, null);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(msg, null));
    }

    @Test
    void staffSubscribe_SameLocation_Succeeds() {
        UUID locId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(UserRole.STAFF);
        when(principal.getLocationId()).thenReturn(locId);
        
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of());

        Message<?> msg = createMessage(StompCommand.SUBSCRIBE, "/topic/location." + locId, auth, null);
        interceptor.preSend(msg, null); // should not throw
    }

    @Test
    void staffSubscribe_CrossLocation_Fails() {
        UUID locId = UUID.randomUUID();
        UUID otherLocId = UUID.randomUUID();
        
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(UserRole.STAFF);
        when(principal.getLocationId()).thenReturn(locId);
        
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of());

        Message<?> msg = createMessage(StompCommand.SUBSCRIBE, "/topic/location." + otherLocId, auth, null);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(msg, null));
    }
    
    @Test
    void adminSubscribe_SameTenant_Succeeds() {
        UUID orgId = UUID.randomUUID();
        UUID locId = UUID.randomUUID();
        
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(UserRole.ORG_ADMIN);
        when(principal.getOrgId()).thenReturn(orgId);
        
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of());

        Location loc = new Location(orgId, "Name", null, null, null, null, false);
        when(locationRepository.findById(locId)).thenReturn(Optional.of(loc));

        Message<?> msg = createMessage(StompCommand.SUBSCRIBE, "/topic/location." + locId, auth, null);
        interceptor.preSend(msg, null); // should not throw
    }
    
    @Test
    void adminSubscribe_CrossTenant_Fails() {
        UUID orgId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();
        UUID locId = UUID.randomUUID();
        
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(UserRole.ORG_ADMIN);
        when(principal.getOrgId()).thenReturn(orgId);
        
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of());

        Location loc = new Location(otherOrgId, "Name", null, null, null, null, false);
        when(locationRepository.findById(locId)).thenReturn(Optional.of(loc));

        Message<?> msg = createMessage(StompCommand.SUBSCRIBE, "/topic/location." + locId, auth, null);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(msg, null));
    }

    @Test
    void malformedLocationDestination_Fails() {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(UserRole.STAFF);
        
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of());

        Message<?> msg = createMessage(StompCommand.SUBSCRIBE, "/topic/invalid", auth, null);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(msg, null));
    }
}
