package com.align.qms.counter;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CounterServiceAssignmentRepository extends JpaRepository<CounterServiceAssignment, UUID> {
    
    List<CounterServiceAssignment> findByCounterId(UUID counterId);
    
    boolean existsByCounterIdAndServiceId(UUID counterId, UUID serviceId);
    
    void deleteByCounterIdAndServiceId(UUID counterId, UUID serviceId);
}
