import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import GROQ_API_KEY, GROQ_MODEL, PORT
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

# CORS Policy for Local Development & Internal Routing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular Routers
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
        "version": "3.5.0",
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
        "version": "3.5.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)