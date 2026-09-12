package com.align.qms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class NoWaitingTokensException extends BusinessException {
    public NoWaitingTokensException() {
        super("No waiting tokens found in the queue.", HttpStatus.NOT_FOUND, "NO_WAITING_TOKENS");
    }
}
