package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DecomposedSubTaskResponse {
    private String title;
    @JsonProperty("estimated_minutes")
    private int estimatedMinutes;
    private String priority;
    private String color;

    public DecomposedSubTaskResponse() {
    }

    public DecomposedSubTaskResponse(String title, int estimatedMinutes, String priority, String color) {
        this.title = title;
        this.estimatedMinutes = estimatedMinutes;
        this.priority = priority;
        this.color = color;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public void setEstimatedMinutes(int estimatedMinutes) {
        this.estimatedMinutes = estimatedMinutes;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}