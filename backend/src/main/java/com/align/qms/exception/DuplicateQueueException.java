package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class DuplicateQueueException extends AlignException {

    public DuplicateQueueException(UUID serviceId) {
        super("A queue already exists for service: " + serviceId,
              HttpStatus.CONFLICT, "QUEUE_ALREADY_EXISTS");
    }
}
