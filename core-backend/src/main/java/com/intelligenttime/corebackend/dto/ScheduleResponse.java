package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class ScheduleResponse {
    @JsonProperty("user_email")
    private String userEmail;

    private List<TimeBlockResponse> schedule;
    private ScheduleMetrics metrics;
    private String recommendation;

    public ScheduleResponse() {}

    public String getUserEmail()                         { return userEmail; }
    public void setUserEmail(String userEmail)           { this.userEmail = userEmail; }

    public List<TimeBlockResponse> getSchedule()         { return schedule; }
    public void setSchedule(List<TimeBlockResponse> s)   { this.schedule = s; }

    public ScheduleMetrics getMetrics()                  { return metrics; }
    public void setMetrics(ScheduleMetrics metrics)      { this.metrics = metrics; }

    public String getRecommendation()                    { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
}
