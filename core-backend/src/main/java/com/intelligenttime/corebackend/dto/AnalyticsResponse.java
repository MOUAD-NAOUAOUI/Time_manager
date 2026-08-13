package com.intelligenttime.corebackend.dto;

public class AnalyticsResponse {
    private int totalTasks;
    private int completedTasks;
    private int pendingTasks;
    private int totalFocusMinutes;
    private double completionRate;

    public AnalyticsResponse() {}

    public AnalyticsResponse(int totalTasks, int completedTasks, int pendingTasks, int totalFocusMinutes, double completionRate) {
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.pendingTasks = pendingTasks;
        this.totalFocusMinutes = totalFocusMinutes;
        this.completionRate = completionRate;
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
}
