package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an authenticated user attempts to access a resource belonging
 * to a different organization (tenant isolation violation — ADR-005 / BR-004).
 *
 * <p>Returns 403 Forbidden — the user IS authenticated but is NOT authorized
 * to access this resource. We return 403 (not 404) here as the tenant boundary
 * is enforced at the service layer; controllers have already verified the
 * resource exists before ownership is checked.
 */
public class UnauthorizedTenantAccessException extends AlignException {

    public UnauthorizedTenantAccessException() {
        super("Access denied: resource belongs to a different organization",
              HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");
    }

    public UnauthorizedTenantAccessException(String detail) {
        super(detail, HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");
    }
}
