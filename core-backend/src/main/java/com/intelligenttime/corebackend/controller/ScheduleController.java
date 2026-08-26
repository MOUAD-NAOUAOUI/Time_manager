package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.ScheduleMetrics;
import com.intelligenttime.corebackend.dto.ScheduleRequest;
import com.intelligenttime.corebackend.dto.ScheduleResponse;
import com.intelligenttime.corebackend.dto.ScheduleTaskItem;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.dto.TimeBlockResponse;
import com.intelligenttime.corebackend.entity.Schedule;
import com.intelligenttime.corebackend.entity.ScheduleTimeBlock;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
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

    public ScheduleController(
            AIClientService aiClientService,
            TaskService taskService,
            SchedulePersistenceService schedulePersistenceService) {
        this.aiClientService = aiClientService;
        this.taskService = taskService;
        this.schedulePersistenceService = schedulePersistenceService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ScheduleResponse> generateSchedule(
            @Valid @RequestBody ScheduleRequest request,
            Authentication authentication) {
        String email = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : request.getUserEmail();
        request.setUserEmail(email);

        ScheduleResponse response = aiClientService.generateSchedule(request);

        if (email != null && !email.isBlank()) {
            LocalDate targetDate = request.getDate() != null ? LocalDate.parse(request.getDate()) : LocalDate.now();
            schedulePersistenceService.saveOrUpdateSchedule(
                    email, targetDate, response,
                    request.getStartHour(),
                    request.getEndHour()
            );
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/today")
    public ResponseEntity<ScheduleResponse> scheduleToday(
            @RequestParam(defaultValue = "9") int startHour,
            @RequestParam(defaultValue = "18") int endHour,
            Authentication authentication) {

        String userEmail = authentication != null ? authentication.getName() : null;
        List<TaskResponse> userTasks = taskService.getUserTasks(userEmail);

        ScheduleRequest scheduleRequest = new ScheduleRequest();
        scheduleRequest.setUserEmail(userEmail);
        scheduleRequest.setStartHour(startHour);
        scheduleRequest.setEndHour(endHour);
        scheduleRequest.setTasks(mapToScheduleTaskItems(userTasks));

        ScheduleResponse response = aiClientService.generateSchedule(scheduleRequest);

        if (userEmail != null && !userEmail.isBlank()) {
            schedulePersistenceService.saveOrUpdateSchedule(
                    userEmail, LocalDate.now(), response, startHour, endHour
            );
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
                    item.setPriority("medium");
                    item.setEnergyRequired("medium");
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
                .orElseThrow(() -> new ResourceNotFoundException("No schedule found for date: " + date));

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
                        .collect(Collectors.toList())
        );
        return response;
    }

    private ScheduleMetrics buildMetrics(Schedule schedule) {
        ScheduleMetrics metrics = new ScheduleMetrics();
        metrics.setTotalPlannedMinutes(schedule.getTotalPlannedMinutes() != null ? schedule.getTotalPlannedMinutes() : 0);
        metrics.setUtilizationPercent(schedule.getUtilizationPercent() != null ? schedule.getUtilizationPercent() : 0.0);
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
