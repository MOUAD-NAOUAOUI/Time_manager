package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TimeBlockResponse {
    @JsonProperty("task_id")
    private String taskId;

    private String title;

    @JsonProperty("start_time")
    private String startTime;

    @JsonProperty("end_time")
    private String endTime;

    private String color;
    private String priority;

    @JsonProperty("energy_required")
    private String energyRequired;

    @JsonProperty("constraint_reason")
    private String constraintReason;

    public TimeBlockResponse() {}

    public String getTaskId()                            { return taskId; }
    public void setTaskId(String taskId)                 { this.taskId = taskId; }

    public String getTitle()                             { return title; }
    public void setTitle(String title)                   { this.title = title; }

    public String getStartTime()                         { return startTime; }
    public void setStartTime(String startTime)           { this.startTime = startTime; }

    public String getEndTime()                           { return endTime; }
    public void setEndTime(String endTime)               { this.endTime = endTime; }

    public String getColor()                             { return color; }
    public void setColor(String color)                   { this.color = color; }

    public String getPriority()                          { return priority; }
    public void setPriority(String priority)             { this.priority = priority; }

    public String getEnergyRequired()                    { return energyRequired; }
    public void setEnergyRequired(String energyRequired) { this.energyRequired = energyRequired; }

    public String getConstraintReason()                  { return constraintReason; }
    public void setConstraintReason(String r)            { this.constraintReason = r; }
}
