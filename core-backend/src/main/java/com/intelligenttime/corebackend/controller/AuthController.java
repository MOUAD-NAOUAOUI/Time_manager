package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;

    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        User registeredUser = userService.registerUser(request);
        return ResponseEntity.ok(registeredUser);
    }
}
