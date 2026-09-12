package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class QueueNotFoundException extends AlignException {

    public QueueNotFoundException(UUID id) {
        super("Queue not found: " + id, HttpStatus.NOT_FOUND, "QUEUE_NOT_FOUND");
    }
}
