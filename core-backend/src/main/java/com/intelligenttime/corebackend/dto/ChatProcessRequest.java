package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class ChatProcessRequest {
    private String userEmail;

    @NotBlank(message = "Message prompt cannot be empty")
    private String message;

    private List<TaskResponse> existingTasks;

    public ChatProcessRequest() {}

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<TaskResponse> getExistingTasks() { return existingTasks; }
    public void setExistingTasks(List<TaskResponse> existingTasks) { this.existingTasks = existingTasks; }
}
