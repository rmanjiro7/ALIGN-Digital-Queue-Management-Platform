package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Base exception for all ALIGN domain exceptions.
 *
 * <p>Every domain-specific exception should extend this class and provide
 * an appropriate HTTP status code and machine-readable error code.
 * The {@link GlobalExceptionHandler} maps these to consistent JSON responses.
 */
public class AlignException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public AlignException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public AlignException(String message, HttpStatus status, String errorCode, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
