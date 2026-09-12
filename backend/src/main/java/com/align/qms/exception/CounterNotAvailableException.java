package com.align.qms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class CounterNotAvailableException extends BusinessException {
    public CounterNotAvailableException(String message) {
        super(message, "COUNTER_NOT_AVAILABLE");
    }
}
