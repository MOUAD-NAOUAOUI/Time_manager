package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.CreateTaskRequest;
import com.intelligenttime.corebackend.dto.TaskResponse;
import com.intelligenttime.corebackend.entity.Task;
import com.intelligenttime.corebackend.entity.User;
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
}
