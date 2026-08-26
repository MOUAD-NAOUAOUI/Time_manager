package com.intelligenttime.corebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ScheduleImpactDTO {
    @JsonProperty("existing_task_count")
    private int existingTaskCount;

    @JsonProperty("existing_total_minutes")
    private int existingTotalMinutes;

    @JsonProperty("added_minutes")
    private int addedMinutes;

    @JsonProperty("new_total_minutes")
    private int newTotalMinutes;

    @JsonProperty("weekly_capacity_percent")
    private double weeklyCapacityPercent;

    @JsonProperty("overload_warning")
    private boolean overloadWarning;

    @JsonProperty("collision_warning")
    private boolean collisionWarning;

    private String summary;

    public ScheduleImpactDTO() {}

    public int getExistingTaskCount() { return existingTaskCount; }
    public void setExistingTaskCount(int existingTaskCount) { this.existingTaskCount = existingTaskCount; }

    public int getExistingTotalMinutes() { return existingTotalMinutes; }
    public void setExistingTotalMinutes(int existingTotalMinutes) { this.existingTotalMinutes = existingTotalMinutes; }

    public int getAddedMinutes() { return addedMinutes; }
    public void setAddedMinutes(int addedMinutes) { this.addedMinutes = addedMinutes; }

    public int getNewTotalMinutes() { return newTotalMinutes; }
    public void setNewTotalMinutes(int newTotalMinutes) { this.newTotalMinutes = newTotalMinutes; }

    public double getWeeklyCapacityPercent() { return weeklyCapacityPercent; }
    public void setWeeklyCapacityPercent(double weeklyCapacityPercent) { this.weeklyCapacityPercent = weeklyCapacityPercent; }

    public boolean isOverloadWarning() { return overloadWarning; }
    public void setOverloadWarning(boolean overloadWarning) { this.overloadWarning = overloadWarning; }

    public boolean isCollisionWarning() { return collisionWarning; }
    public void setCollisionWarning(boolean collisionWarning) { this.collisionWarning = collisionWarning; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
}
