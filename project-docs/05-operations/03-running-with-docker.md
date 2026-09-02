# Running with Docker Compose

## 1. Starting Infrastructure Services
```bash
docker-compose up -d
```
This spins up:
1. `postgres` (with `pgvector` extension and initial DDL schema)
2. `redis` (in-memory rate limiter cache)
3. `ai-microservice` (FastAPI on port 8000)

## 2. Starting Applications Separately
```bash
# Terminal 1: Core Backend
cd core-backend
mvn spring-boot:run

# Terminal 2: Frontend
cd frontend
npm run dev
```
