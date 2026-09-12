package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a resource exists but the caller does not have permission to access it.
 * Returns HTTP 403 with code RESOURCE_FORBIDDEN.
 *
 * Distinct from UnauthorizedTenantAccessException (cross-tenant) in that this
 * is used for same-tenant role-level prohibition.
 */
public class ResourceForbiddenException extends AlignException {

    public ResourceForbiddenException(String detail) {
        super(detail, HttpStatus.FORBIDDEN, "RESOURCE_FORBIDDEN");
    }

    public ResourceForbiddenException() {
        super("You do not have permission to access this resource",
              HttpStatus.FORBIDDEN, "RESOURCE_FORBIDDEN");
    }
}
