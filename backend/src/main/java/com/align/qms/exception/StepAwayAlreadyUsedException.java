package com.align.qms.exception;

public class StepAwayAlreadyUsedException extends BusinessException {
    public StepAwayAlreadyUsedException(String message) {
        super(message, org.springframework.http.HttpStatus.CONFLICT, "STEP_AWAY_USED");
    }
}
