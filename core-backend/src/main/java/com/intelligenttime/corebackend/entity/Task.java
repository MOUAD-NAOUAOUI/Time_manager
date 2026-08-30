package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "color")
    private String color = "#A0785A";

    @Column(name = "recurrence", length = 50)
    private String recurrence = "none";

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes = 30;

    @Column(name = "actual_minutes_spent")
    private Integer actualMinutesSpent = 0;

    @Column(name = "priority", length = 20)
    private String priority = "medium";

    @Column(name = "energy_required", length = 20)
    private String energyRequired = "medium";

    @Column(name = "category", length = 100)
    private String category = "general";

    @Column(name = "deadline")
    private ZonedDateTime deadline;

    @Column(name = "status")
    private String status = "pending";

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getRecurrence() { return recurrence; }
    public void setRecurrence(String recurrence) { this.recurrence = recurrence; }

    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

    public Integer getActualMinutesSpent() { return actualMinutesSpent; }
    public void setActualMinutesSpent(Integer actualMinutesSpent) { this.actualMinutesSpent = actualMinutesSpent; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getEnergyRequired() { return energyRequired; }
    public void setEnergyRequired(String energyRequired) { this.energyRequired = energyRequired; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public ZonedDateTime getDeadline() { return deadline; }
    public void setDeadline(ZonedDateTime deadline) { this.deadline = deadline; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}