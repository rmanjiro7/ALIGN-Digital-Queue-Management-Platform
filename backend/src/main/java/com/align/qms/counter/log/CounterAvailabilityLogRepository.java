package com.align.qms.counter.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CounterAvailabilityLogRepository extends JpaRepository<CounterAvailabilityLog, UUID> {
    List<CounterAvailabilityLog> findByCounterIdOrderByChangedAtDesc(UUID counterId);
}
