package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.*;
import com.intelligenttime.corebackend.entity.ChatMessage;
import com.intelligenttime.corebackend.entity.ChatSession;
import com.intelligenttime.corebackend.exception.UnauthorizedException;
import com.intelligenttime.corebackend.service.AIClientService;
import com.intelligenttime.corebackend.service.ChatPersistenceService;
import com.intelligenttime.corebackend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/ai")
public class AIController {

    private final AIClientService aiClientService;
    private final TaskService taskService;
    private final ChatPersistenceService chatPersistenceService;

    public AIController(
            AIClientService aiClientService,
            TaskService taskService,
            ChatPersistenceService chatPersistenceService) {
        this.aiClientService = aiClientService;
        this.taskService = taskService;
        this.chatPersistenceService = chatPersistenceService;
    }

    @PostMapping("/decompose")
    public ResponseEntity<DecomposeGoalResponse> decomposeGoal(
            @Valid @RequestBody DecomposeGoalRequest request,
            Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);
        DecomposeGoalResponse response = aiClientService.decomposeGoal(
                userEmail, request.getGoal(), request.getTargetHours());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/decompose/save")
    public ResponseEntity<List<TaskResponse>> decomposeAndSave(
            @Valid @RequestBody DecomposeGoalRequest request,
            Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);
        List<TaskResponse> savedTasks = aiClientService.decomposeAndSaveTasks(
                userEmail, request.getGoal(), request.getTargetHours());
        return ResponseEntity.ok(savedTasks);
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatProcessResponse> processChat(
            @Valid @RequestBody ChatProcessRequest request,
            @RequestParam(required = false) UUID sessionId,
            Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);

        // Get or create persistent conversation session
        ChatSession session = chatPersistenceService.getOrCreateSession(userEmail, sessionId);
        List<Map<String, Object>> history = chatPersistenceService.getSessionMessages(session.getId(), userEmail)
                .stream().map(message -> Map.<String, Object>of(
                        "role", message.getRole(), "content", message.getContent()))
                .toList();
        chatPersistenceService.saveMessage(session.getId(), "user", request.getMessage());

        List<TaskResponse> existingTasks = taskService.getUserTasks(userEmail);
        ChatProcessResponse response = aiClientService.processChatMessage(
                userEmail, request.getMessage(), existingTasks, history);

        chatPersistenceService.saveMessage(session.getId(), "assistant", response.getAiReply());

        if (response.getProposal() != null) {
            chatPersistenceService.saveProposal(session.getId(), userEmail, response.getProposal());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat/confirm")
    public ResponseEntity<List<TaskResponse>> confirmProposal(
            @Valid @RequestBody ConfirmProposalRequest request,
            Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);
        List<TaskResponse> savedTasks = aiClientService.confirmAndSaveTasks(
                userEmail, request.getTasks());
        return ResponseEntity.ok(savedTasks);
    }

    @GetMapping("/chat/sessions")
    public ResponseEntity<List<ChatSession>> getChatSessions(Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);
        return ResponseEntity.ok(chatPersistenceService.getUserSessions(userEmail));
    }

    @GetMapping("/chat/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getSessionMessages(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        String userEmail = getAuthenticatedEmail(authentication);
        return ResponseEntity.ok(chatPersistenceService.getSessionMessages(sessionId, userEmail));
    }

    @PostMapping("/coach/analyze")
    public ResponseEntity<Map<String, Object>> analyzeCoach(
            @RequestBody Map<String, Object> request, Authentication authentication) {
        String email = getAuthenticatedEmail(authentication);
        return ResponseEntity.ok(aiClientService.analyzeCoach(email,
                ((Number) request.getOrDefault("total_tasks", 0)).intValue(),
                ((Number) request.getOrDefault("completed_tasks", 0)).intValue(),
                ((Number) request.getOrDefault("total_focus_minutes", 0)).intValue()));
    }

    @PostMapping("/analytics/productivity-score")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> productivityScore(
            @RequestBody Map<String, Object> request, Authentication authentication) {
        String email = getAuthenticatedEmail(authentication);
        List<Map<String, Object>> records = (List<Map<String, Object>>) request.getOrDefault("records", List.of());
        int focus = ((Number) request.getOrDefault("total_focus_minutes", 0)).intValue();
        return ResponseEntity.ok(aiClientService.calculateProductivity(email, records, focus));
    }

    @PostMapping("/analytics/decompose-advanced")
    public ResponseEntity<Map<String, Object>> decomposeAdvanced(
            @RequestBody Map<String, Object> request, Authentication authentication) {
        String email = getAuthenticatedEmail(authentication);
        String goal = String.valueOf(request.getOrDefault("goal", ""));
        double hours = ((Number) request.getOrDefault("target_hours", 8)).doubleValue();
        return ResponseEntity.ok(aiClientService.decomposeAdvanced(email, goal, hours));
    }

    private String getAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new UnauthorizedException("Authentication token required for AI operations");
        }
        return authentication.getName();
    }
}
