package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.dto.UserProfileResponse;
import com.intelligenttime.corebackend.entity.Subscription;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.SubscriptionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.intelligenttime.corebackend.dto.LoginRequest;

@Service

public class UserService {
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(UserRepository userRepository, SubscriptionRepository subscriptionRepository) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;

    }

    @Transactional

    public User registerUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered:" + request.getEmail());

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
        return savedUser;
    }

    public User loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");

        }
        return user;
    }

    public UserProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Subscription subscription = subscriptionRepository.findByUser(user)
                .orElse(null);
        String plan = subscription != null ? subscription.getPlan() : "free";
        String status = subscription != null ? subscription.getStatus() : "inactive";
        return new UserProfileResponse(user.getId(), user.getEmail(),
                user.getTimezone(), user.getCreatedAt(), plan, status);
    }
}
