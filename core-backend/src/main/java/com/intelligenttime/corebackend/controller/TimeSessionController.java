package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.SessionResponse;
import com.intelligenttime.corebackend.dto.StartSessionRequest;
import com.intelligenttime.corebackend.service.TimeSessionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/sessions")
public class TimeSessionController {

    private final TimeSessionService sessionService;

    public TimeSessionController(TimeSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<SessionResponse> startSession(@Valid @RequestBody StartSessionRequest request,
            Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            request.setUserEmail(authentication.getName());
        }
        return ResponseEntity.ok(sessionService.startSession(request));
    }

    @PutMapping("/{id}/stop")
    public ResponseEntity<SessionResponse> stopSession(@PathVariable UUID id,
            Authentication authentication) {
        return ResponseEntity.ok(sessionService.stopSession(id, authentication.getName()));
    }
}
