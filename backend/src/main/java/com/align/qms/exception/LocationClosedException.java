package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class LocationClosedException extends AlignException {
    public LocationClosedException(UUID locationId) {
        super("Location " + locationId + " is currently closed and not accepting new customers.", HttpStatus.BAD_REQUEST, "LOCATION_CLOSED");
    }
}
