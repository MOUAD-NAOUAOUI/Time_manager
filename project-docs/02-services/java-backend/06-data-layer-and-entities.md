# Data Layer & Entities

## 1. Core JPA Entities

| Entity | Table Name | Key Fields | Purpose |
| :--- | :--- | :--- | :--- |
| User | users | id, email, passwordHash, 	imezone, createdAt | System user account |
| Task | 	asks | id, userId, 	itle, color, estimatedMinutes, ctualMinutesSpent, deadline, status, priority, energyRequired, category | Unit of work to be performed |
| TimeSession | 	ime_sessions | id, 	askId, userId, startTime, endTime, durationMinutes | Recorded focus session |
| Schedule | schedules | id, userId, weekStartDate, weekEndDate, 	otalEstimatedMinutes | Generated weekly schedule container |
| ScheduleTimeBlock | schedule_time_blocks | id, scheduleId, 	askId, dayOfWeek, startHour, endHour, energyLevel | Individual slot in weekly grid |
| CoachingInsight | coaching_insights | id, userId, insightType, content, createdAt | Persisted AI feedback |
| Subscription | subscriptions | id, userId, stripeCustomerId, plan, status | Billing tier management |
| SecurityAuditLog | security_audit_logs | id, userId, ction, ipAddress, status, createdAt | Security event audit trail |
