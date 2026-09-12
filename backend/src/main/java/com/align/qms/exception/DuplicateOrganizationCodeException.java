package com.align.qms.exception;

import org.springframework.http.HttpStatus;

public class DuplicateOrganizationCodeException extends AlignException {

    public DuplicateOrganizationCodeException(String code) {
        super("Organization code already exists: " + code, HttpStatus.CONFLICT, "CODE_ALREADY_EXISTS");
    }
}
