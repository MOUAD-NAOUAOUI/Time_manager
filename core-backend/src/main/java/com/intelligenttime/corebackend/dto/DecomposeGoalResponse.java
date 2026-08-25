package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class DecomposeGoalResponse {
    @JsonProperty("user_email")
    private String userEmail;

    @JsonProperty("original_goal")
    private String originalGoal;

    @JsonProperty("total_estimated_minutes")
    private int totalEstimatedMinutes;

    private List<DecomposedSubTaskResponse> tasks;

    @JsonProperty("ai_guidance")
    private String aiGuidance;

    public DecomposeGoalResponse() {}

    public DecomposeGoalResponse(String userEmail, String originalGoal, int totalEstimatedMinutes,
                                 List<DecomposedSubTaskResponse> tasks, String aiGuidance) {
        this.userEmail = userEmail;
        this.originalGoal = originalGoal;
        this.totalEstimatedMinutes = totalEstimatedMinutes;
        this.tasks = tasks;
        this.aiGuidance = aiGuidance;
    }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getOriginalGoal() { return originalGoal; }
    public void setOriginalGoal(String originalGoal) { this.originalGoal = originalGoal; }

    public int getTotalEstimatedMinutes() { return totalEstimatedMinutes; }
    public void setTotalEstimatedMinutes(int totalEstimatedMinutes) { this.totalEstimatedMinutes = totalEstimatedMinutes; }

    public List<DecomposedSubTaskResponse> getTasks() { return tasks; }
    public void setTasks(List<DecomposedSubTaskResponse> tasks) { this.tasks = tasks; }

    public String getAiGuidance() { return aiGuidance; }
    public void setAiGuidance(String aiGuidance) { this.aiGuidance = aiGuidance; }
}
