package com.align.qms.location;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LocationScheduleService {

    private final LocationRepository locationRepository;
    private final LocationScheduleRepository locationScheduleRepository;

    public LocationScheduleService(LocationRepository locationRepository,
                                   LocationScheduleRepository locationScheduleRepository) {
        this.locationRepository = locationRepository;
        this.locationScheduleRepository = locationScheduleRepository;
    }

    @Transactional(readOnly = true)
    public boolean isLocationOpen(UUID locationId, Instant now) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));

        if (!location.isEnforceSchedule()) {
            return true;
        }

        List<LocationSchedule> schedules = locationScheduleRepository.findByLocationId(locationId);
        if (schedules.isEmpty()) {
            return false;
        }

        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(location.getTimezone());
        } catch (Exception e) {
            // fallback if someone injected bad data directly into db
            zoneId = ZoneId.of("UTC");
        }

        ZonedDateTime localDateTime = now.atZone(zoneId);
        int currentDayOfWeek = localDateTime.getDayOfWeek().getValue();
        LocalTime currentTime = localDateTime.toLocalTime();

        return schedules.stream()
                .filter(s -> s.getDayOfWeek() == currentDayOfWeek)
                .anyMatch(s -> isTimeInInterval(currentTime, s.getOpenTime(), s.getCloseTime()));
    }

    /**
     * Checks if current time is within [open, close)
     */
    private boolean isTimeInInterval(LocalTime current, LocalTime open, LocalTime close) {
        return !current.isBefore(open) && current.isBefore(close);
    }

    @Transactional
    public void updateSchedules(UUID locationId, List<com.align.qms.location.dto.LocationScheduleDto> dtos) {
        // delete existing
        locationScheduleRepository.deleteAll(locationScheduleRepository.findByLocationId(locationId));

        if (dtos == null || dtos.isEmpty()) {
            return;
        }

        List<LocationSchedule> newSchedules = dtos.stream().map(dto -> {
            return new LocationSchedule(
                locationId,
                dto.getDayOfWeek(),
                LocalTime.parse(dto.getOpenTime()),
                LocalTime.parse(dto.getCloseTime())
            );
        }).toList();

        locationScheduleRepository.saveAll(newSchedules);
    }

    @Transactional(readOnly = true)
    public List<com.align.qms.location.dto.LocationScheduleDto> getSchedules(UUID locationId) {
        return locationScheduleRepository.findByLocationId(locationId).stream()
                .map(com.align.qms.location.dto.LocationScheduleDto::from)
                .toList();
    }
}
