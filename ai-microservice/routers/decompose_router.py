import json
from fastapi import APIRouter
from groq import Groq
from core.models import DecomposeRequest, DecomposeResponse, SubTaskItem
from core.config import GROQ_API_KEY, GROQ_MODEL

router = APIRouter(prefix="/tasks", tags=["Decompose"])

@router.post("/decompose", response_model=DecomposeResponse)
def decompose_goal(request: DecomposeRequest):
    """Decomposes high-level goals into 3-6 sequential subtasks using Groq LLM."""
    max_minutes = (request.target_hours or 4) * 60
    if GROQ_API_KEY:
        try:
            client = Groq(api_key=GROQ_API_KEY)
            system_prompt = f"""You are an expert AI task planner. Break down the user's goal into 3 to 6 sequential, actionable subtasks.
Total combined duration MUST NOT exceed {max_minutes} minutes.
Return strict JSON matching this schema:
{{
  "ai_guidance": "A 1-2 sentence strategy overview.",
  "tasks": [
    {{
      "title": "Clean concise task name",
      "estimated_minutes": 45,
      "priority": "high" | "medium" | "low",
      "color": "#A0785A" | "#2563EB" | "#16A34A" | "#D97706"
    }}
  ]
}}
Return ONLY valid JSON without markdown formatting.
"""
            user_content = f"Goal: {request.goal}\nTime available: {request.target_hours or 4} hours ({max_minutes} minutes)."

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.3,
                max_tokens=800,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content.strip())
            subtasks = [
                SubTaskItem(
                    title=str(t.get("title", "Subtask")),
                    estimated_minutes=int(t.get("estimated_minutes", 30)),
                    priority=str(t.get("priority", "medium")),
                    color=str(t.get("color", "#A0785A"))
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
            print(f"[AI Service Warning] Groq decomposition error: {e}")

    # Fallback if Groq unavailable
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
