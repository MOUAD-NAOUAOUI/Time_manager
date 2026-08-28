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
public class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    @Test
    void createTask_Success() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setUserEmail("test@example.com");
        request.setTitle("Build API");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(UUID.randomUUID());
            return task;
        });

        TaskResponse response = taskService.createTask(request);

        assertNotNull(response);
        assertEquals("Build API", response.getTitle());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    void getUserTasks_Success() {
        User user = new User();
        UUID userId = UUID.randomUUID();
        user.setId(userId);
        user.setEmail("test@example.com");

        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setUser(user);
        task.setTitle("Test Task");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(taskRepository.findByUserId(userId)).thenReturn(List.of(task));

        List<TaskResponse> tasks = taskService.getUserTasks("test@example.com");

        assertEquals(1, tasks.size());
        assertEquals("Test Task", tasks.get(0).getTitle());
    }

    @Test
    void updateStatus_Success() {
        UUID taskId = UUID.randomUUID();
        User user = new User();
        UUID userId = UUID.randomUUID();
        user.setId(userId);
        user.setEmail("test@example.com");

        Task task = new Task();
        task.setId(taskId);
        task.setUser(user);
        task.setTitle("Test Task");
        task.setStatus("pending");

        UpdateTaskStatusRequest request = new UpdateTaskStatusRequest();
        request.setStatus("completed");
        request.setActualMinutesSpent(45);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = taskService.updateStatus(taskId, "test@example.com", request);

        assertNotNull(response);
        assertEquals("completed", response.getStatus());
        verify(taskRepository, times(1)).save(task);
    }

    @Test
    void updateStatus_Unauthorized() {
        UUID taskId = UUID.randomUUID();
        User owner = new User();
        owner.setId(UUID.randomUUID());
        owner.setEmail("owner@example.com");

        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setEmail("other@example.com");

        Task task = new Task();
        task.setId(taskId);
        task.setUser(owner);

        UpdateTaskStatusRequest request = new UpdateTaskStatusRequest();
        request.setStatus("completed");

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));

        assertThrows(UnauthorizedException.class, () -> taskService.updateStatus(taskId, "other@example.com", request));
    }

    @Test
    void updateStatus_NotFound() {
        UUID taskId = UUID.randomUUID();
        UpdateTaskStatusRequest request = new UpdateTaskStatusRequest();
        request.setStatus("completed");

        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> taskService.updateStatus(taskId, "test@example.com", request));
    }
}
