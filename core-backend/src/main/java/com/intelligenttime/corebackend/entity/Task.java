package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
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

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes = 30;

    @Column(name = "deadline")
    private ZonedDateTime deadline;

    @Column(name = "status")
    private String status = "pending";

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();
}