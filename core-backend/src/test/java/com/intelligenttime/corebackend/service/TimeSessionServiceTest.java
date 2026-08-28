package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.SessionResponse;
import com.intelligenttime.corebackend.dto.StartSessionRequest;
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

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
public class TimeSessionServiceTest {

    @Mock
    private TimeSessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TimeSessionService sessionService;

    @Test
    void startSession_Success() {
        StartSessionRequest request = new StartSessionRequest();
        request.setUserEmail("user@example.com");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(sessionRepository.save(any(TimeSession.class))).thenAnswer(invocation -> {
            TimeSession s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        SessionResponse response = sessionService.startSession(request);

        assertNotNull(response);
        assertEquals("running", response.getStatus());
    }

    @Test
    void stopSession_Success() {
        UUID sessionId = UUID.randomUUID();
        TimeSession session = new TimeSession();
        session.setId(sessionId);
        session.setStartTime(ZonedDateTime.now().minusMinutes(30));
        session.setStatus("running");
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        session.setUser(user);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(sessionRepository.save(any(TimeSession.class))).thenAnswer(i -> i.getArgument(0));

        SessionResponse response = sessionService.stopSession(sessionId, "user@example.com");

        assertNotNull(response);
        assertEquals("completed", response.getStatus());
        assertTrue(response.getDurationMinutes() >= 1);
    }
}
