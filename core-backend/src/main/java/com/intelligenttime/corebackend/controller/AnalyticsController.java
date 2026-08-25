package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.AnalyticsResponse;
import com.intelligenttime.corebackend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AnalyticsResponse> getDashboardAnalytics(Authentication authentication,
                                                                   @RequestParam(required = false) String email) {
        String targetEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics(targetEmail));
    }
}
