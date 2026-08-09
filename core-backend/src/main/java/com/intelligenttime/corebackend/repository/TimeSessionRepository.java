package com.intelligenttime.corebackend.repository;

import com.intelligenttime.corebackend.entity.TimeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimeSessionRepository extends JpaRepository<TimeSession, UUID> {
    List<TimeSession> findByUserId(UUID userId);

    List<TimeSession> findByTaskId(UUID taskId);

}