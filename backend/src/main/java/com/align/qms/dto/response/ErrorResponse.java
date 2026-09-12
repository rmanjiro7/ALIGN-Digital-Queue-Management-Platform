package com.align.qms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * Consistent error response payload for all ALIGN API errors.
 *
 * <p>Format:
 * <pre>
 * {
 *   "success": false,
 *   "message": "Human-readable description",
 *   "code":    "DOMAIN_ERROR_CODE",
 *   "errors":  [ { "field": "...", "message": "..." } ]
 * }
 * </pre>
 *
 * <p>Stack traces, SQL errors, internal class names, and secrets are
 * never included. See ERROR_HANDLING.md.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private final boolean success = false;
    private final Instant timestamp;
    private final int status;
    private final String message;
    private final String code;
    private final List<FieldError> errors;

    private ErrorResponse(Builder builder) {
        this.timestamp = Instant.now();
        this.status = builder.status;
        this.message = builder.message;
        this.code = builder.code;
        this.errors = builder.errors != null ? builder.errors : Collections.emptyList();
    }

    // ── Getters ────────────────────────────────────────────────────────

    public boolean isSuccess()          { return success; }
    public Instant getTimestamp()       { return timestamp; }
    public int getStatus()              { return status; }
    public String getMessage()          { return message; }
    public String getCode()             { return code; }
    public List<FieldError> getErrors() { return errors; }

    // ── Builder ────────────────────────────────────────────────────────

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int status;
        private String message;
        private String code;
        private List<FieldError> errors;

        public Builder status(int status)             { this.status = status;   return this; }
        public Builder message(String message)        { this.message = message; return this; }
        public Builder code(String code)              { this.code = code;       return this; }
        public Builder errors(List<FieldError> errors){ this.errors = errors;   return this; }
        public ErrorResponse build()                  { return new ErrorResponse(this); }
    }

    // ── Nested: Field-Level Validation Error ───────────────────────────

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FieldError {

        private final String field;
        private final String message;
        private final Object rejectedValue;

        public FieldError(String field, String message, Object rejectedValue) {
            this.field = field;
            this.message = message;
            this.rejectedValue = rejectedValue;
        }

        public FieldError(String field, String message) {
            this(field, message, null);
        }

        public String getField()         { return field; }
        public String getMessage()       { return message; }
        public Object getRejectedValue() { return rejectedValue; }
    }
}
