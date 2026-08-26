package com.intelligenttime.corebackend.dto;

import java.util.ArrayList;
import java.util.List;

public class AnalyticsResponse {
    private int totalTasks;
    private int completedTasks;
    private int pendingTasks;
    private int totalFocusMinutes;
    private double completionRate;
    private List<DailyMetricDTO> weeklyMetrics = new ArrayList<>();

    public AnalyticsResponse() {}

    public AnalyticsResponse(int totalTasks, int completedTasks, int pendingTasks, int totalFocusMinutes, double completionRate) {
        this(totalTasks, completedTasks, pendingTasks, totalFocusMinutes, completionRate, new ArrayList<>());
    }

    public AnalyticsResponse(int totalTasks, int completedTasks, int pendingTasks, int totalFocusMinutes, double completionRate, List<DailyMetricDTO> weeklyMetrics) {
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.pendingTasks = pendingTasks;
        this.totalFocusMinutes = totalFocusMinutes;
        this.completionRate = completionRate;
        this.weeklyMetrics = weeklyMetrics != null ? weeklyMetrics : new ArrayList<>();
    }

    public int getTotalTasks() { return totalTasks; }
    public void setTotalTasks(int totalTasks) { this.totalTasks = totalTasks; }

    public int getCompletedTasks() { return completedTasks; }
    public void setCompletedTasks(int completedTasks) { this.completedTasks = completedTasks; }

    public int getPendingTasks() { return pendingTasks; }
    public void setPendingTasks(int pendingTasks) { this.pendingTasks = pendingTasks; }

    public int getTotalFocusMinutes() { return totalFocusMinutes; }
    public void setTotalFocusMinutes(int totalFocusMinutes) { this.totalFocusMinutes = totalFocusMinutes; }

    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }

    public List<DailyMetricDTO> getWeeklyMetrics() { return weeklyMetrics; }
    public void setWeeklyMetrics(List<DailyMetricDTO> weeklyMetrics) { this.weeklyMetrics = weeklyMetrics; }
}
