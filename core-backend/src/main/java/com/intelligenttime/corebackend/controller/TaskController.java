package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.CreateTaskRequest;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@RequestBody CreateTaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(request));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getUserTasks(@RequestParam String email) {
        return ResponseEntity.ok(taskService.getUserTasks(email));
    }
}