package com.intelligenttime.corebackend.repository;

import com.intelligenttime.corebackend.entity.CoachingInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoachingInsightRepository extends JpaRepository<CoachingInsight, UUID> {
    List<CoachingInsight> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
