package com.align.qms.exception;

import com.align.qms.dto.response.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Centralized exception handler for all ALIGN REST API errors.
 *
 * <p>Converts exceptions to the standard {@link ErrorResponse} JSON format.
 * Stack traces, SQL errors, and internal details are never exposed.
 * See ERROR_HANDLING.md for the full error code catalog.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── ALIGN Domain Exceptions ────────────────────────────────────────

    @ExceptionHandler(AlignException.class)
    public ResponseEntity<ErrorResponse> handleAlignException(AlignException ex) {
        log.warn("Domain exception [{}]: {}", ex.getErrorCode(), ex.getMessage());
        ErrorResponse body = ErrorResponse.builder()
            .status(ex.getStatus().value())
            .message(ex.getMessage())
            .code(ex.getErrorCode())
            .build();
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    // ── Spring Security: Authentication (401) ──────────────────────────
    // Handles AuthenticationException that escapes the filter chain (rare but possible).
    // Primary 401 handling is in AuthEntryPoint (filter-level).

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        log.debug("Authentication exception in controller advice: {}", ex.getMessage());
        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.UNAUTHORIZED.value())
            .message("Authentication required")
            .code("UNAUTHORIZED")
            .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    // ── Spring Security: Authorization (403) ──────────────────────────
    // Handles AccessDeniedException from @PreAuthorize that escapes the filter chain.
    // Primary 403 handling is in AccessDeniedHandlerImpl.

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.FORBIDDEN.value())
            .message("You do not have permission to access this resource")
            .code("FORBIDDEN")
            .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    // ── Validation Errors (Jakarta Bean Validation) ────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex) {

        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(fe -> new ErrorResponse.FieldError(
                fe.getField(),
                fe.getDefaultMessage(),
                fe.getRejectedValue() instanceof String
                    ? fe.getRejectedValue()  // safe: only expose strings
                    : null
            ))
            .collect(Collectors.toList());

        log.debug("Validation failed on {} field(s)", fieldErrors.size());

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
            .message("Validation failed")
            .code("VALIDATION_ERROR")
            .errors(fieldErrors)
            .build();
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    // ── Type Mismatch (e.g. invalid UUID in path variable) ─────────────

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {

        String message = String.format(
            "Invalid value for parameter '%s'", ex.getName());
        log.debug("Type mismatch: {}", message);

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.BAD_REQUEST.value())
            .message(message)
            .code("INVALID_PARAMETER")
            .build();
        return ResponseEntity.badRequest().body(body);
    }

    // ── 404 — No handler / resource not found ─────────────────────────

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex) {

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.NOT_FOUND.value())
            .message("The requested endpoint does not exist")
            .code("ENDPOINT_NOT_FOUND")
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    // ── Illegal Arguments & State (400) ───────────────────────────────

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ErrorResponse> handleIllegalArgumentOrState(Exception ex) {
        log.warn("Invalid request: {}", ex.getMessage());
        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.BAD_REQUEST.value())
            .message(ex.getMessage())
            .code("BAD_REQUEST")
            .build();
        return ResponseEntity.badRequest().body(body);
    }

    // ── Catch-All ──────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception ex) {
        // Log with full stack trace internally — never expose it
        log.error("Unexpected error: {}", ex.getMessage(), ex);

        ErrorResponse body = ErrorResponse.builder()
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .message("An unexpected error occurred")
            .code("INTERNAL_SERVER_ERROR")
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
