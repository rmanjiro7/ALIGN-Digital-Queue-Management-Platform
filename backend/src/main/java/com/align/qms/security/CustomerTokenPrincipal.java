package com.align.qms.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * A specialized Principal representing an anonymous customer with a queue token.
 * Used exclusively for realtime WebSocket subscriptions.
 */
public class CustomerTokenPrincipal implements UserDetails {

    private final UUID tokenId;
    private final UUID orgId;
    private final UUID locationId;

    public CustomerTokenPrincipal(UUID tokenId, UUID orgId, UUID locationId) {
        this.tokenId = tokenId;
        this.orgId = orgId;
        this.locationId = locationId;
    }

    public UUID getTokenId() { return tokenId; }
    public UUID getOrgId() { return orgId; }
    public UUID getLocationId() { return locationId; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER_TOKEN"));
    }

    @Override
    public String getPassword() { return null; }

    @Override
    public String getUsername() { return tokenId.toString(); }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
