package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "schedules", uniqueConstraints = {
        @UniqueConstraint(name = "unique_user_schedule_date", columnNames = {"user_id", "schedule_date"})
})
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;

    @Column(name = "start_hour", nullable = false)
    private Integer startHour = 9;

    @Column(name = "end_hour", nullable = false)
    private Integer endHour = 18;

    @Column(name = "total_planned_minutes", nullable = false)
    private Integer totalPlannedMinutes = 0;

    @Column(name = "utilization_percent", nullable = false)
    private Double utilizationPercent = 0.0;

    @Column(name = "overload_warning", nullable = false)
    private Boolean overloadWarning = false;

    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScheduleTimeBlock> timeBlocks = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getScheduleDate() { return scheduleDate; }
    public void setScheduleDate(LocalDate scheduleDate) { this.scheduleDate = scheduleDate; }

    public Integer getStartHour() { return startHour; }
    public void setStartHour(Integer startHour) { this.startHour = startHour; }

    public Integer getEndHour() { return endHour; }
    public void setEndHour(Integer endHour) { this.endHour = endHour; }

    public Integer getTotalPlannedMinutes() { return totalPlannedMinutes; }
    public void setTotalPlannedMinutes(Integer totalPlannedMinutes) { this.totalPlannedMinutes = totalPlannedMinutes; }

    public Double getUtilizationPercent() { return utilizationPercent; }
    public void setUtilizationPercent(Double utilizationPercent) { this.utilizationPercent = utilizationPercent; }

    public Boolean getOverloadWarning() { return overloadWarning; }
    public void setOverloadWarning(Boolean overloadWarning) { this.overloadWarning = overloadWarning; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public List<ScheduleTimeBlock> getTimeBlocks() { return timeBlocks; }
    public void setTimeBlocks(List<ScheduleTimeBlock> timeBlocks) { this.timeBlocks = timeBlocks; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
