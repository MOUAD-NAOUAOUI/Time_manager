package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateTaskStatusRequest {

    @NotBlank(message = "Status is required")
    @Pattern(
        regexp = "pending|in_progress|completed|cancelled",
        message = "Status must be one of: pending, in_progress, completed, cancelled"
    )
    private String status;

    private Integer actualMinutesSpent;

    public UpdateTaskStatusRequest() {}

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getActualMinutesSpent() { return actualMinutesSpent; }
    public void setActualMinutesSpent(Integer actualMinutesSpent) { this.actualMinutesSpent = actualMinutesSpent; }
}
