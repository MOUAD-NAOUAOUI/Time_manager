package com.intelligenttime.corebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intelligenttime.corebackend.dto.*;
import com.intelligenttime.corebackend.entity.*;
import com.intelligenttime.corebackend.exception.ResourceNotFoundException;
import com.intelligenttime.corebackend.exception.UnauthorizedException;
import com.intelligenttime.corebackend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChatPersistenceService {

    private static final String USER_NOT_FOUND = "User not found: ";

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    public ChatPersistenceService(
            ChatSessionRepository sessionRepository,
            ChatMessageRepository messageRepository,
            ChatProposalRepository proposalRepository,
            UserRepository userRepository,
            TaskService taskService) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.proposalRepository = proposalRepository;
        this.userRepository = userRepository;
        this.taskService = taskService;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public ChatSession getOrCreateSession(String email, UUID sessionId) {
        if (sessionId != null) {
            return findSessionOwnedBy(sessionId, email);
        }
        return createNewSession(email);
    }

    private ChatSession findSessionOwnedBy(UUID sessionId, String email) {
        return sessionRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(findUserByEmail(email).getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found: " + sessionId));
    }

    private ChatSession createNewSession(String email) {
        User owner = findUserByEmail(email);
        ChatSession newSession = new ChatSession();
        newSession.setUser(owner);
        newSession.setTitle("Conversation - " + ZonedDateTime.now().toLocalDate());
        return sessionRepository.save(newSession);
    }

    @Transactional
    public ChatMessage saveMessage(UUID sessionId, String role, String content) {
        ChatSession session = findSession(sessionId);

        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setRole(role);
        message.setContent(content);

        session.setUpdatedAt(ZonedDateTime.now());
        sessionRepository.save(session);

        return messageRepository.save(message);
    }

    @Transactional
    public ChatProposal saveProposal(UUID sessionId, String email, ChatProposalDTO proposalDTO) {
        User user = findUserByEmail(email);
        ChatSession session = findSession(sessionId);

        ChatProposal proposal = new ChatProposal();
        proposal.setSession(session);
        proposal.setUser(user);
        proposal.setStatus("pending");
        persistProposalJson(proposal, proposalDTO);

        return proposalRepository.save(proposal);
    }

    @Transactional
    public List<TaskResponse> confirmProposal(UUID proposalId, String email) {
        User user = findUserByEmail(email);

        ChatProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found: " + proposalId));

        if (!proposal.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("Unauthorized access to proposal");
        }

        proposal.setStatus("confirmed");
        proposalRepository.save(proposal);

        return buildTasksFromProposal(proposal, email);
    }

    public List<ChatSession> getUserSessions(String email) {
        User user = findUserByEmail(email);
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
    }

    public List<ChatMessage> getSessionMessages(UUID sessionId, String email) {
        User user = findUserByEmail(email);
        ChatSession session = findSession(sessionId);

        if (!session.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("Unauthorized access to session messages");
        }

        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND + email));
    }

    private ChatSession findSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
    }

    private void persistProposalJson(ChatProposal proposal, ChatProposalDTO proposalDTO) {
        try {
            proposal.setProposedTasksJson(objectMapper.writeValueAsString(proposalDTO.getExtractedTasks()));
            proposal.setImpactAnalysisJson(objectMapper.writeValueAsString(proposalDTO.getImpactAnalysis()));
            proposal.setPriorityReasoningJson(objectMapper.writeValueAsString(proposalDTO.getPriorityRanking()));
        } catch (Exception e) {
            proposal.setProposedTasksJson("[]");
            proposal.setImpactAnalysisJson("{}");
            proposal.setPriorityReasoningJson("[]");
        }
    }

    private List<TaskResponse> buildTasksFromProposal(ChatProposal proposal, String email) {
        try {
            ExtractedTaskItemDTO[] taskArray = objectMapper.readValue(
                    proposal.getProposedTasksJson(), ExtractedTaskItemDTO[].class);
            return Arrays.stream(taskArray)
                    .map(t -> taskService.createTask(buildCreateTaskRequest(t, email)))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse and save proposal tasks", e);
        }
    }

    private CreateTaskRequest buildCreateTaskRequest(ExtractedTaskItemDTO t, String email) {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setUserEmail(email);
        req.setTitle(t.getTitle());
        req.setEstimatedMinutes(t.getEstimatedMinutes());
        req.setColor(t.getColor());
        if (t.getDeadline() != null && !t.getDeadline().isBlank()) {
            try {
                req.setDeadline(LocalDate.parse(t.getDeadline()).atStartOfDay(ZoneOffset.UTC));
            } catch (Exception e) {
                req.setDeadline(null);
            }
        }
        return req;
    }
}
