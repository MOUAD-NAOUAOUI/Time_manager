package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.ScheduleRequest;
import com.intelligenttime.corebackend.dto.ScheduleResponse;
import com.intelligenttime.corebackend.dto.ScheduleTaskItem;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.service.AIClientService;
import com.intelligenttime.corebackend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/schedule")
public class ScheduleController {

    private final AIClientService aiClientService;
    private final TaskService taskService;

    public ScheduleController(AIClientService aiClientService, TaskService taskService) {
        this.aiClientService = aiClientService;
        this.taskService = taskService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ScheduleResponse> generateSchedule(
            @Valid @RequestBody ScheduleRequest request,
            Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            request.setUserEmail(authentication.getName());
        }
        ScheduleResponse response = aiClientService.generateSchedule(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/today")
    public ResponseEntity<ScheduleResponse> scheduleToday(
            @RequestParam(defaultValue = "9")  int startHour,
            @RequestParam(defaultValue = "18") int endHour,
            Authentication authentication) {

        String userEmail = authentication != null ? authentication.getName() : null;
        List<TaskResponse> userTasks = taskService.getUserTasks(userEmail);

        List<ScheduleTaskItem> items = userTasks.stream()
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

        ScheduleRequest scheduleRequest = new ScheduleRequest();
        scheduleRequest.setUserEmail(userEmail);
        scheduleRequest.setTasks(items);
        scheduleRequest.setStartHour(startHour);
        scheduleRequest.setEndHour(endHour);

        ScheduleResponse response = aiClientService.generateSchedule(scheduleRequest);
        return ResponseEntity.ok(response);
    }
}
