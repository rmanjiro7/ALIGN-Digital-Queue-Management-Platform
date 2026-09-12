package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class CounterNotFoundException extends AlignException {

    public CounterNotFoundException(UUID id) {
        super("Counter not found: " + id, HttpStatus.NOT_FOUND, "COUNTER_NOT_FOUND");
    }
}
