package com.align.qms.exception;

import java.util.UUID;

public class TokenNotFoundException extends ResourceNotFoundException {
    public TokenNotFoundException(UUID tokenId) {
        super("Token not found with ID: " + tokenId);
    }

    public TokenNotFoundException(String message) {
        super(message);
    }
}
