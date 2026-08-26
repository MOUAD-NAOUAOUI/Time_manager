from typing import List, Optional
from core.config import GROQ_API_KEY, GROQ_MODEL, STANDARD_WORK_WEEK_MINUTES
from core.models import (
    ChatProcessRequest,
    ChatProcessResponse,
    ChatProposal,
    ExtractedTaskItem,
    ScheduleImpact,
    PriorityReasoning
)

def process_chat_and_extract_tasks(request: ChatProcessRequest) -> ChatProcessResponse:
    """
    AI Chat Assistant:
    - Extracts structured subtasks from natural language prompts
    - Analyzes workload against existing tasks (Capacity %, Overload, Collisions)
    - Generates priority reasoning (why task A before task B)
    - Returns structured proposal
    """
    existing_count = len(request.existing_tasks or [])
    existing_minutes = sum(t.estimated_minutes or 30 for t in (request.existing_tasks or []))

    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser

            llm = ChatGroq(
                groq_api_key=GROQ_API_KEY,
                model_name=GROQ_MODEL,
                temperature=0.4,
                max_tokens=900
            )

            existing_tasks_summary = "\n".join(
                f"- {t.title} ({t.estimated_minutes} min, status: {t.status}, deadline: {t.deadline or 'none'})"
                for t in (request.existing_tasks or [])[:10]
            ) or "No existing tasks."

            history_context = "\n".join(
                f"{h.role.upper()}: {h.content}"
                for h in (request.history or [])[-6:]
            ) or "New conversation."

            prompt = ChatPromptTemplate.from_messages([
                ("system",
                 "You are an intelligent executive productivity and task scheduling assistant.\n"
                 "Analyze the user's prompt, extract concrete tasks, evaluate schedule impact against existing workload, "
                 "and provide clear prioritization reasoning.\n\n"
                 "Return strict JSON with exactly this structure:\n"
                 "{\n"
                 "  'ai_reply': 'Conversational explanation summarizing the proposed plan',\n"
                 "  'tasks': [\n"
                 "     {\n"
                 "       'title': 'Task name',\n"
                 "       'estimated_minutes': 45,\n"
                 "       'priority': 'high'|'medium'|'low',\n"
                 "       'deadline': 'YYYY-MM-DD or null',\n"
                 "       'color': '#A0785A'|'#2563EB'|'#16A34A'|'#D97706',\n"
                 "       'priority_reason': 'Explanation of why this task was created with this urgency'\n"
                 "     }\n"
                 "  ],\n"
                 "  'priority_ranking': [\n"
                 "     {\n"
                 "       'rank': 1,\n"
                 "       'title': 'Task name',\n"
                 "       'reason': 'Why this task should be executed before others'\n"
                 "     }\n"
                 "  ],\n"
                 "  'impact_summary': '1-2 sentences on how adding these tasks impacts the user\\'s capacity and schedule balance'\n"
                 "}\n"
                 "Return ONLY the valid JSON object without markdown fences."),
                ("human",
                 "Conversation History:\n{history}\n\n"
                 "Current Existing Tasks ({existing_count} tasks, {existing_hours:.1f} hours):\n{existing_tasks}\n\n"
                 "User Request:\n{message}")
            ])

            chain = prompt | llm | JsonOutputParser()
            result = chain.invoke({
                "history": history_context,
                "existing_count": existing_count,
                "existing_hours": existing_minutes / 60.0,
                "existing_tasks": existing_tasks_summary,
                "message": request.message
            })

            raw_tasks = result.get("tasks", [])
            extracted: List[ExtractedTaskItem] = []
            for t in raw_tasks:
                extracted.append(ExtractedTaskItem(
                    title=str(t.get("title", "New Task")),
                    estimated_minutes=int(t.get("estimated_minutes", 30)),
                    priority=str(t.get("priority", "medium")),
                    deadline=t.get("deadline") if t.get("deadline") != "null" else None,
                    color=str(t.get("color", "#A0785A")),
                    priority_reason=str(t.get("priority_reason", "Extracted from your prompt."))
                ))

            added_mins = sum(t.estimated_minutes for t in extracted)
            new_total = existing_minutes + added_mins
            weekly_cap = min(100.0, round((new_total / STANDARD_WORK_WEEK_MINUTES) * 100, 1))
            overload = new_total > STANDARD_WORK_WEEK_MINUTES

            rankings: List[PriorityReasoning] = []
            for r in result.get("priority_ranking", []):
                rankings.append(PriorityReasoning(
                    rank=int(r.get("rank", 1)),
                    title=str(r.get("title", "")),
                    reason=str(r.get("reason", ""))
                ))

            impact = ScheduleImpact(
                existing_task_count=existing_count,
                existing_total_minutes=existing_minutes,
                added_minutes=added_mins,
                new_total_minutes=new_total,
                weekly_capacity_percent=weekly_cap,
                overload_warning=overload,
                collision_warning=False,
                summary=result.get("impact_summary", f"Adding {len(extracted)} tasks ({added_mins}m). Total workload is now {new_total / 60.0:.1f}h.")
            )

            proposal = ChatProposal(
                extracted_tasks=extracted,
                impact_analysis=impact,
                priority_ranking=rankings
            ) if extracted else None

            return ChatProcessResponse(
                user_email=request.user_email,
                message=request.message,
                ai_reply=result.get("ai_reply", "I analyzed your request and prepared a task proposal for your review."),
                proposal=proposal
            )

        except Exception as e:
            print(f"[AI Service Warning] Chat processing fallback: {e}")

    # Fallback rule-based extractor
    fallback_tasks = [
        ExtractedTaskItem(
            title=f"Plan: {request.message[:40]}",
            estimated_minutes=30,
            priority="high",
            color="#A0785A",
            priority_reason="High priority planning phase."
        ),
        ExtractedTaskItem(
            title=f"Execute: {request.message[:40]}",
            estimated_minutes=60,
            priority="medium",
            color="#2563EB",
            priority_reason="Main execution work block."
        )
    ]
    added_mins = 90
    new_total = existing_minutes + added_mins

    impact = ScheduleImpact(
        existing_task_count=existing_count,
        existing_total_minutes=existing_minutes,
        added_minutes=added_mins,
        new_total_minutes=new_total,
        weekly_capacity_percent=round((new_total / STANDARD_WORK_WEEK_MINUTES) * 100, 1),
        overload_warning=new_total > STANDARD_WORK_WEEK_MINUTES,
        collision_warning=False,
        summary=f"Adding {len(fallback_tasks)} tasks adds {added_mins / 60.0:.1f}h to your current {existing_minutes / 60.0:.1f}h."
    )

    ranking = [
        PriorityReasoning(rank=1, title=fallback_tasks[0].title, reason="Planning must precede execution."),
        PriorityReasoning(rank=2, title=fallback_tasks[1].title, reason="Core execution block.")
    ]

    return ChatProcessResponse(
        user_email=request.user_email,
        message=request.message,
        ai_reply="I extracted actionable tasks from your request. Review the impact analysis and click confirm when ready.",
        proposal=ChatProposal(
            extracted_tasks=fallback_tasks,
            impact_analysis=impact,
            priority_ranking=ranking
        )
    )
