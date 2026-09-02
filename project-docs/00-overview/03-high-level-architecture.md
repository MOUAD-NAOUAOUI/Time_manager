# High-Level Architecture

## 1. Architecture Style
TimeSpace adopts a **Microservices-leaning Polyglot Architecture**:
- **Next.js Single Page / Hybrid Web Application**: Serves the user interface on port 3000.
- **Spring Boot Core Backend Service**: Serves core business logic, user auth, and transactional persistence on port 8080.
- **FastAPI AI Microservice**: Serves specialized ML/LLM pipelines and vector calculations on port 8000.
- **PostgreSQL Database with pgvector**: Single source of truth for relational tables and high-dimensional embeddings.
- **Redis In-Memory Store**: Token-bucket rate limiting and session caching.

## 2. High-Level Block Diagram

`
+-----------------------------------------------------------+
|                        Client Browser                     |
|                 (Next.js 16 + React 19 UI)                |
+-----------------------------------------------------------+
         |                                         ^
         | HTTP / JSON (Bearer JWT)                |
         v                                         |
+-----------------------------------------------------------+
|                   Spring Boot Core Backend                |
|           (Port 8080 - Security, JPA, RateLimit)          |
+-----------------------------------------------------------+
    |                 |                         |
    | JPA / JDBC      | Jedis / Redis Template  | HTTP (Internal Token)
    v                 v                         v
+--------------+ +---------------+ +-------------------------+
|  PostgreSQL  | | Redis Cache / | | Python AI Microservice  |
|  (pgvector)  | | Rate Limiter  | | (Port 8000 - FastAPI)   |
+--------------+ +---------------+ +-------------------------+
                                                |
                                                | External API (HTTPS)
                                                v
                                   +-------------------------+
                                   | Groq LLM Cloud API      |
                                   | (Llama 3.3 / GPT-OSS)   |
                                   +-------------------------+
`

## 3. Communication Patterns
- **Synchronous REST**: Frontend talks to Spring Boot via standard HTTP REST with Bearer JWT tokens.
- **Internal Service-to-Service**: Spring Boot communicates with Python FastAPI using internal authorization headers (AI_SERVICE_INTERNAL_TOKEN).
- **Database & Cache**: Spring Boot holds connection pools to PostgreSQL (HikariCP) and Redis.
