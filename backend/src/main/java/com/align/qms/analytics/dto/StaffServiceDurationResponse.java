package com.align.qms.analytics.dto;

import java.util.UUID;

public class StaffServiceDurationResponse {
    private UUID staffId;
    private String staffName; // Can be populated if available
    private long completedSegments;
    private Double averageServiceDurationSeconds; // Null if no qualifying segments

    public StaffServiceDurationResponse() {}

    public StaffServiceDurationResponse(UUID staffId, long completedSegments, Double averageServiceDurationSeconds) {
        this.staffId = staffId;
        this.completedSegments = completedSegments;
        this.averageServiceDurationSeconds = averageServiceDurationSeconds;
    }

    public UUID getStaffId() { return staffId; }
    public void setStaffId(UUID staffId) { this.staffId = staffId; }
    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }
    public long getCompletedSegments() { return completedSegments; }
    public void setCompletedSegments(long completedSegments) { this.completedSegments = completedSegments; }
    public Double getAverageServiceDurationSeconds() { return averageServiceDurationSeconds; }
    public void setAverageServiceDurationSeconds(Double averageServiceDurationSeconds) { this.averageServiceDurationSeconds = averageServiceDurationSeconds; }
}
