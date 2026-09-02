package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.ScheduleMetrics;
import com.intelligenttime.corebackend.dto.ScheduleRequest;
import com.intelligenttime.corebackend.dto.ScheduleResponse;
import com.intelligenttime.corebackend.dto.ScheduleTaskItem;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.dto.TimeBlockResponse;
import com.intelligenttime.corebackend.entity.Schedule;
import com.intelligenttime.corebackend.entity.ScheduleTimeBlock;
import com.intelligenttime.corebackend.service.AIClientService;
import com.intelligenttime.corebackend.service.SchedulePersistenceService;
import com.intelligenttime.corebackend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/schedule")
public class ScheduleController {

    private final AIClientService aiClientService;
    private final TaskService taskService;
    private final SchedulePersistenceService schedulePersistenceService;
    private final com.intelligenttime.corebackend.repository.UserRepository userRepository;

    public ScheduleController(
            AIClientService aiClientService,
            TaskService taskService,
            SchedulePersistenceService schedulePersistenceService,
            com.intelligenttime.corebackend.repository.UserRepository userRepository) {
        this.aiClientService = aiClientService;
        this.taskService = taskService;
        this.schedulePersistenceService = schedulePersistenceService;
        this.userRepository = userRepository;
    }

    @PostMapping("/generate")
    public ResponseEntity<ScheduleResponse> generateSchedule(
            @Valid @RequestBody ScheduleRequest request,
            Authentication authentication,
            @RequestParam(required = false) String email) {
        String resolvedEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : (request.getUserEmail() != null && !request.getUserEmail().isBlank() ? request.getUserEmail() : email);
        if (resolvedEmail == null || resolvedEmail.isBlank()) {
            resolvedEmail = "user@example.com";
        }
        request.setUserEmail(resolvedEmail);
        final String finalEmail = resolvedEmail;
        userRepository.findByEmail(finalEmail).ifPresent(u -> {
            if (request.getTimezone() == null || request.getTimezone().isBlank() || "UTC".equals(request.getTimezone())) {
                if (u.getTimezone() != null && !u.getTimezone().isBlank()) {
                    request.setTimezone(u.getTimezone());
                }
            }
            if (u.getSleepStartTime() != null && !u.getSleepStartTime().isBlank()) {
                request.setSleepStart(u.getSleepStartTime());
            }
            if (u.getSleepEndTime() != null && !u.getSleepEndTime().isBlank()) {
                request.setSleepEnd(u.getSleepEndTime());
            }
        });
        if (request.getTasks() == null || request.getTasks().isEmpty()) {
            request.setTasks(mapToScheduleTaskItems(taskService.getUserTasks(finalEmail)));
        }

        ScheduleResponse response = aiClientService.generateSchedule(request);

        if (!finalEmail.isBlank()) {
            LocalDate targetDate = request.getDate() != null ? LocalDate.parse(request.getDate()) : LocalDate.now();
            schedulePersistenceService.saveOrUpdateSchedule(
                    finalEmail, targetDate, response,
                    request.getStartHour(),
                    request.getEndHour());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/today")
    public ResponseEntity<ScheduleResponse> scheduleToday(
            @RequestParam(defaultValue = "9") int startHour,
            @RequestParam(defaultValue = "18") int endHour,
            @RequestParam(required = false) String email,
            Authentication authentication) {

        String userEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        if (userEmail == null || userEmail.isBlank()) {
            userEmail = "user@example.com";
        }
        final String finalEmail = userEmail;
        List<TaskResponse> userTasks = taskService.getUserTasks(finalEmail);

        ScheduleRequest scheduleRequest = new ScheduleRequest();
        scheduleRequest.setUserEmail(finalEmail);
        scheduleRequest.setStartHour(startHour);
        scheduleRequest.setEndHour(endHour);
        userRepository.findByEmail(finalEmail).ifPresent(u -> {
            if (u.getTimezone() != null && !u.getTimezone().isBlank()) {
                scheduleRequest.setTimezone(u.getTimezone());
            }
            if (u.getSleepStartTime() != null && !u.getSleepStartTime().isBlank()) {
                scheduleRequest.setSleepStart(u.getSleepStartTime());
            }
            if (u.getSleepEndTime() != null && !u.getSleepEndTime().isBlank()) {
                scheduleRequest.setSleepEnd(u.getSleepEndTime());
            }
        });
        scheduleRequest.setTasks(mapToScheduleTaskItems(userTasks));

        ScheduleResponse response = aiClientService.generateSchedule(scheduleRequest);

        if (!finalEmail.isBlank()) {
            schedulePersistenceService.saveOrUpdateSchedule(
                    finalEmail, LocalDate.now(), response, startHour, endHour);
        }

        return ResponseEntity.ok(response);
    }

    private List<ScheduleTaskItem> mapToScheduleTaskItems(List<TaskResponse> userTasks) {
        return userTasks.stream()
                .filter(t -> !"completed".equals(t.getStatus()))
                .map(t -> {
                    ScheduleTaskItem item = new ScheduleTaskItem();
                    item.setId(t.getId() != null ? t.getId().toString() : "unknown");
                    item.setTitle(t.getTitle());
                    item.setEstimatedMinutes(t.getEstimatedMinutes() != null ? t.getEstimatedMinutes() : 30);
                    item.setColor(t.getColor());
                    item.setPriority(t.getPriority() != null ? t.getPriority() : "medium");
                    item.setEnergyRequired(t.getEnergyRequired() != null ? t.getEnergyRequired() : "medium");
                    if (t.getDeadline() != null) {
                        item.setDeadline(t.getDeadline().toString());
                    }
                    return item;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/date")
    public ResponseEntity<ScheduleResponse> getScheduleByDate(
            @RequestParam String email,
            @RequestParam String date,
            Authentication authentication) {

        String resolvedEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;

        LocalDate localDate = LocalDate.parse(date);
        Schedule schedule = schedulePersistenceService.getScheduleByDate(resolvedEmail, localDate)
                .orElse(null);

        if (schedule == null) {
            ScheduleResponse emptyResponse = new ScheduleResponse();
            emptyResponse.setUserEmail(resolvedEmail);
            emptyResponse.setSchedule(new java.util.ArrayList<>());
            emptyResponse.setRecommendation("No schedule planned for this date yet.");
            ScheduleMetrics metrics = new ScheduleMetrics();
            metrics.setTotalPlannedMinutes(0);
            metrics.setUtilizationPercent(0.0);
            metrics.setOverloadWarning(false);
            emptyResponse.setMetrics(metrics);
            return ResponseEntity.ok(emptyResponse);
        }

        return ResponseEntity.ok(mapScheduleToResponse(schedule));
    }

    private ScheduleResponse mapScheduleToResponse(Schedule schedule) {
        ScheduleResponse response = new ScheduleResponse();
        response.setUserEmail(schedule.getUser().getEmail());
        response.setRecommendation(schedule.getRecommendation());
        response.setMetrics(buildMetrics(schedule));
        response.setSchedule(
                schedule.getTimeBlocks().stream()
                        .map(this::mapBlockToResponse)
                        .collect(Collectors.toList()));
        return response;
    }

    private ScheduleMetrics buildMetrics(Schedule schedule) {
        ScheduleMetrics metrics = new ScheduleMetrics();
        metrics.setTotalPlannedMinutes(
                schedule.getTotalPlannedMinutes() != null ? schedule.getTotalPlannedMinutes() : 0);
        metrics.setUtilizationPercent(
                schedule.getUtilizationPercent() != null ? schedule.getUtilizationPercent() : 0.0);
        metrics.setOverloadWarning(Boolean.TRUE.equals(schedule.getOverloadWarning()));
        return metrics;
    }

    private TimeBlockResponse mapBlockToResponse(ScheduleTimeBlock block) {
        TimeBlockResponse b = new TimeBlockResponse();
        b.setTitle(block.getTitle());
        b.setStartTime(block.getStartTime());
        b.setEndTime(block.getEndTime());
        b.setColor(block.getColor());
        b.setPriority(block.getPriority());
        b.setEnergyRequired(block.getEnergyRequired());
        b.setConstraintReason(block.getConstraintReason());
        if (block.getTask() != null) {
            b.setTaskId(block.getTask().getId().toString());
        }
        return b;
    }
}
