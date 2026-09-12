package com.align.qms.organization;

/**
 * Lifecycle status of an Organization (tenant).
 * SUSPENDED organizations cannot authenticate.
 */
public enum OrganizationStatus {
    ACTIVE,
    SUSPENDED
}
