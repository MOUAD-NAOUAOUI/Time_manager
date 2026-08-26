package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.entity.SecurityAuditLog;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.SecurityAuditLogRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SecurityAuditService {

    private final SecurityAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public SecurityAuditService(SecurityAuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void logEvent(String email, String eventType, String ipAddress, String userAgent, String details) {
        SecurityAuditLog log = new SecurityAuditLog();
        if (email != null && !email.isBlank()) {
            userRepository.findByEmail(email).ifPresent(log::setUser);
        }
        log.setEventType(eventType);
        log.setIpAddress(ipAddress != null ? ipAddress : "localhost");
        log.setUserAgent(userAgent);
        log.setDetails(details);

        auditLogRepository.save(log);
    }

    public List<SecurityAuditLog> getUserAuditLogs(String email) {
        User user = userRepository.findByEmail(email)
                .orElse(null);
        if (user == null) {
            return List.of();
        }
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }
}
