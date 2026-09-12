package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class LocationNotFoundException extends AlignException {

    public LocationNotFoundException(UUID id) {
        super("Location not found: " + id, HttpStatus.NOT_FOUND, "LOCATION_NOT_FOUND");
    }
}
