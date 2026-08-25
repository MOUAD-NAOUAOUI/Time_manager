package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ScheduleTaskItem {
    @NotNull(message = "Task ID is required")
    private String id;

    @NotBlank(message = "Task title is required")
    private String title;

    @Min(value = 1, message = "Estimated minutes must be at least 1")
    private int estimatedMinutes;

    private String deadline;
    private String priority      = "medium";
    private String energyRequired = "medium";
    private String color         = "#A0785A";

    public ScheduleTaskItem() {}

    public String getId()                          { return id; }
    public void setId(String id)                   { this.id = id; }

    public String getTitle()                       { return title; }
    public void setTitle(String title)             { this.title = title; }

    public int getEstimatedMinutes()               { return estimatedMinutes; }
    public void setEstimatedMinutes(int m)         { this.estimatedMinutes = m; }

    public String getDeadline()                    { return deadline; }
    public void setDeadline(String deadline)       { this.deadline = deadline; }

    public String getPriority()                    { return priority; }
    public void setPriority(String priority)       { this.priority = priority; }

    public String getEnergyRequired()              { return energyRequired; }
    public void setEnergyRequired(String e)        { this.energyRequired = e; }

    public String getColor()                       { return color; }
    public void setColor(String color)             { this.color = color; }
}
