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

}
