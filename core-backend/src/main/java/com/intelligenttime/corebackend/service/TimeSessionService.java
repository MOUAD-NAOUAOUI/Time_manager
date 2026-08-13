package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.SessionResponse;
import com.intelligenttime.corebackend.dto.StartSessionRequest;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.TimeSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.TimeSessionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.UUID;

@Service
public class TimeSessionService {

    private final TimeSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public TimeSessionService(TimeSessionRepository sessionRepository, UserRepository userRepository, TaskRepository taskRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public SessionResponse startSession(StartSessionRequest request) {
        User user = userRepository.findByEmail(request.getUserEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        TimeSession session = new TimeSession();
        session.setUser(user);
        session.setStartTime(ZonedDateTime.now());
        session.setStatus("running");

        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                    .orElseThrow(() -> new RuntimeException("Task not found"));
            session.setTask(task);
            task.setStatus("in_progress");
            taskRepository.save(task);
        }

        TimeSession savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    @Transactional
    public SessionResponse stopSession(UUID sessionId) {
        TimeSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        ZonedDateTime endTime = ZonedDateTime.now();
        session.setEndTime(endTime);
        session.setStatus("completed");

        long duration = Duration.between(session.getStartTime(), endTime).toMinutes();
        session.setDurationMinutes((int) Math.max(1, duration));

        if (session.getTask() != null) {
            Task task = session.getTask();
            task.setStatus("completed");
            taskRepository.save(task);
        }

        TimeSession savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    private SessionResponse mapToResponse(TimeSession session) {
        UUID taskId = session.getTask() != null ? session.getTask().getId() : null;
        return new SessionResponse(
                session.getId(),
                taskId,
                session.getStartTime(),
                session.getEndTime(),
                session.getDurationMinutes(),
                session.getStatus()
        );
    }
}
