package com.align.qms.location;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "location_schedules")
public class LocationSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "location_id", nullable = false, updatable = false)
    private UUID locationId;

    /** 1=Monday, ..., 7=Sunday */
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "open_time", nullable = false)
    private LocalTime openTime;

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LocationSchedule() {
        // JPA
    }

    public LocationSchedule(UUID locationId, int dayOfWeek, LocalTime openTime, LocalTime closeTime) {
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new IllegalArgumentException("dayOfWeek must be between 1 and 7");
        }
        if (openTime.isAfter(closeTime) || openTime.equals(closeTime)) {
            throw new IllegalArgumentException("openTime must be strictly before closeTime");
        }
        this.locationId = locationId;
        this.dayOfWeek = dayOfWeek;
        this.openTime = openTime;
        this.closeTime = closeTime;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getLocationId() { return locationId; }
    public int getDayOfWeek() { return dayOfWeek; }
    public LocalTime getOpenTime() { return openTime; }
    public LocalTime getCloseTime() { return closeTime; }
    public Instant getCreatedAt() { return createdAt; }
}
