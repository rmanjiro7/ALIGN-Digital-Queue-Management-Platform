package com.align.qms.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration for the ALIGN stateless JWT API (SECURITY.md).
 *
 * <p>Key decisions:
 * <ul>
 *   <li><b>CSRF disabled</b>: stateless Bearer-token API. The browser never
 *       automatically attaches Authorization headers, so CSRF attacks cannot
 *       leverage authentication. Documented in SECURITY.md and ADR-011.</li>
 *   <li><b>Sessions STATELESS</b>: no HttpSession created or used. Every
 *       request must carry a valid JWT.</li>
 *   <li><b>BCrypt strength 12</b>: balances security against brute-force
 *       and acceptable login latency (~300ms on modern hardware).</li>
 *   <li><b>Public endpoints</b>: explicitly allowlisted. Everything else
 *       requires authentication by default (deny-by-default).</li>
 *   <li><b>Method security</b>: {@code @PreAuthorize} enabled for controller-
 *       and service-level RBAC enforcement.</li>
 *   <li><b>Actuator</b>: only {@code /actuator/health} is public.
 *       All other actuator endpoints require authentication.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final UserDetailsServiceImpl  userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthEntryPoint          authEntryPoint;
    private final AccessDeniedHandlerImpl accessDeniedHandler;

    @Value("${align.cors.allowed-origins}")
    private String allowedOriginsRaw;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          AuthEntryPoint authEntryPoint,
                          AccessDeniedHandlerImpl accessDeniedHandler) {
        this.userDetailsService      = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authEntryPoint          = authEntryPoint;
        this.accessDeniedHandler     = accessDeniedHandler;
    }

    // ── Password Encoder ────────────────────────────────────────────────────

    /**
     * BCrypt password encoder — strength 12 (SECURITY.md).
     * ~300ms per hash on a modern server: slow enough to impede brute-force,
     * fast enough for a login endpoint.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    // ── Authentication Provider ─────────────────────────────────────────────

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // ── Authentication Manager ──────────────────────────────────────────────

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ── Security Filter Chain ───────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── CSRF ────────────────────────────────────────────────────────
            // Disabled: stateless Bearer-token API. Browser never auto-attaches
            // Authorization headers, so CSRF is not a viable attack vector.
            .csrf(AbstractHttpConfigurer::disable)

            // ── HTTP Basic ───────────────────────────────────────────────────
            // Explicitly disabled: this is a Bearer-token JWT API only.
            // Without explicit disabling, Spring Security's default
            // BasicAuthenticationEntryPoint emits WWW-Authenticate: Basic on
            // 401 responses, which causes JDK HttpURLConnection to attempt a
            // Basic-auth retry on POST requests with a body (streaming mode),
            // resulting in HttpRetryException in test clients.
            .httpBasic(AbstractHttpConfigurer::disable)

            // ── CORS ─────────────────────────────────────────────────────────
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ── Session ──────────────────────────────────────────────────────
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Exception Handlers ───────────────────────────────────────────
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))

            // ── Authorization Rules ──────────────────────────────────────────
            // Deny-by-default: any endpoint not listed here requires a valid JWT.
            .authorizeHttpRequests(auth -> auth
                // Public auth endpoints
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/refresh").permitAll()
                // Public discovery endpoints
                .requestMatchers(HttpMethod.GET, "/api/v1/services").permitAll()
                // Phase 3 Token Engine endpoints (public for customers via UUID knowledge)
                .requestMatchers(HttpMethod.POST, "/api/v1/tokens/join").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/tokens/{id}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/tokens/{id}/position").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tokens/{id}/cancel").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tokens/{id}/step-away").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tokens/{id}/return").permitAll()
                // Health endpoint (no auth required for load-balancer probes)
                .requestMatchers("/actuator/health").permitAll()
                // WebSocket upgrade (future Phase 5; permit here to avoid blocking)
                .requestMatchers("/ws-align/**").permitAll()
                // All other actuator endpoints require authentication
                .requestMatchers("/actuator/**").authenticated()
                // Every other request requires authentication
                .anyRequest().authenticated()
            )

            // ── Authentication Provider ──────────────────────────────────────
            .authenticationProvider(authenticationProvider())

            // ── JWT Filter ───────────────────────────────────────────────────
            // Runs before Spring Security's UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class)

            // ── Security Headers ─────────────────────────────────────────────
            // Spring Security default headers are kept (X-Frame-Options,
            // X-Content-Type-Options, etc.). No customization needed for a
            // REST API serving no HTML — but defaults are sound.
            ;

        return http.build();
    }

    // ── CORS Configuration ──────────────────────────────────────────────────

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Parse comma-separated origins from environment variable
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();
        config.setAllowedOrigins(origins);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "Accept", "X-Requested-With",
            "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"
        ));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
