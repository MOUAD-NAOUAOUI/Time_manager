package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateTaskStatusRequest {

    @Pattern(
        regexp = "pending|in_progress|completed|cancelled",
        message = "Status must be one of: pending, in_progress, completed, cancelled"
    )
    private String status;

    private Integer actualMinutesSpent;
    private Integer estimatedMinutes;
    private Integer addMinutes;

    public UpdateTaskStatusRequest() {}

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getActualMinutesSpent() { return actualMinutesSpent; }
    public void setActualMinutesSpent(Integer actualMinutesSpent) { this.actualMinutesSpent = actualMinutesSpent; }

    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

    public Integer getAddMinutes() { return addMinutes; }
    public void setAddMinutes(Integer addMinutes) { this.addMinutes = addMinutes; }
}
