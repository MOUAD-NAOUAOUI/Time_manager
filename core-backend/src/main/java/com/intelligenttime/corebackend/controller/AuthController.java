package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.AuthResponse;
import com.intelligenttime.corebackend.dto.LoginRequest;
import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.service.RateLimiterService;
import com.intelligenttime.corebackend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final UserService userService;
    private final RateLimiterService rateLimiterService;

    public AuthController(UserService userService, RateLimiterService rateLimiterService) {
        this.userService = userService;
        this.rateLimiterService = rateLimiterService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = userService.registerUser(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest servletRequest) {
        String clientIp = rateLimiterService.extractClientIp(servletRequest);
        AuthResponse response = userService.loginUser(request, clientIp);
        return ResponseEntity.ok(response);
    }
}
