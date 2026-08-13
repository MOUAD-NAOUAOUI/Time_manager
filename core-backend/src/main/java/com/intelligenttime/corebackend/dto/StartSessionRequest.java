package com.intelligenttime.corebackend.dto;

import java.util.UUID;

public class StartSessionRequest {
    private String userEmail;
    private UUID taskId;

    public StartSessionRequest() {
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

}
