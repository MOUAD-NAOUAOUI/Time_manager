# Monitoring & Observability

## 1. Application Logs
- **Java Core Backend**: SLF4J / Logback with structured log formatting.
- **Python AI Microservice**: Python `logging` module outputting request timing and Groq API token metrics.
- **Frontend**: Next.js console logs and error boundaries.

## 2. Health Check Endpoints
- Spring Boot: `GET /actuator/health` (if enabled in pom.xml)
- Python FastAPI: `GET /docs` or `GET /api/v1/health`
