package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a disabled (INACTIVE) user attempts to authenticate.
 *
 * <p>Returns 401 rather than 403 because the account being disabled is an
 * authentication-level rejection — the user's identity cannot be established
 * for use in the system. SECURITY.md: disabled account cannot authenticate.
 */
public class DisabledUserException extends AlignException {

    public DisabledUserException() {
        super("Account is disabled", HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
    }
}
