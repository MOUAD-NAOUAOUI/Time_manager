# Project Summary

## 1. Executive Summary
**TimeSpace (Intelligent Time Manager)** is an AI-augmented time tracking, task scheduling, and productivity analytics platform. Built as a distributed polyglot system, it combines a high-performance **Java Spring Boot core backend**, a specialized **Python FastAPI AI microservice**, and a responsive **Next.js 16 (React 19) frontend** with Tailwind CSS v4.

## 2. Core Problem Solved
Traditional time trackers are passive stopwatches; traditional calendars are static and disconnect from actual execution. TimeSpace bridges this gap by:
- Actively tracking live execution against planned estimates.
- Intercepting overtime events with flexible add-time or finish workflows.
- Visualizing scheduled and completed work on an interactive 24/7 weekly hour matrix.
- Leveraging large language models (LLMs) to diagnose productivity bottlenecks, suggest schedule optimizations, and generate actionable coaching insights.

## 3. Key Components
| Component | Directory | Primary Tech | Role |
| :--- | :--- | :--- | :--- |
| **Frontend** | rontend/ | Next.js 16.3, React 19, Tailwind CSS v4, Lucide, Recharts | User dashboard, task lists, live session timer, schedule grids, and analytics charts |
| **Core Backend** | core-backend/ | Spring Boot 3.2, Java 17/21, Spring Data JPA, Spring Security | Primary API, authentication, RBAC, session lifecycle, audit logging, rate limiting |
| **AI Microservice** | i-microservice/ | Python 3.11, FastAPI, Groq SDK (Llama-3.3-70b / GPT-OSS-120B) | Natural language decomposition, constraint scheduling, coaching advice, vector embeddings |
| **Database & Cache** | database/ | PostgreSQL 16 + pgvector, Redis 7 | Relational persistence, vector embeddings for memory, distributed token bucket rate limiting |

## 4. Key Target Personas
- **Knowledge Workers & Students**: Needing realistic time accounting and proactive coaching.
- **Freelancers & Engineers**: Seeking structured focus blocks without manual calendar overhead.
