package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.CreateTaskRequest;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.dto.UpdateTaskStatusRequest;
import com.intelligenttime.corebackend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request,
            Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            request.setUserEmail(authentication.getName());
        }
        return ResponseEntity.ok(taskService.createTask(request));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getUserTasks(Authentication authentication,
            @RequestParam(required = false) String email) {
        String targetEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        return ResponseEntity.ok(taskService.getUserTasks(targetEmail));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(
            @PathVariable("id") UUID taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request,
            Authentication authentication,
            @RequestParam(required = false) String email) {
        String targetEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        return ResponseEntity.ok(taskService.updateStatus(taskId, targetEmail, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable("id") UUID taskId,
            Authentication authentication,
            @RequestParam(required = false) String email) {
        String targetEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        taskService.deleteTask(taskId, targetEmail);
        return ResponseEntity.noContent().build();
    }
}