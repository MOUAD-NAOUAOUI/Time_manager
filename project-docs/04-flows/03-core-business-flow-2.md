# Core Business Flow 2: AI Productivity Evaluation & Coaching

## 1. Flow Overview
Explains how user focus session history is analyzed by the AI engine to generate actionable recommendations.

## 2. Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Next.js Dashboard
    participant Backend as Spring Boot API
    participant DB as PostgreSQL
    participant AI as Python AI Microservice
    participant Groq as Groq Cloud LLM

    User->>Frontend: Opens Dashboard / AI Coach Tab
    Frontend->>Backend: POST /ai/coach {email}
    Backend->>DB: Query weekly time_sessions & tasks
    DB-->>Backend: Returns session durations & completion ratios
    Backend->>AI: POST /api/v1/coach/evaluate (payload with metrics)
    AI->>Groq: Generate coaching assessment (Llama-3.3-70b)
    Groq-->>AI: Returns structured insight & advice
    AI-->>Backend: 200 OK {summary, advice, score}
    Backend->>DB: Persist in coaching_insights
    Backend-->>Frontend: 200 OK {summary, advice, score}
    Frontend-->>User: Render AI Coach Card & Recommendations
```
