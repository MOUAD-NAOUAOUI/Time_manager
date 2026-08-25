package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.UserProfileResponse;
import com.intelligenttime.corebackend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication,
                                                          @RequestParam(required = false) String email) {
        String targetEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;
        UserProfileResponse profile = userService.getUserProfile(targetEmail);
        return ResponseEntity.ok(profile);
    }
}
