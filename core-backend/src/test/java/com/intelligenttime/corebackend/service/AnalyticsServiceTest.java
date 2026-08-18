package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.AnalyticsResponse;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.TimeSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.TimeSessionRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AnalyticsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TimeSessionRepository sessionRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    @Test
    void getDashboardAnalytics_Success() {
        User user = new User();
        UUID userId = UUID.randomUUID();
        user.setId(userId);
        user.setEmail("analytics@example.com");

        Task task1 = new Task();
        task1.setStatus("completed");
        Task task2 = new Task();
        task2.setStatus("pending");

        TimeSession session = new TimeSession();
        session.setDurationMinutes(45);

        when(userRepository.findByEmail("analytics@example.com")).thenReturn(Optional.of(user));
        when(taskRepository.findByUserId(userId)).thenReturn(List.of(task1, task2));
        when(sessionRepository.findByUserId(userId)).thenReturn(List.of(session));

        AnalyticsResponse response = analyticsService.getDashboardAnalytics("analytics@example.com");

        assertNotNull(response);
        assertEquals(2, response.getTotalTasks());
        assertEquals(1, response.getCompletedTasks());
        assertEquals(1, response.getPendingTasks());
        assertEquals(45, response.getTotalFocusMinutes());
        assertEquals(50.0, response.getCompletionRate());
    }
}
