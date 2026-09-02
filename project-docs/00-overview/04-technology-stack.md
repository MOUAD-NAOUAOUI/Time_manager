# Technology Stack

## 1. Frontend Web Layer
- **Framework**: Next.js 16.3.1 (React 19.2.8, App Router, Turbopack).
- **Styling**: Tailwind CSS v4 with custom warm minimalist palette (#FAFAF8 background, #A0785A accent brown, #E8E2D9 borders, #16A34A success green, #DC2626 danger red).
- **Icons**: Lucide React v1.31.0.
- **Charts & Data Visualizations**: Recharts v3.10.1.
- **Language**: TypeScript 5 with strict type safety.

## 2. Java Core Backend Layer
- **Framework**: Spring Boot 3.2.3.
- **Language**: Java 17 / 21.
- **Security**: Spring Security 6 with stateless JWT (io.jsonwebtoken:jjwt-api:0.11.5) and BCrypt password encryption.
- **Data Access**: Spring Data JPA / Hibernate ORM with PostgreSQL dialect.
- **Caching & Rate Limiting**: Spring Data Redis (Jedis/Lettuce client).
- **Code Quality & Auditing**: PMD source analysis, OWASP dependency vulnerability check.

## 3. Python AI Microservice Layer
- **Framework**: FastAPI 0.109.2 with Uvicorn 0.27.1 ASGI server.
- **Data Validation**: Pydantic v2.6.1.
- **LLM Provider**: Groq SDK (groq==0.9.0) targeting llama-3.3-70b-versatile and openai/gpt-oss-120b.
- **HTTP Client**: HTTPX 0.27.2 for async remote calls.
- **Testing**: Pytest with mock LLM fixtures.

## 4. Database & Storage Layer
- **Primary Database**: PostgreSQL 16 with pgvector extension.
- **In-Memory Store**: Redis 7 Alpine.
- **Vector Dimensions**: 1536-dimensional float vectors for semantic search and memory clustering.

## 5. DevOps & Tooling
- **Containerization**: Docker & Docker Compose.
- **Automation Scripts**: PowerShell (start-dev.ps1) for simultaneous local startup.
