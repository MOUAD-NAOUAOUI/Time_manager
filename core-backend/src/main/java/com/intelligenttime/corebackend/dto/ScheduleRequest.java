package com.intelligenttime.corebackend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class ScheduleRequest {
    private String userEmail;

    @NotEmpty(message = "At least one task is required to generate a schedule")
    @Valid
    private List<ScheduleTaskItem> tasks;

    private int startHour = 9;
    private int endHour   = 18;
    private String date;
    private String timezone = "UTC";

    public ScheduleRequest() {}

    public String getUserEmail()                         { return userEmail; }
    public void setUserEmail(String userEmail)           { this.userEmail = userEmail; }

    public List<ScheduleTaskItem> getTasks()             { return tasks; }
    public void setTasks(List<ScheduleTaskItem> tasks)   { this.tasks = tasks; }

    public int getStartHour()                            { return startHour; }
    public void setStartHour(int startHour)              { this.startHour = startHour; }

    public int getEndHour()                              { return endHour; }
    public void setEndHour(int endHour)                  { this.endHour = endHour; }

    public String getDate()                              { return date; }
    public void setDate(String date)                     { this.date = date; }

    public String getTimezone()                          { return timezone; }
    public void setTimezone(String timezone)             { this.timezone = timezone; }
}
