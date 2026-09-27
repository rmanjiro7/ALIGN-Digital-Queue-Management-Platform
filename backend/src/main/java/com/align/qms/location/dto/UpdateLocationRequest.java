package com.align.qms.location.dto;

import jakarta.validation.constraints.Size;

/**
 * Request body for PUT /api/v1/locations/{locationId}.
 * All fields are optional — only non-null values are applied.
 */
public class UpdateLocationRequest {

    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 255, message = "Subtitle must not exceed 255 characters")
    private String subtitle;

    @Size(max = 1000, message = "Address must not exceed 1000 characters")
    private String address;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "Operating hours must not exceed 100 characters")
    private String operatingHours;

    private Boolean isHq;

    @Size(max = 50, message = "Timezone must not exceed 50 characters")
    private String timezone;

    private Boolean enforceSchedule;

    @jakarta.validation.Valid
    private java.util.List<LocationScheduleDto> schedules;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String  getName()           { return name; }
    public String  getSubtitle()       { return subtitle; }
    public String  getAddress()        { return address; }
    public String  getCity()           { return city; }
    public String  getOperatingHours() { return operatingHours; }
    public Boolean getIsHq()           { return isHq; }
    public String  getTimezone()       { return timezone; }
    public Boolean getEnforceSchedule(){ return enforceSchedule; }
    public java.util.List<LocationScheduleDto> getSchedules() { return schedules; }

    public void setName(String name)            { this.name = name; }
    public void setSubtitle(String subtitle)    { this.subtitle = subtitle; }
    public void setAddress(String address)      { this.address = address; }
    public void setCity(String city)            { this.city = city; }
    public void setOperatingHours(String hours) { this.operatingHours = hours; }
    public void setIsHq(Boolean isHq)           { this.isHq = isHq; }
    public void setTimezone(String tz)          { this.timezone = tz; }
    public void setEnforceSchedule(Boolean enforce){ this.enforceSchedule = enforce; }
    public void setSchedules(java.util.List<LocationScheduleDto> s) { this.schedules = s; }
}
