package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.CreateTaskRequest;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.dto.UpdateTaskStatusRequest;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.exception.UnauthorizedException;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.ScheduleTimeBlockRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ScheduleTimeBlockRepository scheduleTimeBlockRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this(taskRepository, userRepository, null);
    }

    @Autowired
    public TaskService(TaskRepository taskRepository, UserRepository userRepository,
            ScheduleTimeBlockRepository scheduleTimeBlockRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.scheduleTimeBlockRepository = scheduleTimeBlockRepository;
    }

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        User user = findUserByEmail(request.getUserEmail());
        Task task = new Task();
        task.setUser(user);
        task.setTitle(request.getTitle());
        if (request.getColor() != null)
            task.setColor(request.getColor());
        if (request.getEstimatedMinutes() != null)
            task.setEstimatedMinutes(request.getEstimatedMinutes());
        if (request.getDeadline() != null)
            task.setDeadline(request.getDeadline());
        if (request.getPriority() != null)
            task.setPriority(request.getPriority());
        if (request.getEnergyRequired() != null)
            task.setEnergyRequired(request.getEnergyRequired());
        if (request.getCategory() != null)
            task.setCategory(request.getCategory());
        if (request.getRecurrence() != null)
            task.setRecurrence(request.getRecurrence());
        return mapToResponse(taskRepository.save(task));
    }

    public List<TaskResponse> getUserTasks(String email) {
        User user = findUserByEmail(email);
        return taskRepository.findByUserId(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse updateStatus(UUID taskId, String email, UpdateTaskStatusRequest request) {
        Task task = taskRepository.findById(Objects.requireNonNull(taskId))
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));

        User user = findUserByEmail(email);
        if (!task.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not own this task");
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String newStatus = request.getStatus();
            task.setStatus(newStatus);
            if ("completed".equalsIgnoreCase(newStatus)) {
                if (task.getCompletedAt() == null) {
                    task.setCompletedAt(java.time.ZonedDateTime.now());
                }
            } else {
                task.setCompletedAt(null);
            }
        }
        if (request.getAddMinutes() != null && request.getAddMinutes() > 0) {
            int currentEst = task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : 30;
            task.setEstimatedMinutes(currentEst + request.getAddMinutes());
        } else if (request.getEstimatedMinutes() != null && request.getEstimatedMinutes() > 0) {
            task.setEstimatedMinutes(request.getEstimatedMinutes());
        }
        if (request.getActualMinutesSpent() != null) {
            task.setActualMinutesSpent(request.getActualMinutesSpent());
        }

        return mapToResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, String email, CreateTaskRequest request) {
        Task task = taskRepository.findById(Objects.requireNonNull(taskId))
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));

        User user = findUserByEmail(email);
        if (!task.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not own this task");
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getColor() != null) {
            task.setColor(request.getColor());
        }
        if (request.getEstimatedMinutes() != null && request.getEstimatedMinutes() > 0) {
            task.setEstimatedMinutes(request.getEstimatedMinutes());
        }
        if (request.getDeadline() != null) {
            task.setDeadline(request.getDeadline());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getEnergyRequired() != null) {
            task.setEnergyRequired(request.getEnergyRequired());
        }
        if (request.getCategory() != null) {
            task.setCategory(request.getCategory());
        }
        if (request.getRecurrence() != null) {
            task.setRecurrence(request.getRecurrence());
        }

        return mapToResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(UUID taskId, String email) {
        Task task = taskRepository.findById(Objects.requireNonNull(taskId))
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
        User user = findUserByEmail(email);
        if (!task.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not own this task");
        }
        if (scheduleTimeBlockRepository != null) {
            scheduleTimeBlockRepository.deleteByTaskId(task.getId());
        }
        taskRepository.delete(task);
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private TaskResponse mapToResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getColor(),
                task.getEstimatedMinutes(),
                task.getDeadline(),
                task.getStatus(),
                task.getCreatedAt(),
                task.getActualMinutesSpent(),
                task.getPriority(),
                task.getEnergyRequired(),
                task.getCategory(),
                task.getRecurrence(),
                task.getCompletedAt());
    }
}
