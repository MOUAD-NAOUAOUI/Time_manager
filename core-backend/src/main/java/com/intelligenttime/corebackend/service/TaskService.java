package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.CreateTaskRequest;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.dto.UpdateTaskStatusRequest;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.exception.UnauthorizedException;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        User user = findUserByEmail(request.getUserEmail());
        Task task = new Task();
        task.setUser(user);
        task.setTitle(request.getTitle());
        if (request.getColor() != null)             task.setColor(request.getColor());
        if (request.getEstimatedMinutes() != null)  task.setEstimatedMinutes(request.getEstimatedMinutes());
        if (request.getDeadline() != null)          task.setDeadline(request.getDeadline());
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
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));

        User user = findUserByEmail(email);
        if (!task.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not own this task");
        }

        task.setStatus(request.getStatus());
        if (request.getActualMinutesSpent() != null) {
            task.setActualMinutesSpent(request.getActualMinutesSpent());
        }

        return mapToResponse(taskRepository.save(task));
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
                task.getCreatedAt()
        );
    }
}
