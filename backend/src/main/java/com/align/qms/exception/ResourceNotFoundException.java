package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a requested resource does not exist.
 * Maps to HTTP 404 Not Found.
 */
public class ResourceNotFoundException extends AlignException {

    public ResourceNotFoundException(String resourceType, Object id) {
        super(
            resourceType + " not found: " + id,
            HttpStatus.NOT_FOUND,
            resourceType.toUpperCase().replace(" ", "_") + "_NOT_FOUND"
        );
    }

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}
