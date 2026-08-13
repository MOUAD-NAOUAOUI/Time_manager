package com.intelligenttime.corebackend.dto;

import java.time.ZonedDateTime;
import java.util.UUID;

public class SessionResponse {
    private UUID id;
    private UUID taskId;
    private ZonedDateTime startTime;
    private ZonedDateTime endTime;
    private Integer durationMinutes;
    private String status;

    public SessionResponse() {
    }

    public SessionResponse(UUID id, UUID taskId, ZonedDateTime startTime, ZonedDateTime endTime,
            Integer durationMinutes, String status) {
        this.id = id;
        this.taskId = taskId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.durationMinutes = durationMinutes;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public ZonedDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(ZonedDateTime startTime) {
        this.startTime = startTime;
    }

    public ZonedDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(ZonedDateTime endTime) {
        this.endTime = endTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) { this.status = status; }
}