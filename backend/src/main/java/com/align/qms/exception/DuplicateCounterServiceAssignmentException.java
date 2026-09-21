package com.align.qms.exception;

import java.util.UUID;

public class DuplicateCounterServiceAssignmentException extends AlignException {

    public DuplicateCounterServiceAssignmentException(UUID counterId, UUID serviceId) {
        super("DUPLICATE_ASSIGNMENT", org.springframework.http.HttpStatus.CONFLICT, "Counter " + counterId + " is already assigned to service " + serviceId);
    }
}
