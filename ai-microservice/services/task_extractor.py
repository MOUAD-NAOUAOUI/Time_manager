from typing import List, Optional
import re
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
                temperature=0.3,
                max_tokens=1200
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
                 "You are an intelligent executive productivity assistant.\n"
                 "Your job is to understand the user's request and extract concrete, well-named tasks.\n\n"
                 "CRITICAL RULES:\n"
                 "- Create clean, professional task titles (e.g. 'Study Physics', 'Prepare Exam Notes', 'Code Feature X')\n"
                 "- NEVER prefix tasks with 'Plan:', 'Execute:', 'Task:' etc.\n"
                 "- NEVER copy the user's raw sentence as the task title\n"
                 "- Infer a realistic duration from context (e.g. '30 minutes each day' = one recurring task of 30 min)\n"
                 "- If the message is conversational (e.g. 'hello', 'how are you'), return an empty tasks array and a helpful ai_reply\n\n"
                 "Return strict JSON with exactly this structure:\n"
                 "{\n"
                 "  'ai_reply': 'Short professional explanation of the proposed plan',\n"
                 "  'tasks': [\n"
                 "     {\n"
                 "       'title': 'Clean task name',\n"
                 "       'estimated_minutes': 45,\n"
                 "       'priority': 'high'|'medium'|'low',\n"
                 "       'deadline': 'YYYY-MM-DD or null',\n"
                 "       'color': '#A0785A'|'#2563EB'|'#16A34A'|'#D97706',\n"
                 "       'priority_reason': 'Brief reason for the priority level'\n"
                 "     }\n"
                 "  ],\n"
                 "  'priority_ranking': [\n"
                 "     {\n"
                 "       'rank': 1,\n"
                 "       'title': 'Task name',\n"
                 "       'reason': 'Why this task comes first'\n"
                 "     }\n"
                 "  ],\n"
                 "  'impact_summary': '1 sentence on schedule impact'\n"
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
                    deadline=t.get("deadline") if t.get("deadline") not in ("null", None, "") else None,
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
                summary=result.get("impact_summary", f"Adding {len(extracted)} tasks ({added_mins}m). Total workload: {new_total / 60.0:.1f}h.")
            )

            proposal = ChatProposal(
                extracted_tasks=extracted,
                impact_analysis=impact,
                priority_ranking=rankings
            ) if extracted else None

            return ChatProcessResponse(
                user_email=request.user_email,
                message=request.message,
                ai_reply=result.get("ai_reply", "Task plan prepared. Review the proposal and confirm when ready."),
                proposal=proposal
            )

        except Exception as e:
            print(f"[AI Service Warning] Chat processing fallback: {e}")

    # Fallback: parse duration and topic from the message intelligently
    return _rule_based_fallback(request, existing_count, existing_minutes)


def _rule_based_fallback(request: ChatProcessRequest, existing_count: int, existing_minutes: int) -> ChatProcessResponse:
    """
    Intelligent rule-based fallback when Groq is unavailable.
    Handles both digit durations (30 minutes) and word durations (one hour).
    """
    message = request.message.strip()

    # Word-to-number map
    WORD_NUMBERS = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40,
        "forty-five": 45, "sixty": 60, "ninety": 90
    }

    # Check if conversational
    conversational_phrases = ["hello", "hi", "hey", "how are you", "what can you do", "help me", "help"]
    if any(message.lower().startswith(p) for p in conversational_phrases):
        return ChatProcessResponse(
            user_email=request.user_email,
            message=message,
            ai_reply="Hello! Tell me what tasks you need to schedule and I will build a structured plan for you.",
            proposal=None
        )

    # Normalize: replace word numbers with digits
    normalized = message.lower()
    for word, num in sorted(WORD_NUMBERS.items(), key=lambda x: -len(x[0])):
        normalized = re.sub(rf'\b{word}\b', str(num), normalized)

    # Extract duration from normalized message
    duration_match = re.search(r'(\d+)\s*(minute|min|hour|hr)s?', normalized, re.IGNORECASE)
    if duration_match:
        amount = int(duration_match.group(1))
        unit = duration_match.group(2).lower()
        estimated_minutes = amount if 'min' in unit else amount * 60
        # Remove the full duration phrase from the original message for title extraction
        # e.g. "one hour" or "30 minutes"
        duration_phrase_match = re.search(
            r'\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty|ninety|\d+)\s*(minute|min|hour|hr)s?\b',
            message, re.IGNORECASE
        )
        clean_message = re.sub(duration_phrase_match.group(0), '', message, flags=re.IGNORECASE) if duration_phrase_match else message
    else:
        estimated_minutes = 45
        clean_message = message

    # Strip filler words and time context
    filler = (
        r'\b(i want to|i need to|i have to|i should|i will|please|help me|remind me|'
        r'every day|each day|daily|per day|a day|tomorrow|today|this week|next week|'
        r'in the morning|at night|in|on|at|of|to|do|my|some|a|an|the|for|'
        r'starting|begin|start|going to|plan to)\b'
    )
    subject = re.sub(filler, ' ', clean_message, flags=re.IGNORECASE)
    subject = re.sub(r'\s+', ' ', subject).strip().strip('.,!?')

    # Title case the subject
    task_title = subject.title() if subject else "Scheduled Task"

    subjects = [part.strip() for part in re.split(r"\band\b|,|;", subject) if part.strip()]
    fallback_tasks = [ExtractedTaskItem(
        title=part.title(),
        estimated_minutes=estimated_minutes,
        priority="medium",
        color="#A0785A",
        priority_reason="Scheduled based on your request."
    ) for part in (subjects or [task_title])]

    added_mins = estimated_minutes
    new_total = existing_minutes + added_mins

    impact = ScheduleImpact(
        existing_task_count=existing_count,
        existing_total_minutes=existing_minutes,
        added_minutes=added_mins,
        new_total_minutes=new_total,
        weekly_capacity_percent=round((new_total / STANDARD_WORK_WEEK_MINUTES) * 100, 1),
        overload_warning=new_total > STANDARD_WORK_WEEK_MINUTES,
        collision_warning=False,
        summary=f"Adding {len(fallback_tasks)} tasks adds {added_mins}m to your current {existing_minutes / 60.0:.1f}h."
    )

    ranking = [
        PriorityReasoning(rank=index, title=task.title, reason="Scheduled based on your stated priority.")
        for index, task in enumerate(fallback_tasks, start=1)
    ]

    return ChatProcessResponse(
        user_email=request.user_email,
        message=message,
        ai_reply=f"Prepared {len(fallback_tasks)} tasks ({added_mins} min total). Review the plan and confirm when ready.",
        proposal=ChatProposal(
            extracted_tasks=fallback_tasks,
            impact_analysis=impact,
            priority_ranking=ranking
        )
    )
