package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.ScheduleMetrics;
import com.intelligenttime.corebackend.dto.ScheduleResponse;
import com.intelligenttime.corebackend.dto.TimeBlockResponse;
import com.intelligenttime.corebackend.entity.Schedule;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.ScheduleRepository;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchedulePersistenceServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private SchedulePersistenceService schedulePersistenceService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("scheduler@example.com");
    }

    @Test
    void saveOrUpdateSchedule_Success() {
        when(userRepository.findByEmail("scheduler@example.com")).thenReturn(Optional.of(user));
        when(scheduleRepository.findByUserIdAndScheduleDate(eq(user.getId()), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        Schedule savedSchedule = new Schedule();
        savedSchedule.setId(UUID.randomUUID());
        savedSchedule.setUser(user);
        savedSchedule.setScheduleDate(LocalDate.now());

        when(scheduleRepository.save(any(Schedule.class))).thenReturn(savedSchedule);

        ScheduleResponse response = new ScheduleResponse();
        response.setUserEmail("scheduler@example.com");
        response.setRecommendation("Optimally planned schedule");

        ScheduleMetrics metrics = new ScheduleMetrics();
        metrics.setTotalPlannedMinutes(90);
        metrics.setUtilizationPercent(20.0);
        metrics.setOverloadWarning(false);
        response.setMetrics(metrics);

        TimeBlockResponse block = new TimeBlockResponse();
        block.setTaskId(UUID.randomUUID().toString());
        block.setTitle("Deep Work");
        block.setStartTime("09:00");
        block.setEndTime("10:30");
        block.setColor("#A0785A");
        block.setPriority("high");
        block.setEnergyRequired("deep");
        block.setConstraintReason("Optimal");

        response.setSchedule(List.of(block));

        Schedule result = schedulePersistenceService.saveOrUpdateSchedule(
                "scheduler@example.com", LocalDate.now(), response, 9, 18);

        assertNotNull(result);
        assertEquals(user.getId(), result.getUser().getId());
    }

    @Test
    void getScheduleByDate_Success() {
        when(userRepository.findByEmail("scheduler@example.com")).thenReturn(Optional.of(user));
        Schedule existing = new Schedule();
        existing.setId(UUID.randomUUID());
        when(scheduleRepository.findByUserIdAndScheduleDate(user.getId(), LocalDate.now()))
                .thenReturn(Optional.of(existing));

        Optional<Schedule> result = schedulePersistenceService.getScheduleByDate("scheduler@example.com", LocalDate.now());
        assertTrue(result.isPresent());
        assertEquals(existing.getId(), result.get().getId());
    }
}
