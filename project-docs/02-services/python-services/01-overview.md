# Python AI Microservice Overview

## 1. Responsibilities
The Python AI Microservice (`ai-microservice/`) provides intelligence, optimization, and natural language understanding capabilities. Built on FastAPI and Uvicorn, its responsibilities include:
- **Productivity Diagnostics & Coaching**: Analyzing focus patterns, task completion velocities, and fatigue indicators using Groq LLM inference.
- **Constraint-Based Scheduling**: Solving time allocation constraints based on task duration, user energy curves, and deadlines.
- **Goal & Task Decomposition**: Breaking high-level objectives into granular actionable subtasks with time estimates.
- **Semantic Vector Embeddings**: Generating embeddings for semantic task clustering and long-term user memory.
- **Natural Language Chat**: Conversational interface for interactive task planning and schedule queries.

## 2. Technology Stack
- **Framework**: FastAPI 0.109.2, Uvicorn 0.27.1
- **LLM Provider**: Groq Cloud SDK (`groq==0.9.0`), targeting models `llama-3.3-70b-versatile` and `openai/gpt-oss-120b`.
- **Validation**: Pydantic v2.
