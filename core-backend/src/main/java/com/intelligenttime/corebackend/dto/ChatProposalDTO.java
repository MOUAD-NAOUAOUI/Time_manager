package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class ChatProposalDTO {
    @JsonProperty("extracted_tasks")
    private List<ExtractedTaskItemDTO> extractedTasks;

    @JsonProperty("impact_analysis")
    private ScheduleImpactDTO impactAnalysis;

    @JsonProperty("priority_ranking")
    private List<PriorityReasoningDTO> priorityRanking;

    public ChatProposalDTO() {}

    public List<ExtractedTaskItemDTO> getExtractedTasks() { return extractedTasks; }
    public void setExtractedTasks(List<ExtractedTaskItemDTO> extractedTasks) { this.extractedTasks = extractedTasks; }

    public ScheduleImpactDTO getImpactAnalysis() { return impactAnalysis; }
    public void setImpactAnalysis(ScheduleImpactDTO impactAnalysis) { this.impactAnalysis = impactAnalysis; }

    public List<PriorityReasoningDTO> getPriorityRanking() { return priorityRanking; }
    public void setPriorityRanking(List<PriorityReasoningDTO> priorityRanking) { this.priorityRanking = priorityRanking; }
}
