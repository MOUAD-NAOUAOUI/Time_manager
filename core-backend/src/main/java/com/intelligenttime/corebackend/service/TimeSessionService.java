package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.SessionResponse;
import com.intelligenttime.corebackend.dto.StartSessionRequest;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.TimeSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.exception.UnauthorizedException;
import com.intelligenttime.corebackend.exception.BadRequestException;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.TimeSessionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Objects;
import java.time.ZonedDateTime;
import java.util.UUID;

@Service
public class TimeSessionService {

    private final TimeSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public TimeSessionService(TimeSessionRepository sessionRepository, UserRepository userRepository,
            TaskRepository taskRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public SessionResponse startSession(StartSessionRequest request) {
        User user = userRepository.findByEmail(request.getUserEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserEmail()));
        if (sessionRepository.existsByUserIdAndStatus(user.getId(), "running")) {
            throw new BadRequestException("A time session is already running");
        }

        TimeSession session = new TimeSession();
        session.setUser(user);
        session.setStartTime(ZonedDateTime.now());
        session.setStatus("running");

        if (request.getTaskId() != null) {
            UUID taskId = Objects.requireNonNull(request.getTaskId());
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + request.getTaskId()));
            if (!task.getUser().getId().equals(user.getId())) {
                throw new UnauthorizedException("You do not own this task");
            }
            session.setTask(task);
            task.setStatus("in_progress");
            taskRepository.save(task);
        }

        TimeSession savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    @Transactional
    public SessionResponse stopSession(UUID sessionId, String email) {
        TimeSession session = sessionRepository.findById(Objects.requireNonNull(sessionId))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not own this session");
        }
        if (!"running".equals(session.getStatus())) {
            throw new BadRequestException("This time session is already stopped");
        }

        ZonedDateTime endTime = ZonedDateTime.now();
        session.setEndTime(endTime);
        session.setStatus("completed");

        long seconds = Duration.between(session.getStartTime(), endTime).getSeconds();
        int durationMinutes = (int) Math.round(seconds / 60.0);
        if (seconds >= 15 && durationMinutes == 0) {
            durationMinutes = 1;
        }
        session.setDurationMinutes(durationMinutes);

        if (session.getTask() != null) {
            Task task = session.getTask();
            int previousMinutes = task.getActualMinutesSpent() != null ? task.getActualMinutesSpent() : 0;
            task.setActualMinutesSpent(previousMinutes + session.getDurationMinutes());
            if (!"completed".equals(task.getStatus())) {
                task.setStatus("pending");
            }
            taskRepository.save(task);
        }

        TimeSession savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<SessionResponse> getActiveSession(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return java.util.Optional.empty();
        }
        return sessionRepository.findByUserIdAndStatus(user.getId(), "running")
                .map(this::mapToResponse);
    }

    private SessionResponse mapToResponse(TimeSession session) {
        UUID taskId = session.getTask() != null ? session.getTask().getId() : null;
        return new SessionResponse(
                session.getId(),
                taskId,
                session.getStartTime(),
                session.getEndTime(),
                session.getDurationMinutes(),
                session.getStatus());
    }
}
