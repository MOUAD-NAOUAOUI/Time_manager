package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class DecomposeGoalRequest {
    @NotBlank(message = "Goal description is required")
    private String goal;

    @Min(value = 1, message = "Target hours must be at least 1")
    private Integer targetHours = 4;

    public DecomposeGoalRequest() {}

    public DecomposeGoalRequest(String goal, Integer targetHours) {
        this.goal = goal;
        this.targetHours = targetHours;
    }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public Integer getTargetHours() { return targetHours; }
    public void setTargetHours(Integer targetHours) { this.targetHours = targetHours; }
}