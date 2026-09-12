package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a business rule violation occurs.
 *
 * <p>Examples: queue is full, invalid token state transition,
 * counter not available. Maps to HTTP 409 Conflict by default,
 * but subclasses may override to 400 Bad Request where appropriate.
 */
public class BusinessException extends AlignException {

    public BusinessException(String message, String errorCode) {
        super(message, HttpStatus.CONFLICT, errorCode);
    }

    public BusinessException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }
}
