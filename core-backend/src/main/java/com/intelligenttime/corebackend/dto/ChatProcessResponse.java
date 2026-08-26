package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ChatProcessResponse {
    @JsonProperty("user_email")
    private String userEmail;

    private String message;

    @JsonProperty("ai_reply")
    private String aiReply;

    private ChatProposalDTO proposal;

    public ChatProcessResponse() {}

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getAiReply() { return aiReply; }
    public void setAiReply(String aiReply) { this.aiReply = aiReply; }

    public ChatProposalDTO getProposal() { return proposal; }
    public void setProposal(ChatProposalDTO proposal) { this.proposal = proposal; }
}
