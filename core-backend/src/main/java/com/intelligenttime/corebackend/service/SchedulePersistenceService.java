package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.ScheduleResponse;
import com.intelligenttime.corebackend.dto.TimeBlockResponse;
import com.intelligenttime.corebackend.entity.Schedule;
import com.intelligenttime.corebackend.entity.ScheduleTimeBlock;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.repository.ScheduleRepository;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

@Service
public class SchedulePersistenceService {

    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public SchedulePersistenceService(
            ScheduleRepository scheduleRepository,
            UserRepository userRepository,
            TaskRepository taskRepository) {
        this.scheduleRepository = scheduleRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Schedule saveOrUpdateSchedule(String email, LocalDate date, ScheduleResponse response, int startHour,
            int endHour) {
        User user = findUserByEmail(email);

        Schedule schedule = scheduleRepository.findByUserIdAndScheduleDate(user.getId(), date)
                .orElseGet(Schedule::new);

        schedule.setUser(user);
        schedule.setScheduleDate(date);
        schedule.setStartHour(startHour);
        schedule.setEndHour(endHour);

        applyMetrics(schedule, response);

        schedule.getTimeBlocks().clear();
        appendTimeBlocks(schedule, response);

        return scheduleRepository.save(schedule);
    }

    public Optional<Schedule> getScheduleByDate(String email, LocalDate date) {
        User user = findUserByEmail(email);
        return scheduleRepository.findByUserIdAndScheduleDate(user.getId(), date);
    }

    public List<Schedule> getUserSchedules(String email) {
        User user = findUserByEmail(email);
        return scheduleRepository.findByUserIdOrderByScheduleDateDesc(user.getId());
    }

    // ─── Private Helpers ─────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private void applyMetrics(Schedule schedule, ScheduleResponse response) {
        schedule.setRecommendation(response.getRecommendation());
        if (response.getMetrics() != null) {
            schedule.setTotalPlannedMinutes(response.getMetrics().getTotalPlannedMinutes());
            schedule.setUtilizationPercent(response.getMetrics().getUtilizationPercent());
            schedule.setOverloadWarning(response.getMetrics().isOverloadWarning());
        }
    }

    private void appendTimeBlocks(Schedule schedule, ScheduleResponse response) {
        if (response.getSchedule() == null) {
            return;
        }
        for (TimeBlockResponse b : response.getSchedule()) {
            ScheduleTimeBlock block = buildTimeBlock(schedule, b);
            schedule.getTimeBlocks().add(block);
        }
    }

    private ScheduleTimeBlock buildTimeBlock(Schedule schedule, TimeBlockResponse b) {
        ScheduleTimeBlock block = new ScheduleTimeBlock();
        block.setSchedule(schedule);
        block.setTitle(b.getTitle());
        block.setStartTime(b.getStartTime());
        block.setEndTime(b.getEndTime());
        block.setColor(b.getColor());
        block.setPriority(b.getPriority());
        block.setEnergyRequired(b.getEnergyRequired());
        block.setConstraintReason(b.getConstraintReason());
        linkTask(block, b.getTaskId());
        return block;
    }

    private void linkTask(ScheduleTimeBlock block, String taskId) {
        if (taskId == null) {
            return;
        }
        try {
            UUID id = UUID.fromString(taskId);
            Optional<Task> taskOpt = taskRepository.findById(Objects.requireNonNull(id));
            taskOpt.ifPresent(block::setTask);
        } catch (Exception ignored) {
            // Non-UUID or unknown task IDs are silently skipped
        }
    }
}
