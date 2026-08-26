package com.intelligenttime.corebackend.entity;

import com.intelligenttime.corebackend.security.AesEncryptionConverter;
import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

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

    @Convert(converter = AesEncryptionConverter.class)
    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "current_period_start")
    private ZonedDateTime currentPeriodStart;

    @Column(name = "current_period_end")
    private ZonedDateTime currentPeriodEnd;

    @Column(name = "created_at", updatable = false, nullable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public ZonedDateTime getCurrentPeriodStart() { return currentPeriodStart; }
    public void setCurrentPeriodStart(ZonedDateTime currentPeriodStart) { this.currentPeriodStart = currentPeriodStart; }

    public ZonedDateTime getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(ZonedDateTime currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}