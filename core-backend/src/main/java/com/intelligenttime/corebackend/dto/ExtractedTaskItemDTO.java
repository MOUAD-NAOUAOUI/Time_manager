package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ExtractedTaskItemDTO {
    @NotBlank(message = "Task title is required")
    private String title;

    @Min(value = 1, message = "Estimated minutes must be at least 1")
    @JsonProperty("estimated_minutes")
    @JsonAlias({ "durationMinutes", "duration_minutes" })
    private int estimatedMinutes = 30;

    private String recurrence = "none";
    private String priority = "medium";
    private String deadline;
    private String color = "#A0785A";

    @JsonProperty("priority_reason")
    private String priorityReason;

    public ExtractedTaskItemDTO() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(int estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

    @JsonProperty("durationMinutes")
    public int getDurationMinutes() { return estimatedMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.estimatedMinutes = durationMinutes; }

    public String getRecurrence() { return recurrence; }
    public void setRecurrence(String recurrence) { this.recurrence = recurrence; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getDeadline() { return deadline; }
    public void setDeadline(String deadline) { this.deadline = deadline; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getPriorityReason() { return priorityReason; }
    public void setPriorityReason(String priorityReason) { this.priorityReason = priorityReason; }
}
