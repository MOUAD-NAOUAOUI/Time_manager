package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.NotBlank;

public class SleepPreferencesRequest {
    @NotBlank(message = "Sleep start time is required")
    private String sleepStartTime;

    @NotBlank(message = "Sleep end time is required")
    private String sleepEndTime;

    public SleepPreferencesRequest() {}

    public SleepPreferencesRequest(String sleepStartTime, String sleepEndTime) {
        this.sleepStartTime = sleepStartTime;
        this.sleepEndTime = sleepEndTime;
    }

    public String getSleepStartTime() {
        return sleepStartTime;
    }

    public void setSleepStartTime(String sleepStartTime) {
        this.sleepStartTime = sleepStartTime;
    }

    public String getSleepEndTime() {
        return sleepEndTime;
    }

    public void setSleepEndTime(String sleepEndTime) {
        this.sleepEndTime = sleepEndTime;
    }
}