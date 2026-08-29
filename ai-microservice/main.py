import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import GROQ_API_KEY, GROQ_MODEL, PORT
import os
from routers import (
    schedule_router,
    coach_router,
    chat_router,
    decompose_router,
    embeddings_router,
    analytics_router
)

# ---------------------------------------------------------------------------
# FastAPI Application Factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Intelligent Time Manager - AI Microservice",
    description="Enterprise Multi-Engine AI Microservice for Constraint Scheduling, Coaching, NLP Task Extraction, Embeddings & Productivity Analytics.",
    version="3.6.0"
)

# ---------------------------------------------------------------------------
# CORS Middleware — must be registered before any other middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Internal Token Authentication Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def require_internal_token(request: Request, call_next):
    public_paths = {"/", "/health", "/docs", "/openapi.json", "/redoc"}
    if request.url.path not in public_paths:
        expected = os.getenv("AI_SERVICE_INTERNAL_TOKEN", "dev-internal-token")
        if request.headers.get("X-Internal-Token") != expected:
            return JSONResponse(
                status_code=401,
                content={"detail": "Internal service authentication required"}
            )
    return await call_next(request)

# ---------------------------------------------------------------------------
# Mount Modular Routers
# ---------------------------------------------------------------------------
app.include_router(schedule_router.router)
app.include_router(coach_router.router)
app.include_router(chat_router.router)
app.include_router(decompose_router.router)
app.include_router(embeddings_router.router)
app.include_router(analytics_router.router)

# ---------------------------------------------------------------------------
# Health & Status Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-microservice",
        "version": "3.6.0",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
        "scheduling_engine": "constraint-based-v2",
        "embeddings_engine": "active",
        "chat_assistant": "active"
    }

@app.get("/")
def root():
    return {
        "message": "Intelligent Time Manager AI Microservice is operational.",
        "docs_url": "/docs",
        "version": "3.6.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)