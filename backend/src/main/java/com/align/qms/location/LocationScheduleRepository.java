package com.align.qms.location;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LocationScheduleRepository extends JpaRepository<LocationSchedule, UUID> {
    List<LocationSchedule> findByLocationId(UUID locationId);
    void deleteByLocationId(UUID locationId);
}
