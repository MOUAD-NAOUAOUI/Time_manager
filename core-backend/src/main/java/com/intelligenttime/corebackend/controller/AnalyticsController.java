package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.AnalyticsResponse;
import com.intelligenttime.corebackend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AnalyticsResponse> getDashboardAnalytics(@RequestParam String email) {
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics(email));
    }
}
