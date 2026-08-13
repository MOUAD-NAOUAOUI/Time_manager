package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.SessionResponse;
import com.intelligenttime.corebackend.dto.StartSessionRequest;
import com.intelligenttime.corebackend.service.TimeSessionService;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<SessionResponse> startSession(@RequestBody StartSessionRequest request) {
        return ResponseEntity.ok(sessionService.startSession(request));
    }

    @PutMapping("/{id}/stop")
    public ResponseEntity<SessionResponse> stopSession(@PathVariable UUID id) {
        return ResponseEntity.ok(sessionService.stopSession(id));
    }
}
