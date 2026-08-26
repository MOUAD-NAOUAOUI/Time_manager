package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_proposals")
public class ChatProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "pending"; // "pending", "confirmed", "rejected"

    @Column(name = "proposed_tasks_json", nullable = false, columnDefinition = "TEXT")
    private String proposedTasksJson;

    @Column(name = "impact_analysis_json", nullable = false, columnDefinition = "TEXT")
    private String impactAnalysisJson;

    @Column(name = "priority_reasoning_json", columnDefinition = "TEXT")
    private String priorityReasoningJson;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public ChatSession getSession() { return session; }
    public void setSession(ChatSession session) { this.session = session; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProposedTasksJson() { return proposedTasksJson; }
    public void setProposedTasksJson(String proposedTasksJson) { this.proposedTasksJson = proposedTasksJson; }

    public String getImpactAnalysisJson() { return impactAnalysisJson; }
    public void setImpactAnalysisJson(String impactAnalysisJson) { this.impactAnalysisJson = impactAnalysisJson; }

    public String getPriorityReasoningJson() { return priorityReasoningJson; }
    public void setPriorityReasoningJson(String priorityReasoningJson) { this.priorityReasoningJson = priorityReasoningJson; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
