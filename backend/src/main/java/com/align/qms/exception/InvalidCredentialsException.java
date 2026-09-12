package com.align.qms.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when login credentials are invalid (wrong email or wrong password).
 *
 * <p>The message is deliberately generic — it does not reveal whether the email
 * exists. This prevents account-enumeration via the login endpoint (SECURITY.md).
 */
public class InvalidCredentialsException extends AlignException {

    public InvalidCredentialsException() {
        super("Invalid email or password", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }
}
