# Key Tables & Entities

## 1. Core Tables Summary

### `users`
- Stores registered user credentials and preferences.
- **Constraints**: `email` is unique; passwords hashed with BCrypt.

### `tasks`
- Primary unit of work.
- **Key Columns**:
  - `status`: Valid values include `pending`, `in_progress`, `completed`.
  - `estimated_minutes`: Planned duration in minutes.
  - `actual_minutes_spent`: Cumulative logged focus minutes.
  - `embedding`: 1536-dimensional float vector for semantic search.

### `time_sessions`
- Represents discrete tracking intervals.
- **Lifecycle**: `start_time` populated on start; `end_time` and `duration_minutes` populated upon completion.

### `schedules` & `schedule_time_blocks`
- Stores AI-generated weekly timetables broken down by hourly blocks.
