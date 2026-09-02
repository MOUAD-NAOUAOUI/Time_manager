package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.AuthResponse;
import com.intelligenttime.corebackend.dto.LoginRequest;
import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.dto.UserProfileResponse;
import com.intelligenttime.corebackend.entity.Subscription;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.BadRequestException;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.repository.SubscriptionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import com.intelligenttime.corebackend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private static final String DEFAULT_CLIENT_IP = "localhost";

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final JwtService jwtService;
    private final RateLimiterService rateLimiterService;
    private final SecurityAuditService securityAuditService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    public UserService(UserRepository userRepository,
                       SubscriptionRepository subscriptionRepository,
                       JwtService jwtService,
                       @Autowired(required = false) RateLimiterService rateLimiterService,
                       @Autowired(required = false) SecurityAuditService securityAuditService) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.jwtService = jwtService;
        this.rateLimiterService = rateLimiterService != null ? rateLimiterService : new RateLimiterService(null, 5, 60, 900);
        this.securityAuditService = securityAuditService;
    }

    public UserService(UserRepository userRepository,
                       SubscriptionRepository subscriptionRepository,
                       JwtService jwtService,
                       RateLimiterService rateLimiterService) {
        this(userRepository, subscriptionRepository, jwtService, rateLimiterService, null);
    }

    public UserService(UserRepository userRepository,
                       SubscriptionRepository subscriptionRepository,
                       JwtService jwtService) {
        this(userRepository, subscriptionRepository, jwtService, null, null);
    }

    @Transactional
    public AuthResponse registerUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered: " + request.getEmail());
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        if (request.getTimezone() != null) {
            user.setTimezone(request.getTimezone());
        }
        User savedUser = userRepository.save(user);

        Subscription subscription = new Subscription();
        subscription.setUser(savedUser);
        subscriptionRepository.save(subscription);

        if (securityAuditService != null) {
            securityAuditService.logEvent(savedUser.getEmail(), "USER_REGISTRATION", DEFAULT_CLIENT_IP, "API", "User registered successfully");
        }

        String token = jwtService.generateToken(savedUser.getEmail());
        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail());
    }

    public AuthResponse loginUser(LoginRequest request) {
        return loginUser(request, DEFAULT_CLIENT_IP);
    }

    public AuthResponse loginUser(LoginRequest request, String clientIp) {
        String effectiveIp = (clientIp != null && !clientIp.isEmpty()) ? clientIp : DEFAULT_CLIENT_IP;
        String rateLimitKey = "login:attempt:" + effectiveIp + ":" + request.getEmail();
        rateLimiterService.checkLimit(rateLimitKey);

        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            rateLimiterService.recordFailure(rateLimitKey);
            if (securityAuditService != null) {
                securityAuditService.logEvent(request.getEmail(), "LOGIN_FAILURE", effectiveIp, "API", "Invalid credentials provided");
            }
            throw new BadRequestException("Invalid email or password");
        }

        rateLimiterService.resetLimit(rateLimitKey);

        if (securityAuditService != null) {
            securityAuditService.logEvent(user.getEmail(), "LOGIN_SUCCESS", effectiveIp, "API", "Successful authentication");
        }

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }

    public UserProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        Subscription subscription = subscriptionRepository.findByUser(user)
                .orElse(null);
        String plan = subscription != null ? subscription.getPlan() : "free";
        String status = subscription != null ? subscription.getStatus() : "inactive";
        return new UserProfileResponse(user.getId(), user.getEmail(),
                user.getTimezone(), user.getCreatedAt(), plan, status,
                user.getSleepStartTime(), user.getSleepEndTime());
    }

    @Transactional
    public UserProfileResponse updateSleepPreferences(String email, String sleepStartTime, String sleepEndTime) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        if (sleepStartTime != null && !sleepStartTime.isBlank()) {
            user.setSleepStartTime(sleepStartTime);
        }
        if (sleepEndTime != null && !sleepEndTime.isBlank()) {
            user.setSleepEndTime(sleepEndTime);
        }
        User saved = userRepository.save(user);
        Subscription subscription = subscriptionRepository.findByUser(saved).orElse(null);
        String plan = subscription != null ? subscription.getPlan() : "free";
        String status = subscription != null ? subscription.getStatus() : "inactive";
        return new UserProfileResponse(saved.getId(), saved.getEmail(),
                saved.getTimezone(), saved.getCreatedAt(), plan, status,
                saved.getSleepStartTime(), saved.getSleepEndTime());
    }
}
