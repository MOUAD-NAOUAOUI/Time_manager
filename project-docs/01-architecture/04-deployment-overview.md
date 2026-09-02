# Deployment Overview

## 1. Deployment Topology
TimeSpace is container-ready and supports two primary deployment topologies:
1. **Local Development Topology**: Managed via Docker Compose (docker-compose.yml) for databases and services, or hybrid local processes via PowerShell script start-dev.ps1.
2. **Production Cloud Topology**: Containerized containers deployed to Kubernetes, AWS ECS, or Render/Railway/Fly.io.

## 2. Docker Compose Topology
The repository includes a multi-container specification (docker-compose.yml):
- intelligent_time_postgres: Runs nkane/pgvector:latest with initial schema mounted from ./core-backend/src/main/resources/schema.sql.
- intelligent_time_redis: Runs 
edis:alpine exposed on port 6379.
- intelligent_time_ai: Builds from ./ai-microservice/Dockerfile and exposes port 8000.

## 3. Environment Variables Strategy
Production deployments must inject secure values for:
- JWT_SECRET (256-bit cryptographically secure secret)
- GROQ_API_KEY (Production Groq API Key)
- POSTGRES_PASSWORD and DB_PASSWORD
- CORS_ALLOWED_ORIGINS
