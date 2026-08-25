package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class ScheduleMetrics {
    @JsonProperty("total_tasks")
    private int totalTasks;

    @JsonProperty("scheduled_tasks")
    private int scheduledTasks;

    @JsonProperty("unscheduled_tasks")
    private int unscheduledTasks;

    @JsonProperty("total_planned_minutes")
    private int totalPlannedMinutes;

    @JsonProperty("available_work_minutes")
    private int availableWorkMinutes;

    @JsonProperty("utilization_percent")
    private double utilizationPercent;

    @JsonProperty("overload_warning")
    private boolean overloadWarning;

    @JsonProperty("deadline_conflicts")
    private List<String> deadlineConflicts;

    public ScheduleMetrics() {}

    public int getTotalTasks()                              { return totalTasks; }
    public void setTotalTasks(int totalTasks)               { this.totalTasks = totalTasks; }

    public int getScheduledTasks()                          { return scheduledTasks; }
    public void setScheduledTasks(int scheduledTasks)       { this.scheduledTasks = scheduledTasks; }

    public int getUnscheduledTasks()                        { return unscheduledTasks; }
    public void setUnscheduledTasks(int u)                  { this.unscheduledTasks = u; }

    public int getTotalPlannedMinutes()                     { return totalPlannedMinutes; }
    public void setTotalPlannedMinutes(int t)               { this.totalPlannedMinutes = t; }

    public int getAvailableWorkMinutes()                    { return availableWorkMinutes; }
    public void setAvailableWorkMinutes(int a)              { this.availableWorkMinutes = a; }

    public double getUtilizationPercent()                   { return utilizationPercent; }
    public void setUtilizationPercent(double u)             { this.utilizationPercent = u; }

    public boolean isOverloadWarning()                      { return overloadWarning; }
    public void setOverloadWarning(boolean overloadWarning) { this.overloadWarning = overloadWarning; }

    public List<String> getDeadlineConflicts()              { return deadlineConflicts; }
    public void setDeadlineConflicts(List<String> d)        { this.deadlineConflicts = d; }
}
