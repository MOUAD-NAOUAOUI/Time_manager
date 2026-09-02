# Container Diagram

## 1. Overview
The Container Diagram depicts the high-level technical shape of TimeSpace: the client application, backend services, databases, and third-party integrations.

## 2. Mermaid Diagram
`mermaid
flowchart TB
    User([Web User])

    subgraph UserDevice [User Workstation]
        SPA[Next.js 16 Web Application\nReact 19, Tailwind CSS v4, Recharts\nPort 3000]
    end

    subgraph ServerEnvironment [Backend Infrastructure]
        JavaAPI[Core Backend Service\nSpring Boot 3.2, Java 17/21\nPort 8080]
        PythonAI[AI Microservice\nFastAPI, Groq SDK, Uvicorn\nPort 8000]
        Postgres[(PostgreSQL 16 Database\n+ pgvector extension\nPort 5432)]
        RedisCache[(Redis In-Memory Cache\nRate Limiting & Sessions\nPort 6379)]
    end

    subgraph ExternalCloud [External Cloud APIs]
        Groq[Groq LLM Cloud API]
        Stripe[Stripe API]
    end

    User -->|HTTPS / Browser| SPA
    SPA -->|JSON / REST / JWT Bearer| JavaAPI
    JavaAPI -->|JPA / JDBC / SQL| Postgres
    JavaAPI -->|Redis Protocol / Jedis| RedisCache
    JavaAPI -->|Internal HTTP / Bearer Token| PythonAI
    PythonAI -->|REST / HTTPS| Groq
    JavaAPI -->|REST / HTTPS| Stripe
`

## 3. Container Responsibilities
1. **Next.js Web App (rontend/)**: Renders reactive UI, manages client state, runs live timer loop, renders charts.
2. **Spring Boot Core Backend (core-backend/)**: Single point of truth for domain logic, authentication, task persistence, session time calculation, and audit trail.
3. **FastAPI AI Service (i-microservice/)**: AI orchestration, prompt engineering, task decomposition, and constraint scheduling.
4. **PostgreSQL (database/)**: Relational tables (users, 	asks, 	ime_sessions, schedules, coaching_insights) and vector column ector(1536).
5. **Redis**: Sliding-window / token-bucket rate limiter for protecting endpoints from abuse.
