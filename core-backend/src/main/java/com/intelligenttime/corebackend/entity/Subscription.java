package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "subscriptions")

public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "plan", nullable = false)
    private String plan = "free";

    @Column(name = "status", nullable = false)
    private String status = "active";

    @Column(name = "current_period_start")
    private ZonedDateTime currentPeriodStart;

    @Column(name = "current_period_end")
    private ZonedDateTime currentPeriodEnd;

    @Column(name = "created_at", updatable = false, nullable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

}