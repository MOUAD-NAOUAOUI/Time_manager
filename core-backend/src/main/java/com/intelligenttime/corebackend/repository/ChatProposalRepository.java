package com.intelligenttime.corebackend.repository;

import com.intelligenttime.corebackend.entity.ChatProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatProposalRepository extends JpaRepository<ChatProposal, UUID> {
    List<ChatProposal> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);
    List<ChatProposal> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
