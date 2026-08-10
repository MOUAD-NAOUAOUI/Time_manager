package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.entity.Subscription;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.SubscriptionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
