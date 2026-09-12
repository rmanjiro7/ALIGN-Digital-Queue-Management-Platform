package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ServiceNotFoundException extends AlignException {

    public ServiceNotFoundException(UUID id) {
        super("Service not found: " + id, HttpStatus.NOT_FOUND, "SERVICE_NOT_FOUND");
    }
}
