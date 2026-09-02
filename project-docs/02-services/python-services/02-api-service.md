# FastAPI Application & Routers

## 1. Main Entry Point (`main.py`)
The application is booted via `main.py` which registers CORS middleware and mounts modular API routers.

```python
# ai-microservice/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    coach_router,
    schedule_router,
    decompose_router,
    chat_router,
    analytics_router,
    embeddings_router
)

app = FastAPI(title="Intelligent Time Manager - AI Microservice", version="1.0.0")
```

## 2. API Endpoints
| Router | Endpoint | Method | Purpose |
| :--- | :--- | :--- | :--- |
| `coach_router` | `/api/v1/coach/evaluate` | POST | Generates qualitative feedback and scores based on recent focus history |
| `schedule_router` | `/api/v1/schedule/optimize` | POST | Takes a list of tasks and returns an optimized weekly/daily timetable |
| `decompose_router` | `/api/v1/decompose/task` | POST | Decomposes a large task or goal into concrete subtasks |
| `chat_router` | `/api/v1/chat` | POST | Interactive conversation with productivity assistant |
| `embeddings_router` | `/api/v1/embeddings` | POST | Generates float vectors for tasks |
