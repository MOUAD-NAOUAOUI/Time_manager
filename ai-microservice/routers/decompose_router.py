from fastapi import APIRouter
from core.models import DecomposeRequest, DecomposeResponse, SubTaskItem
from core.config import GROQ_API_KEY, GROQ_MODEL

router = APIRouter(prefix="/tasks", tags=["Decompose"])

@router.post("/decompose", response_model=DecomposeResponse)
def decompose_goal(request: DecomposeRequest):
    """Decomposes high-level goals into 3-6 sequential subtasks using Groq LLM."""
    max_minutes = (request.target_hours or 4) * 60
    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser

            llm = ChatGroq(groq_api_key=GROQ_API_KEY, model_name=GROQ_MODEL, temperature=0.5)
            prompt = ChatPromptTemplate.from_messages([
                ("system",
                 "You are an expert AI task planner. Break down the user's goal into 3 to 6 sequential, actionable subtasks.\n"
                 "Total combined duration MUST NOT exceed {max_minutes} minutes.\n"
                 "Return strict JSON with:\n"
                 "- 'ai_guidance': A 1-2 sentence strategy overview.\n"
                 "- 'tasks': list of objects with 'title', 'estimated_minutes' (int, 20-60 min each), 'priority' ('high'/'medium'/'low'), 'color' (hex like '#A0785A', '#2563EB', '#16A34A', '#D97706').\n"
                 "Return ONLY valid JSON without markdown."),
                ("human", "Goal: {goal}\nTime available: {hours} hours ({max_minutes} minutes).")
            ])
            chain = prompt | llm | JsonOutputParser()
            result = chain.invoke({
                "goal": request.goal,
                "hours": request.target_hours or 4,
                "max_minutes": max_minutes
            })

            subtasks = [
                SubTaskItem(
                    title=t.get("title", "Subtask"),
                    estimated_minutes=int(t.get("estimated_minutes", 30)),
                    priority=t.get("priority", "medium"),
                    color=t.get("color", "#A0785A")
                )
                for t in result.get("tasks", [])
            ]
            total_mins = sum(t.estimated_minutes for t in subtasks)
            return DecomposeResponse(
                user_email=request.user_email,
                original_goal=request.goal,
                total_estimated_minutes=total_mins,
                tasks=subtasks,
                ai_guidance=result.get("ai_guidance", "Execute tasks sequentially for peak focus.")
            )
        except Exception as e:
            print(f"[AI Service Warning] Groq decomposition failed: {e}")

    fallback_tasks = [
        SubTaskItem(title=f"Research & Planning: {request.goal[:30]}", estimated_minutes=45, priority="high", color="#A0785A"),
        SubTaskItem(title=f"Core Execution: {request.goal[:30]}", estimated_minutes=90, priority="high", color="#2563EB"),
        SubTaskItem(title=f"Review & Polish: {request.goal[:30]}", estimated_minutes=45, priority="medium", color="#16A34A")
    ]
    return DecomposeResponse(
        user_email=request.user_email,
        original_goal=request.goal,
        total_estimated_minutes=180,
        tasks=fallback_tasks,
        ai_guidance="Standard 3-phase execution framework (Plan -> Execute -> Review)."
    )
