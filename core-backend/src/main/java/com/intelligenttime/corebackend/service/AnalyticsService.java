package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.AnalyticsResponse;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.TimeSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.TimeSessionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnalyticsService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final TimeSessionRepository sessionRepository;

    public AnalyticsService(UserRepository userRepository, TaskRepository taskRepository, TimeSessionRepository sessionRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.sessionRepository = sessionRepository;
    }

    public AnalyticsResponse getDashboardAnalytics(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Task> tasks = taskRepository.findByUserId(user.getId());
        List<TimeSession> sessions = sessionRepository.findByUserId(user.getId());

        int totalTasks = tasks.size();
        int completedTasks = (int) tasks.stream().filter(t -> "completed".equalsIgnoreCase(t.getStatus())).count();
        int pendingTasks = totalTasks - completedTasks;

        int totalFocusMinutes = sessions.stream()
                .filter(s -> s.getDurationMinutes() != null)
                .mapToInt(TimeSession::getDurationMinutes)
                .sum();

        double completionRate = totalTasks > 0 ? ((double) completedTasks / totalTasks) * 100.0 : 0.0;

        return new AnalyticsResponse(totalTasks, completedTasks, pendingTasks, totalFocusMinutes, Math.round(completionRate * 10.0) / 10.0);
    }
}
