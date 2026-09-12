package com.align.qms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class CounterAlreadyServingException extends BusinessException {
    public CounterAlreadyServingException(String message) {
        super(message, "COUNTER_ALREADY_SERVING");
    }
}
