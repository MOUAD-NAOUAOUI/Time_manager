package com.intelligenttime.corebackend.dto;

public class DailyMetricDTO {
    private String day;
    private String date;
    private int focus;
    private int tasks;

    public DailyMetricDTO() {}

    public DailyMetricDTO(String day, String date, int focus, int tasks) {
        this.day = day;
        this.date = date;
        this.focus = focus;
        this.tasks = tasks;
    }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public int getFocus() { return focus; }
    public void setFocus(int focus) { this.focus = focus; }

    public int getTasks() { return tasks; }
    public void setTasks(int tasks) { this.tasks = tasks; }
}
