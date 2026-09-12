package com.align.qms.security;

import com.align.qms.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Handles unauthenticated access to protected endpoints.
 *
 * <p>Returns HTTP 401 with the standard ALIGN {@link ErrorResponse} JSON body.
 * This fires when:
 * <ul>
 *   <li>No Authorization header is present on a protected endpoint.</li>
 *   <li>The JWT is missing, malformed, expired, or has an invalid signature.</li>
 * </ul>
 *
 * <p>Security: stack traces and internal details are never returned.
 * The Authorization header value is never logged.
 */
@Component
public class AuthEntryPoint implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(AuthEntryPoint.class);

    private final ObjectMapper objectMapper;

    public AuthEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        log.debug("Unauthorized access to {}: {}", request.getRequestURI(), authException.getMessage());

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.UNAUTHORIZED.value())
            .message("Authentication required")
            .code("UNAUTHORIZED")
            .build();

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
