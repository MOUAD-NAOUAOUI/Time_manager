# Production Deployment Overview

## 1. Production Architecture
- **Frontend**: Deployed to Vercel or AWS CloudFront/S3 as Next.js standalone container.
- **Java Backend**: Containerized with multi-stage Dockerfile and deployed to AWS ECS / Google Cloud Run / Render.
- **Python AI Microservice**: Containerized FastAPI deployed alongside backend with internal service mesh routing.
- **Database**: Managed PostgreSQL (AWS RDS / Supabase / Neon) with `vector` extension enabled.
- **Redis**: Managed Redis (AWS ElastiCache / Upstash).
