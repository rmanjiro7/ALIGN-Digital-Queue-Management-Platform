package com.align.qms.token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TokenRepository extends JpaRepository<Token, UUID> {

    Optional<Token> findByIdempotencyKey(String idempotencyKey);

    long countByQueueIdAndStateIn(UUID queueId, Collection<TokenState> states);

    @Query("SELECT count(t) FROM Token t WHERE t.queueId = :queueId AND t.state IN :states AND t.joinedAt < :joinedAt")
    long countTokensAhead(
            @Param("queueId") UUID queueId, 
            @Param("states") Collection<TokenState> states, 
            @Param("joinedAt") Instant joinedAt
    );

    @Query(value = "SELECT * FROM tokens WHERE location_id = :locationId AND state = 'WAITING' ORDER BY joined_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    Optional<Token> findNextWaitingTokenWithLock(@Param("locationId") UUID locationId);

    List<Token> findByQueueIdAndStateOrderByJoinedAtAsc(UUID queueId, TokenState state);
}
