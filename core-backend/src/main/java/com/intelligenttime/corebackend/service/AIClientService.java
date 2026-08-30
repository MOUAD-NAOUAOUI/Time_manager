package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AIClientService {

    private final String aiServiceUrl;
    private final RestTemplate restTemplate;
    private final TaskService taskService;
    private final String internalToken;

    @Autowired
    public AIClientService(
            @Value("${ai.service.url:http://127.0.0.1:8000}") String aiServiceUrl,
            @Value("${ai.service.internal-token:dev-internal-token}") String internalToken,
            TaskService taskService) {
        this.aiServiceUrl = aiServiceUrl;
        this.internalToken = internalToken;
        this.taskService = taskService;
        this.restTemplate = new RestTemplate();
    }

    public AIClientService(String aiServiceUrl, TaskService taskService) {
        this(aiServiceUrl, "dev-internal-token", taskService);
    }

    public DecomposeGoalResponse decomposeGoal(String userEmail, String goal, Integer targetHours) {
        String endpoint = aiServiceUrl + "/tasks/decompose";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Token", internalToken);

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", userEmail);
        payload.put("goal", goal);
        payload.put("target_hours", targetHours != null ? targetHours : 4);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<DecomposeGoalResponse> response = restTemplate.postForEntity(
                    endpoint, requestEntity, DecomposeGoalResponse.class);
            return response.getBody();
        } catch (Exception e) {
            List<DecomposedSubTaskResponse> fallbackTasks = List.of(
                    new DecomposedSubTaskResponse("Planning & Research: " + goal, 45, "high", "#A0785A"),
                    new DecomposedSubTaskResponse("Execution: " + goal, 90, "high", "#2563EB"),
                    new DecomposedSubTaskResponse("Review & Testing: " + goal, 45, "medium", "#16A34A"));
            return new DecomposeGoalResponse(userEmail, goal, 180, fallbackTasks,
                    "AI service unreachable. Generated default 3-phase execution framework.");
        }
    }

    public List<TaskResponse> decomposeAndSaveTasks(String userEmail, String goal, Integer targetHours) {
        DecomposeGoalResponse decomposed = decomposeGoal(userEmail, goal, targetHours);
        List<TaskResponse> savedTasks = new ArrayList<>();

        if (decomposed != null && decomposed.getTasks() != null) {
            for (DecomposedSubTaskResponse subtask : decomposed.getTasks()) {
                CreateTaskRequest createReq = new CreateTaskRequest();
                createReq.setUserEmail(userEmail);
                createReq.setTitle(subtask.getTitle());
                createReq.setColor(subtask.getColor());
                createReq.setEstimatedMinutes(subtask.getEstimatedMinutes());
                savedTasks.add(taskService.createTask(createReq));
            }
        }
        return savedTasks;
    }

    public ScheduleResponse generateSchedule(ScheduleRequest request) {
        String endpoint = aiServiceUrl + "/schedule/generate";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Token", internalToken);

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", request.getUserEmail());
        payload.put("start_hour", request.getStartHour());
        payload.put("end_hour", request.getEndHour());
        payload.put("timezone", request.getTimezone() != null ? request.getTimezone() : "UTC");
        if (request.getDate() != null) {
            payload.put("date", request.getDate());
        }

        List<Map<String, Object>> taskList = new ArrayList<>();
        for (ScheduleTaskItem t : request.getTasks()) {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("id", t.getId());
            taskMap.put("title", t.getTitle());
            taskMap.put("estimated_minutes", t.getEstimatedMinutes());
            taskMap.put("deadline", t.getDeadline());
            taskMap.put("priority", t.getPriority());
            taskMap.put("energy_required", t.getEnergyRequired());
            taskMap.put("color", t.getColor());
            taskList.add(taskMap);
        }
        payload.put("tasks", taskList);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<ScheduleResponse> response = restTemplate.postForEntity(
                    endpoint, requestEntity, ScheduleResponse.class);
            return response.getBody();
        } catch (Exception e) {
            ScheduleMetrics fallbackMetrics = new ScheduleMetrics();
            fallbackMetrics.setTotalTasks(request.getTasks().size());
            fallbackMetrics.setScheduledTasks(0);
            fallbackMetrics.setUnscheduledTasks(request.getTasks().size());
            fallbackMetrics.setOverloadWarning(false);
            fallbackMetrics.setDeadlineConflicts(new ArrayList<>());

            ScheduleResponse fallback = new ScheduleResponse();
            fallback.setUserEmail(request.getUserEmail());
            fallback.setSchedule(new ArrayList<>());
            fallback.setMetrics(fallbackMetrics);
            fallback.setRecommendation("AI scheduling service is temporarily offline. Please try again shortly.");
            return fallback;
        }
    }

    public ChatProcessResponse processChatMessage(String userEmail, String message, List<TaskResponse> existingTasks) {
        return processChatMessage(userEmail, message, existingTasks, new ArrayList<>());
    }

    public ChatProcessResponse processChatMessage(String userEmail, String message,
            List<TaskResponse> existingTasks,
            List<Map<String, Object>> history) {
        String endpoint = aiServiceUrl + "/chat/process";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Token", internalToken);

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", userEmail);
        payload.put("message", message);

        List<Map<String, Object>> taskList = new ArrayList<>();
        if (existingTasks != null) {
            for (TaskResponse t : existingTasks) {
                Map<String, Object> tm = new HashMap<>();
                tm.put("id", t.getId() != null ? t.getId().toString() : null);
                tm.put("title", t.getTitle());
                tm.put("estimated_minutes", t.getEstimatedMinutes());
                tm.put("status", t.getStatus());
                tm.put("deadline", t.getDeadline() != null ? t.getDeadline().toString() : null);
                taskList.add(tm);
            }
        }
        payload.put("existing_tasks", taskList);
        payload.put("history", history != null ? history : new ArrayList<>());

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<ChatProcessResponse> response = restTemplate.postForEntity(
                    endpoint, requestEntity, ChatProcessResponse.class);
            return response.getBody();
        } catch (Exception e) {
            ChatProcessResponse fallback = new ChatProcessResponse();
            fallback.setUserEmail(userEmail);
            fallback.setMessage(message);
            fallback.setAiReply("AI assistant is temporarily offline. Please try again shortly.");
            return fallback;
        }
    }

    public List<TaskResponse> confirmAndSaveTasks(String userEmail, List<ExtractedTaskItemDTO> tasks) {
        List<TaskResponse> savedTasks = new ArrayList<>();
        if (tasks != null) {
            for (ExtractedTaskItemDTO task : tasks) {
                CreateTaskRequest createReq = new CreateTaskRequest();
                createReq.setUserEmail(userEmail);
                createReq.setTitle(task.getTitle());
                createReq.setColor(task.getColor());
                createReq.setEstimatedMinutes(task.getEstimatedMinutes());
                createReq.setRecurrence(task.getRecurrence() != null ? task.getRecurrence() : "none");
                createReq.setPriority(task.getPriority() != null ? task.getPriority() : "medium");
                if (task.getDeadline() != null && !task.getDeadline().isBlank()) {
                    try {
                        createReq.setDeadline(java.time.ZonedDateTime.parse(task.getDeadline()));
                    } catch (Exception e) {
                        try {
                            createReq.setDeadline(java.time.LocalDate.parse(task.getDeadline()).atStartOfDay(java.time.ZoneId.systemDefault()));
                        } catch (Exception ignored) { /* ignore invalid date */ }
                    }
                }
                savedTasks.add(taskService.createTask(createReq));
            }
        }
        return savedTasks;
    }

    public Map<String, Object> analyzeCoach(String userEmail, int totalTasks, int completedTasks,
            int totalFocusMinutes) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", userEmail);
        payload.put("total_tasks", totalTasks);
        payload.put("completed_tasks", completedTasks);
        payload.put("total_focus_minutes", totalFocusMinutes);
        return postInternal("/coach/analyze", payload);
    }

    public Map<String, Object> calculateProductivity(String userEmail, List<Map<String, Object>> records,
            int focusMinutes) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", userEmail);
        payload.put("records", records);
        payload.put("total_focus_minutes", focusMinutes);
        return postInternal("/analytics/productivity-score", payload);
    }

    public Map<String, Object> decomposeAdvanced(String userEmail, String goal, double targetHours) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_email", userEmail);
        payload.put("goal", goal);
        payload.put("target_hours", targetHours);
        return postInternal("/analytics/decompose-advanced", payload);
    }

    private Map<String, Object> postInternal(String path, Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Token", internalToken);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                aiServiceUrl + path, Objects.requireNonNull(org.springframework.http.HttpMethod.POST),
                new HttpEntity<>(payload, headers),
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                });
        return response.getBody() != null ? response.getBody() : new HashMap<>();
    }
}
