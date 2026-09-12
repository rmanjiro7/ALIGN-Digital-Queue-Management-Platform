package com.align.qms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class CounterMismatchException extends BusinessException {
    public CounterMismatchException(String message) {
        super(message, "COUNTER_MISMATCH");
    }
}
