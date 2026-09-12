package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class DuplicateCounterNumberException extends AlignException {

    public DuplicateCounterNumberException(UUID locationId, int number) {
        super("Counter number " + number + " already exists at location " + locationId,
              HttpStatus.CONFLICT, "COUNTER_NUMBER_ALREADY_EXISTS");
    }
}
