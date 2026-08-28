package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.entity.SecurityAuditLog;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.SecurityAuditLogRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
public class SecurityAuditServiceTest {

    @Mock
    private SecurityAuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SecurityAuditService securityAuditService;

    @Test
    void logEvent_Success() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("audit@example.com");

        when(userRepository.findByEmail("audit@example.com")).thenReturn(Optional.of(user));

        securityAuditService.logEvent("audit@example.com", "LOGIN_SUCCESS", "192.168.1.1", "Chrome", "Success");

        verify(auditLogRepository, times(1)).save(any(SecurityAuditLog.class));
    }

    @Test
    void getUserAuditLogs_Success() {
        User user = new User();
        UUID userId = UUID.randomUUID();
        user.setId(userId);
        user.setEmail("audit@example.com");

        when(userRepository.findByEmail("audit@example.com")).thenReturn(Optional.of(user));

        SecurityAuditLog log = new SecurityAuditLog();
        log.setEventType("LOGIN_SUCCESS");
        when(auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(log));

        List<SecurityAuditLog> logs = securityAuditService.getUserAuditLogs("audit@example.com");
        assertEquals(1, logs.size());
        assertEquals("LOGIN_SUCCESS", logs.get(0).getEventType());
    }
}
