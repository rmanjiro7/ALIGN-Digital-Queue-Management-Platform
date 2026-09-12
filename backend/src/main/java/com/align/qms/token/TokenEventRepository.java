package com.align.qms.token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TokenEventRepository extends JpaRepository<TokenEvent, UUID> {
    List<TokenEvent> findByTokenIdOrderByCreatedAtAsc(UUID tokenId);
}
