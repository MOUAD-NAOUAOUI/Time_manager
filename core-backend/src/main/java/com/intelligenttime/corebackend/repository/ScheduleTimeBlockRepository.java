package com.intelligenttime.corebackend.repository;

import com.intelligenttime.corebackend.entity.ScheduleTimeBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduleTimeBlockRepository extends JpaRepository<ScheduleTimeBlock, UUID> {
    List<ScheduleTimeBlock> findByScheduleIdOrderByStartTimeAsc(UUID scheduleId);
}
