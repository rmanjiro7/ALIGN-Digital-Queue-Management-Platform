package com.align.qms.exception;

import java.util.UUID;

public class CrossLocationAssignmentException extends AlignException {

    public CrossLocationAssignmentException(UUID counterId, UUID serviceId) {
        super("CROSS_LOCATION_ASSIGNMENT", org.springframework.http.HttpStatus.BAD_REQUEST, "Counter " + counterId + " and service " + serviceId + " belong to different locations.");
    }
}
