# Scheduled Tasks & Background Processing

## 1. Current Architecture
- The AI service operates primarily in a synchronous request-response pattern triggered by user actions or backend proxy requests.
- Asynchronous tasks (e.g. background embedding generation and nightly summary aggregation) are invoked by Spring Boot cron schedules or FastAPI background tasks (`fastapi.BackgroundTasks`).

## 2. Roadmap / Future Evolution
- Integration with Celery or Redis Streams for heavy batch scoring of historical weekly data across large user cohorts.
