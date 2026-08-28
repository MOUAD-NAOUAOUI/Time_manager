package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.ChatProposalDTO;
import com.intelligenttime.corebackend.dto.ExtractedTaskItemDTO;
import com.intelligenttime.corebackend.dto.ScheduleImpactDTO;
import com.intelligenttime.corebackend.entity.ChatMessage;
import com.intelligenttime.corebackend.entity.ChatProposal;
import com.intelligenttime.corebackend.entity.ChatSession;
import com.intelligenttime.corebackend.entity.User;
import com.intelligenttime.corebackend.repository.ChatMessageRepository;
import com.intelligenttime.corebackend.repository.ChatProposalRepository;
import com.intelligenttime.corebackend.repository.ChatSessionRepository;
import com.intelligenttime.corebackend.repository.TaskRepository;
import com.intelligenttime.corebackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
public class ChatPersistenceServiceTest {

    @Mock
    private ChatSessionRepository sessionRepository;

    @Mock
    private ChatMessageRepository messageRepository;

    @Mock
    private ChatProposalRepository proposalRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    private ChatPersistenceService chatPersistenceService;
    private User user;
    private ChatSession session;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("chat@example.com");

        session = new ChatSession();
        session.setId(UUID.randomUUID());
        session.setUser(user);

        // Build TaskService from mocked repositories (avoids Mockito byte-buddy
        // instrumentation issues on the concrete service class)
        TaskService taskService = new TaskService(taskRepository, userRepository);

        chatPersistenceService = new ChatPersistenceService(
                sessionRepository,
                messageRepository,
                proposalRepository,
                userRepository,
                taskService);
    }

    @Test
    void getOrCreateSession_NewSession_Success() {
        when(userRepository.findByEmail("chat@example.com")).thenReturn(Optional.of(user));
        when(sessionRepository.save(any(ChatSession.class))).thenReturn(session);

        ChatSession result = chatPersistenceService.getOrCreateSession("chat@example.com", null);
        assertNotNull(result);
        assertEquals(session.getId(), result.getId());
    }

    @Test
    void saveMessage_Success() {
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(ChatSession.class))).thenReturn(session);

        ChatMessage message = new ChatMessage();
        message.setId(UUID.randomUUID());
        message.setSession(session);
        message.setRole("user");
        message.setContent("Hello AI");

        when(messageRepository.save(any(ChatMessage.class))).thenReturn(message);

        ChatMessage result = chatPersistenceService.saveMessage(session.getId(), "user", "Hello AI");
        assertNotNull(result);
        assertEquals("user", result.getRole());
        assertEquals("Hello AI", result.getContent());
    }

    @Test
    void saveProposal_Success() {
        when(userRepository.findByEmail("chat@example.com")).thenReturn(Optional.of(user));
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        ChatProposal proposal = new ChatProposal();
        proposal.setId(UUID.randomUUID());
        proposal.setStatus("pending");

        when(proposalRepository.save(any(ChatProposal.class))).thenReturn(proposal);

        ChatProposalDTO dto = new ChatProposalDTO();

        ExtractedTaskItemDTO task = new ExtractedTaskItemDTO();
        task.setTitle("Task 1");
        task.setEstimatedMinutes(30);
        task.setPriority("high");
        task.setColor("#A0785A");
        task.setPriorityReason("Urgent");

        ScheduleImpactDTO impact = new ScheduleImpactDTO();
        impact.setExistingTaskCount(0);
        impact.setExistingTotalMinutes(0);
        impact.setAddedMinutes(30);
        impact.setNewTotalMinutes(30);
        impact.setWeeklyCapacityPercent(1.25);
        impact.setOverloadWarning(false);
        impact.setCollisionWarning(false);
        impact.setSummary("Good");

        dto.setExtractedTasks(List.of(task));
        dto.setImpactAnalysis(impact);

        ChatProposal result = chatPersistenceService.saveProposal(session.getId(), "chat@example.com", dto);
        assertNotNull(result);
        assertEquals("pending", result.getStatus());
    }
}
