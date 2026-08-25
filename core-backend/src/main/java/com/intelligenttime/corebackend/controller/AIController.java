package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.DecomposeGoalRequest;
import com.intelligenttime.corebackend.dto.DecomposeGoalResponse;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.service.AIClientService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
public class AIController {

    private final AIClientService aiClientService;

    public AIController(AIClientService aiClientService) {
        this.aiClientService = aiClientService;
    }

    @PostMapping("/decompose")
    public ResponseEntity<DecomposeGoalResponse> decomposeGoal(
            @Valid @RequestBody DecomposeGoalRequest request,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : "user@example.com";
        DecomposeGoalResponse response = aiClientService.decomposeGoal(
                userEmail, request.getGoal(), request.getTargetHours());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/decompose/save")
    public ResponseEntity<List<TaskResponse>> decomposeAndSave(
            @Valid @RequestBody DecomposeGoalRequest request,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : "user@example.com";
        List<TaskResponse> savedTasks = aiClientService.decomposeAndSaveTasks(
                userEmail, request.getGoal(), request.getTargetHours());
        return ResponseEntity.ok(savedTasks);
    }
}
