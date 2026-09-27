package com.align.qms.location.dto;

import com.align.qms.location.LocationSchedule;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class LocationScheduleDto {
    private UUID id;

    @Min(1) @Max(7)
    private int dayOfWeek;

    @NotNull
    private String openTime;

    @NotNull
    private String closeTime;

    public static LocationScheduleDto from(LocationSchedule schedule) {
        LocationScheduleDto dto = new LocationScheduleDto();
        dto.id = schedule.getId();
        dto.dayOfWeek = schedule.getDayOfWeek();
        dto.openTime = schedule.getOpenTime().toString();
        dto.closeTime = schedule.getCloseTime().toString();
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public int getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(int dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public String getOpenTime() { return openTime; }
    public void setOpenTime(String openTime) { this.openTime = openTime; }
    public String getCloseTime() { return closeTime; }
    public void setCloseTime(String closeTime) { this.closeTime = closeTime; }
}
