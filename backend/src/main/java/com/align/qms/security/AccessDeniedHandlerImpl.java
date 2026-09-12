package com.align.qms.security;

import com.align.qms.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Handles authorization failures for authenticated users.
 *
 * <p>Returns HTTP 403 with the standard ALIGN {@link ErrorResponse} JSON body.
 * This fires when:
 * <ul>
 *   <li>A valid JWT is present but the user's role is insufficient for the endpoint.</li>
 *   <li>{@code @PreAuthorize} denies access.</li>
 * </ul>
 *
 * <p>Distinct from {@link AuthEntryPoint} (401 — not authenticated) vs
 * this handler (403 — authenticated but not authorized). HTTP semantics matter.
 */
@Component
public class AccessDeniedHandlerImpl implements AccessDeniedHandler {

    private static final Logger log = LoggerFactory.getLogger(AccessDeniedHandlerImpl.class);

    private final ObjectMapper objectMapper;

    public AccessDeniedHandlerImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        log.warn("Access denied for {} {} — insufficient role",
            request.getMethod(), request.getRequestURI());

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.FORBIDDEN.value())
            .message("You do not have permission to access this resource")
            .code("FORBIDDEN")
            .build();

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
