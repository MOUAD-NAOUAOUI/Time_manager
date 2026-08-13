package com.intelligenttime.corebackend.dto;

import java.time.ZonedDateTime;
import java.util.UUID;

public class UserProfileResponse {
    private UUID id;
    private String email;
    private String timezone;
    private ZonedDateTime createdAt;
    private String plan;
    private String subscriptionStatus;

    public UserProfileResponse() {}

    public UserProfileResponse(UUID id, String email, String timezone, ZonedDateTime createdAt, String plan, String subscriptionStatus) {
        this.id = id;
        this.email = email;
        this.timezone = timezone;
        this.createdAt = createdAt;
        this.plan = plan;
        this.subscriptionStatus = subscriptionStatus;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getSubscriptionStatus() { return subscriptionStatus; }
    public void setSubscriptionStatus(String subscriptionStatus) { this.subscriptionStatus = subscriptionStatus; }
}
