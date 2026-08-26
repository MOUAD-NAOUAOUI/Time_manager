package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.AnalyticsResponse;
import com.intelligenttime.corebackend.dto.DailyMetricDTO;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.TimeSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.TimeSessionRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

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

        List<DailyMetricDTO> weeklyMetrics = calculateWeeklyMetrics(sessions, tasks);

        return new AnalyticsResponse(
                totalTasks,
                completedTasks,
                pendingTasks,
                totalFocusMinutes,
                Math.round(completionRate * 10.0) / 10.0,
                weeklyMetrics
        );
    }

    private List<DailyMetricDTO> calculateWeeklyMetrics(List<TimeSession> sessions, List<Task> tasks) {
        List<DailyMetricDTO> metrics = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dayName = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            int dayFocus = sessions.stream()
                    .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().isEqual(date))
                    .filter(s -> s.getDurationMinutes() != null)
                    .mapToInt(TimeSession::getDurationMinutes)
                    .sum();

            int dayTasks = (int) tasks.stream()
                    .filter(t -> "completed".equalsIgnoreCase(t.getStatus()))
                    .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().toLocalDate().isEqual(date))
                    .count();

            metrics.add(new DailyMetricDTO(dayName, date.toString(), dayFocus, dayTasks));
        }

        return metrics;
    }
}
