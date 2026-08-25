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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(UserRepository userRepository,
                       SubscriptionRepository subscriptionRepository,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.jwtService = jwtService;
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

        String token = jwtService.generateToken(savedUser.getEmail());
        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail());
    }

    public AuthResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password");
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
                user.getTimezone(), user.getCreatedAt(), plan, status);
    }
}
