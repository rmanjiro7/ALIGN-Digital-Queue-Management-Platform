package com.align.qms.exception;

public class InvalidTokenStateException extends BusinessException {
    public InvalidTokenStateException(String message) {
        super(message, org.springframework.http.HttpStatus.CONFLICT, "INVALID_TOKEN_STATE");
    }
}
