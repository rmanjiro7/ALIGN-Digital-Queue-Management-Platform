package com.align.qms.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class OrganizationNotFoundException extends AlignException {

    public OrganizationNotFoundException(UUID id) {
        super("Organization not found: " + id, HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND");
    }

    public OrganizationNotFoundException(String code) {
        super("Organization not found with code: " + code, HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND");
    }
}
