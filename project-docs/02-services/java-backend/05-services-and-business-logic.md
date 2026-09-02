# Services & Business Logic

## 1. Key Services

### TaskService.java
- Manages task CRUD and status transitions.
- Handles atomic incremental updates via updateStatus(id, request).
- Calculates total accumulated ctualMinutesSpent.

### TimeSessionService.java
- Controls start/stop transitions of focus sessions.
- Automatically marks the task as in_progress upon timer start.
- On session stop, calculates elapsed minutes, adds them to task's ctualMinutesSpent, and resets status to pending (if task was not explicitly completed).

### AIClientService.java
- Encapsulates HTTP calls to http://localhost:8000 (FastAPI).
- Handles timeouts, fallback payloads, and header injection (X-Internal-Token).

### RateLimiterService.java
- Implements Redis-backed token bucket algorithm to throttle sensitive endpoints (e.g., Auth and AI endpoints) to protect system resources.

### AnalyticsService.java
- Aggregates metrics from TaskRepository and TimeSessionRepository.
