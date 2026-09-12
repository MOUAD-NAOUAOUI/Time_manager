package com.intelligenttime.corebackend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class ConfirmProposalRequest {
    private String userEmail;

    @NotEmpty(message = "Tasks list to confirm cannot be empty")
    @Valid
    private List<ExtractedTaskItemDTO> tasks;

    public ConfirmProposalRequest() {}

    public ConfirmProposalRequest(List<ExtractedTaskItemDTO> tasks) {
        this.tasks = tasks;
    }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public List<ExtractedTaskItemDTO> getTasks() { return tasks; }
    public void setTasks(List<ExtractedTaskItemDTO> tasks) { this.tasks = tasks; }
}
