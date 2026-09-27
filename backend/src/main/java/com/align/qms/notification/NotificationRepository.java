package com.align.qms.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query(value = "SELECT * FROM notifications WHERE status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= :now) LIMIT :limit FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<Notification> findPendingForUpdateSkipLocked(@Param("now") Instant now, @Param("limit") int limit);
}
