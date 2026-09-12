package com.align.qms.security;

import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Spring Security {@link UserDetailsService} implementation.
 *
 * <p>Provides two lookup paths:
 * <ol>
 *   <li>{@link #loadUserByUsername(String)} — by email, used by
 *       {@link org.springframework.security.authentication.AuthenticationManager}
 *       during login (username/password authentication).</li>
 *   <li>{@link #loadUserById(UUID)} — by userId UUID, used by
 *       {@link JwtAuthenticationFilter} on every authenticated request to verify
 *       the account still exists and is active after JWT issuance.</li>
 * </ol>
 *
 * <p>Security note: {@code loadUserByUsername} intentionally throws the same
 * {@link UsernameNotFoundException} whether the email does not exist or the
 * account is disabled. The distinction is handled upstream in
 * {@link com.align.qms.auth.AuthService#login} which converts any
 * {@link org.springframework.security.core.AuthenticationException} to a
 * generic INVALID_CREDENTIALS response — preventing account enumeration.
 */
@Service
@Transactional(readOnly = true)
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Load user by email address.
     * Used by Spring Security's AuthenticationManager during login.
     *
     * @param email the email address (Spring Security calls this "username")
     * @return a fully populated {@link UserPrincipal}
     * @throws UsernameNotFoundException if no user with that email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> {
                log.debug("UserDetailsService: no user found for email lookup");
                return new UsernameNotFoundException("User not found");
            });
        return new UserPrincipal(user);
    }

    /**
     * Load user by UUID — used by {@link JwtAuthenticationFilter}.
     * The JWT subject is the userId UUID string.
     *
     * @param userId the user's UUID
     * @return a fully populated {@link UserPrincipal}
     * @throws UsernameNotFoundException if no user with that ID exists
     */
    public UserDetails loadUserById(UUID userId) throws UsernameNotFoundException {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> {
                log.debug("UserDetailsService: no user found for id lookup");
                return new UsernameNotFoundException("User not found");
            });
        return new UserPrincipal(user);
    }
}
