package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "coaching_insights")
public class CoachingInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "analysis", nullable = false, columnDefinition = "TEXT")
    private String analysis;

    @Column(name = "tips_json", nullable = false, columnDefinition = "TEXT")
    private String tipsJson;

    @Column(name = "completion_rate", nullable = false)
    private Double completionRate = 0.0;

    @Column(name = "total_focus_minutes", nullable = false)
    private Integer totalFocusMinutes = 0;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getAnalysis() { return analysis; }
    public void setAnalysis(String analysis) { this.analysis = analysis; }

    public String getTipsJson() { return tipsJson; }
    public void setTipsJson(String tipsJson) { this.tipsJson = tipsJson; }

    public Double getCompletionRate() { return completionRate; }
    public void setCompletionRate(Double completionRate) { this.completionRate = completionRate; }

    public Integer getTotalFocusMinutes() { return totalFocusMinutes; }
    public void setTotalFocusMinutes(Integer totalFocusMinutes) { this.totalFocusMinutes = totalFocusMinutes; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
