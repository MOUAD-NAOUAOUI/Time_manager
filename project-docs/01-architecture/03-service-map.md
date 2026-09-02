# Service Map

## 1. Service Communication Architecture
This service map describes exact routing and inter-service HTTP endpoints.

`mermaid
flowchart LR
    subgraph Frontend [Next.js App Router]
        F1[/dashboard]
        F2[/tasks]
        F3[/schedule]
        F4[/auth]
    end

    subgraph CoreBackend [Spring Boot - Port 8080]
        C1[AuthController]
        C2[TaskController]
        C3[TimeSessionController]
        C4[ScheduleController]
        C5[AnalyticsController]
        C6[AIController]
        S_AI[AIClientService]
    end

    subgraph AIMicroservice [FastAPI - Port 8000]
        R1[/api/v1/coach/evaluate]
        R2[/api/v1/schedule/optimize]
        R3[/api/v1/decompose/task]
        R4[/api/v1/chat]
        R5[/api/v1/embeddings]
    end

    F4 -->|POST /auth/login, /register| C1
    F2 -->|GET/POST/PATCH /tasks| C2
    F1 & F2 -->|POST/PUT /sessions| C3
    F3 -->|GET/POST /schedule| C4
    F1 -->|GET /analytics/dashboard| C5
    F1 & F3 -->|POST /ai/coach, /ai/decompose| C6

    C6 --> S_AI
    S_AI -->|HTTP POST + Bearer Token| R1 & R2 & R3 & R4 & R5
`

## 2. API Contract Protocols
- **Client to Spring Boot**: Authorization: Bearer <jwt_token>
- **Spring Boot to AI Microservice**: X-Internal-Token: dev-internal-token or Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>
