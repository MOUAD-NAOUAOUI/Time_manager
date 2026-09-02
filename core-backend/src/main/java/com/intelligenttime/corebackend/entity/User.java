package com.intelligenttime.corebackend.entity;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "timezone")
    private String timezone = "UTC";

    @Column(name = "sleep_start_time")
    private String sleepStartTime = "22:00";

    @Column(name = "sleep_end_time")
    private String sleepEndTime = "06:00";

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public String getSleepStartTime() { return sleepStartTime; }
    public void setSleepStartTime(String sleepStartTime) { this.sleepStartTime = sleepStartTime; }

    public String getSleepEndTime() { return sleepEndTime; }
    public void setSleepEndTime(String sleepEndTime) { this.sleepEndTime = sleepEndTime; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
