package com.intelligenttime.corebackend.dto;

import java.time.ZonedDateTime;
import java.util.UUID;

public class TaskResponse {
    private UUID id;
    private String title;
    private String color;
    private Integer estimatedMinutes;
    private ZonedDateTime deadline;
    private String status;
    private ZonedDateTime createdAt;
    private Integer actualMinutesSpent;
    private String priority;
    private String energyRequired;
    private String category;
    private String recurrence = "none";

    public TaskResponse() {
    }

    public TaskResponse(UUID id, String title, String color, Integer estimatedMinutes, ZonedDateTime deadline,
            String status, ZonedDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.color = color;
        this.estimatedMinutes = estimatedMinutes;
        this.deadline = deadline;
        this.status = status;
        this.createdAt = createdAt;
    }

    public TaskResponse(UUID id, String title, String color, Integer estimatedMinutes, ZonedDateTime deadline,
            String status, ZonedDateTime createdAt, Integer actualMinutesSpent, String priority,
            String energyRequired, String category) {
        this(id, title, color, estimatedMinutes, deadline, status, createdAt);
        this.actualMinutesSpent = actualMinutesSpent;
        this.priority = priority;
        this.energyRequired = energyRequired;
        this.category = category;
    }

    public TaskResponse(UUID id, String title, String color, Integer estimatedMinutes, ZonedDateTime deadline,
            String status, ZonedDateTime createdAt, Integer actualMinutesSpent, String priority,
            String energyRequired, String category, String recurrence) {
        this(id, title, color, estimatedMinutes, deadline, status, createdAt, actualMinutesSpent, priority, energyRequired, category);
        this.recurrence = recurrence != null ? recurrence : "none";
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public void setEstimatedMinutes(Integer estimatedMinutes) {
        this.estimatedMinutes = estimatedMinutes;
    }

    public ZonedDateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(ZonedDateTime deadline) {
        this.deadline = deadline;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getActualMinutesSpent() {
        return actualMinutesSpent;
    }

    public void setActualMinutesSpent(Integer actualMinutesSpent) {
        this.actualMinutesSpent = actualMinutesSpent;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getEnergyRequired() {
        return energyRequired;
    }

    public void setEnergyRequired(String energyRequired) {
        this.energyRequired = energyRequired;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getRecurrence() {
        return recurrence;
    }

    public void setRecurrence(String recurrence) {
        this.recurrence = recurrence;
    }
}
