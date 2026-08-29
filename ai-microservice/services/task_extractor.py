import json
import os
from typing import List
from groq import Groq
from core.config import GROQ_API_KEY, GROQ_MODEL, STANDARD_WORK_WEEK_MINUTES
from core.models import (
    ChatProcessRequest,
    ChatProcessResponse,
    ChatProposal,
    ExtractedTaskItem,
    ScheduleImpact,
    PriorityReasoning
)

RECURRENCE_MULTIPLIERS = {
    "daily": 7,
    "weekdays": 5,
    "weekends": 2,
    "weekly": 1,
    "none": 1,
}

SYSTEM_PROMPT = """You are an advanced AI Task and Schedule Extraction Assistant.
Your job is to analyze the user's natural language request and extract structured tasks, understand schedules, and calculate workload.

CRITICAL EXTRACTION RULES:
1. Title Extraction:
   - Extract ONLY the core action / activity (1-4 words).
   - Examples: "Running" (or "Go Running"), "Study Quantum Mechanics", "Prepare Financial Report", "Gym Workout".
   - STRICTLY FORBIDDEN: NEVER copy the user's conversational prompt (e.g., do NOT output "I want you to add a running task...").

2. Accurate Duration Parsing:
   - Calculate the exact duration in integer minutes from the natural language description.
   - "one hour" / "an hour" -> 60
   - "2 hours" -> 120
   - "half an hour" / "30 mins" -> 30
   - "45 minutes" -> 45
   - "1.5 hours" -> 90
   - If no duration is mentioned at all, default to 30.

3. Recurrence & Frequency Parsing:
   - Detect expressions of repetition:
     * "all the days of the week" / "every day" / "daily" -> recurrence: "daily"
     * "weekdays" / "monday to friday" -> recurrence: "weekdays"
     * "weekends" / "saturday and sunday" -> recurrence: "weekends"
     * "weekly" / "once a week" -> recurrence: "weekly"
     * One-time events -> recurrence: "none"

4. Conversational Filtering:
   - If the user is just saying hello, asking a question, or chatting with no task to create, set "is_conversational": true, "tasks": [], and provide a helpful "ai_reply".

5. JSON Schema Output:
   Return ONLY a valid JSON object matching this schema:
   {
     "is_conversational": false,
     "ai_reply": "1-2 sentence professional confirmation of the task and schedule created",
     "tasks": [
       {
         "title": "Clean Task Title",
         "durationMinutes": 60,
         "recurrence": "daily" | "weekdays" | "weekends" | "weekly" | "none",
         "priority": "high" | "medium" | "low",
         "color": "#A0785A" | "#2563EB" | "#16A34A" | "#D97706",
         "priority_reason": "Clear explanation of why this priority and duration were chosen."
       }
     ],
     "priority_ranking": [
       {
         "rank": 1,
         "title": "Clean Task Title",
         "reason": "Why this task is ordered here"
       }
     ],
     "impact_summary": "1 sentence describing the weekly workload impact"
   }
"""

def process_chat_and_extract_tasks(request: ChatProcessRequest) -> ChatProcessResponse:
    existing_count = len(request.existing_tasks or [])
    existing_minutes = sum(t.estimated_minutes or 30 for t in (request.existing_tasks or []))

    if not GROQ_API_KEY:
        return ChatProcessResponse(
            user_email=request.user_email,
            message=request.message,
            ai_reply="Groq API key is not configured. Please set GROQ_API_KEY in your environment.",
            proposal=None
        )

    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        history_context = "\n".join(
            f"{item.role.upper()}: {item.content}" for item in (request.history or [])[-6:]
        ) or "None"

        user_content = f"""Conversation History:
{history_context}

Existing Tasks: {existing_count} tasks ({existing_minutes / 60.0:.1f} hours currently planned).

User Request:
"{request.message}"
"""

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )

        raw_json = response.choices[0].message.content.strip()
        data = json.loads(raw_json)

        if data.get("is_conversational", False) or not data.get("tasks"):
            return ChatProcessResponse(
                user_email=request.user_email,
                message=request.message,
                ai_reply=data.get("ai_reply", "Hello! Tell me what tasks you want to add, and I'll schedule them for you."),
                proposal=None
            )

        extracted_tasks: List[ExtractedTaskItem] = []
        for t in data.get("tasks", []):
            duration = int(t.get("durationMinutes", t.get("estimated_minutes", 30)))
            rec = t.get("recurrence", "none").lower()
            if rec not in RECURRENCE_MULTIPLIERS:
                rec = "none"

            extracted_tasks.append(
                ExtractedTaskItem(
                    title=str(t.get("title", "New Task")).strip(),
                    estimated_minutes=duration,
                    durationMinutes=duration,
                    recurrence=rec,
                    priority=str(t.get("priority", "medium")).lower(),
                    color=str(t.get("color", "#A0785A")),
                    priority_reason=str(t.get("priority_reason", "Extracted from your request."))
                )
            )

        # Compute accurate weekly impact taking recurrence into account
        added_minutes = sum(
            task.estimated_minutes * RECURRENCE_MULTIPLIERS.get(task.recurrence, 1)
            for task in extracted_tasks
        )
        new_total_minutes = existing_minutes + added_minutes
        weekly_cap = min(100.0, round((new_total_minutes / STANDARD_WORK_WEEK_MINUTES) * 100, 1))

        rankings: List[PriorityReasoning] = []
        for r in data.get("priority_ranking", []):
            rankings.append(
                PriorityReasoning(
                    rank=int(r.get("rank", 1)),
                    title=str(r.get("title", "")),
                    reason=str(r.get("reason", ""))
                )
            )
        if not rankings:
            for i, task in enumerate(extracted_tasks, start=1):
                rankings.append(
                    PriorityReasoning(
                        rank=i,
                        title=task.title,
                        reason=task.priority_reason
                    )
                )

        impact_summary = data.get("impact_summary")
        if not impact_summary:
            impact_summary = f"Adding {len(extracted_tasks)} task(s) adds {added_minutes}m to your weekly workload ({new_total_minutes / 60.0:.1f}h total)."

        impact = ScheduleImpact(
            existing_task_count=existing_count,
            existing_total_minutes=existing_minutes,
            added_minutes=added_minutes,
            new_total_minutes=new_total_minutes,
            weekly_capacity_percent=weekly_cap,
            overload_warning=new_total_minutes > STANDARD_WORK_WEEK_MINUTES,
            collision_warning=False,
            summary=impact_summary
        )

        proposal = ChatProposal(
            extracted_tasks=extracted_tasks,
            impact_analysis=impact,
            priority_ranking=rankings
        )

        return ChatProcessResponse(
            user_email=request.user_email,
            message=request.message,
            ai_reply=data.get("ai_reply", "I have prepared your task proposal. Review and confirm to save."),
            proposal=proposal
        )

    except Exception as e:
        print(f"[AI Service Error] Groq task extraction failed: {e}")
        return ChatProcessResponse(
            user_email=request.user_email,
            message=request.message,
            ai_reply=f"AI parsing encountered an issue: {str(e)}. Please check your request.",
            proposal=None
        )
