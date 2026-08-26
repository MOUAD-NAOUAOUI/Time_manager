package com.intelligenttime.corebackend.repository;

import com.intelligenttime.corebackend.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    Optional<Schedule> findByUserIdAndScheduleDate(UUID userId, LocalDate scheduleDate);
    List<Schedule> findByUserIdOrderByScheduleDateDesc(UUID userId);
}
