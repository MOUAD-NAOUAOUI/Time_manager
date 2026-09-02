# Controllers and Endpoints

## 1. Controller Summary

### AuthController (/auth)
- POST /auth/register: Creates new user account, hashes password with BCrypt.
- POST /auth/login: Authenticates credentials, returns signed JWT.

### TaskController (/tasks)
- GET /tasks: Lists user tasks.
- POST /tasks: Creates a task.
- PUT /tasks/{id}: Updates task details.
- PATCH /tasks/{id}/status: Updates task status (e.g. completed, pending) or appends estimated minutes (ddMinutes).
- DELETE /tasks/{id}: Soft/Hard deletes task.

### TimeSessionController (/sessions)
- POST /sessions: Starts a new focus timer session.
- PUT /sessions/{id}/stop: Concludes the active timer, computes duration, updates task actual minutes spent, and resets task to pending if not finished.
- GET /sessions/active: Retrieves the currently running session for recovery across browser reloads.

### ScheduleController (/schedule)
- GET /schedule/weekly: Retrieves planned schedule blocks within a date range.
- POST /schedule/generate: Forwards request to AI service to compute optimized timetable.

### AnalyticsController (/analytics)
- GET /analytics/dashboard: Aggregates total tasks, completion rates, total focus minutes, and daily completion history.

### AIController (/ai)
- POST /ai/coach: Requests dynamic coaching evaluation from Python AI service.
- POST /ai/decompose: Requests task breakdown into subtasks.
