package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.ZonedDateTime;

public class CreateTaskRequest {
    private String userEmail;

    @NotBlank(message = "Task title is required")
    private String title;

    private String color = "#A0785A";

    @Min(value = 1, message = "Estimated minutes must be at least 1")
    private Integer estimatedMinutes = 30;

    private ZonedDateTime deadline;

    public CreateTaskRequest() {}

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

    public ZonedDateTime getDeadline() { return deadline; }
    public void setDeadline(ZonedDateTime deadline) { this.deadline = deadline; }
}
