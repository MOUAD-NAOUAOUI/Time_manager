package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.AuthResponse;
import com.intelligenttime.corebackend.dto.LoginRequest;
import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.entity.Subscription;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.BadRequestException;
import com.intelligenttime.corebackend.exception.TooManyRequestsException;
import com.intelligenttime.corebackend.repository.SubscriptionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import com.intelligenttime.corebackend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    private JwtService jwtService;
    private RateLimiterService rateLimiterService;
    private UserService userService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        rateLimiterService = new RateLimiterService(null, 3, 10, 60);
        userService = new UserService(userRepository, subscriptionRepository, jwtService, rateLimiterService);
    }

    @Test
    void registerUser_Success() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse result = userService.registerUser(request);

        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
        assertNotNull(result.getToken());
        assertTrue(jwtService.validateToken(result.getToken(), "test@example.com"));
        verify(subscriptionRepository, times(1)).save(any(Subscription.class));
    }

    @Test
    void registerUser_EmailAlreadyExists_ThrowsException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> userService.registerUser(request));
    }

    @Test
    void loginUser_Success() {
        User user = new User();
        user.setEmail("user@example.com");
        user.setPasswordHash(new BCryptPasswordEncoder().encode("correctPassword"));

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("user@example.com");
        loginRequest.setPassword("correctPassword");

        AuthResponse result = userService.loginUser(loginRequest, "192.168.1.1");

        assertNotNull(result);
        assertEquals("user@example.com", result.getEmail());
        assertNotNull(result.getToken());
    }

    @Test
    void loginUser_RepeatedFailures_TriggersRateLimit() {
        when(userRepository.findByEmail("target@example.com")).thenReturn(Optional.empty());

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("target@example.com");
        loginRequest.setPassword("wrong");

        // 3 failed attempts (max = 3 in test setup)
        assertThrows(BadRequestException.class, () -> userService.loginUser(loginRequest, "10.0.0.1"));
        assertThrows(BadRequestException.class, () -> userService.loginUser(loginRequest, "10.0.0.1"));
        assertThrows(BadRequestException.class, () -> userService.loginUser(loginRequest, "10.0.0.1"));

        // 4th attempt should throw TooManyRequestsException before checking credentials
        assertThrows(TooManyRequestsException.class, () -> userService.loginUser(loginRequest, "10.0.0.1"));
    }
}