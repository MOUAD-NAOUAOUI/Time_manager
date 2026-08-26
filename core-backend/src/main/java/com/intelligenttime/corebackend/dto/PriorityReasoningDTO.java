package com.intelligenttime.corebackend.dto;

public class PriorityReasoningDTO {
    private int rank;
    private String title;
    private String reason;

    public PriorityReasoningDTO() {}

    public PriorityReasoningDTO(int rank, String title, String reason) {
        this.rank = rank;
        this.title = title;
        this.reason = reason;
    }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
