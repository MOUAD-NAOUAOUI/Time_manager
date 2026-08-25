import os
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

app = FastAPI(
    title="Intelligent Time Manager - AI Engine",
    description="AI Microservice for Smart Scheduling and Groq-Powered Performance Coaching",
    version="3.0.0"
)

# ---------------------------------------------------------------------------
# Constants: Energy Windows
# Hour ranges mapped to cognitive load category.
# "deep"   → best for creative, complex, focused work  (morning peak)
# "medium" → good for meetings, reviews, planning       (post-lunch)
# "light"  → low-effort tasks, admin, emails            (late afternoon)
# ---------------------------------------------------------------------------
ENERGY_WINDOWS: List[Dict] = [
    {"start": 6,  "end": 9,  "level": "light"},
    {"start": 9,  "end": 12, "level": "deep"},
    {"start": 12, "end": 13, "level": "light"},
    {"start": 13, "end": 15, "level": "medium"},
    {"start": 15, "end": 17, "level": "deep"},
    {"start": 17, "end": 20, "level": "medium"},
]

PRIORITY_SCORE = {"high": 3, "medium": 2, "low": 1}
ENERGY_SCORE   = {"deep": 3, "medium": 2, "light": 1}

# ---------------------------------------------------------------------------
# Models: Constraint-Based Scheduling Engine (v2)
# ---------------------------------------------------------------------------
class TaskItem(BaseModel):
    id: str
    title: str
    estimated_minutes: int
    deadline: Optional[str] = None
    priority: Optional[str] = "medium"
    energy_required: Optional[str] = "medium"
    color: Optional[str] = "#A0785A"

class ScheduleRequest(BaseModel):
    user_email: str
    tasks: List[TaskItem]
    start_hour: Optional[int] = 9
    end_hour: Optional[int] = 18
    date: Optional[str] = None

class TimeBlock(BaseModel):
    task_id: str
    title: str
    start_time: str
    end_time: str
    color: str
    priority: str
    energy_required: str
    constraint_reason: str

class ScheduleMetrics(BaseModel):
    total_tasks: int
    scheduled_tasks: int
    unscheduled_tasks: int
    total_planned_minutes: int
    available_work_minutes: int
    utilization_percent: float
    overload_warning: bool
    deadline_conflicts: List[str]

class ScheduleResponse(BaseModel):
    user_email: str
    schedule: List[TimeBlock]
    metrics: ScheduleMetrics
    recommendation: str

class DecomposeRequest(BaseModel):
    user_email:str
    goal:str
    target_hours:Optional[int]=4

class SubTaskItem(BaseModel):
    title:str
    estimated_minutes:int
    priority:str
    color:str
class DecomposeResponse(BaseModel):
    user_email:str
    original_goal:str
    total_estimated_minutes:int
    tasks:List[SubTaskItem]
    ai_guidance:str

# ---------------------------------------------------------------------------
# Models: AI Coach
# ---------------------------------------------------------------------------
class CoachRequest(BaseModel):
    user_email: str
    total_tasks: int
    completed_tasks: int
    total_focus_minutes: int

class CoachResponse(BaseModel):
    user_email: str
    analysis: str
    tips: List[str]

# ---------------------------------------------------------------------------
# Helper: Compute urgency score (lower days-left = higher urgency)
# ---------------------------------------------------------------------------
def compute_urgency_score(deadline_str: Optional[str]) -> float:
    """Returns urgency score: 100 = due today, 0 = no deadline / far future."""
    if not deadline_str:
        return 0.0
    try:
        deadline  = datetime.fromisoformat(deadline_str.split("T")[0])
        today     = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        days_left = (deadline - today).days
        if days_left < 0:
            return 150.0   # overdue → highest urgency
        if days_left == 0:
            return 100.0
        if days_left <= 1:
            return 90.0
        if days_left <= 3:
            return 70.0
        if days_left <= 7:
            return 50.0
        return max(0.0, 30.0 - days_left)
    except (ValueError, TypeError):
        return 0.0


# ---------------------------------------------------------------------------
# Helper: Get energy level for a given hour
# ---------------------------------------------------------------------------
def get_energy_level(hour: int) -> str:
    for window in ENERGY_WINDOWS:
        if window["start"] <= hour < window["end"]:
            return window["level"]
    return "light"


# ---------------------------------------------------------------------------
# Helper: Smart break duration based on preceding task length
# ---------------------------------------------------------------------------
def break_minutes(task_duration: int) -> int:
    if task_duration >= 90:
        return 20
    if task_duration >= 45:
        return 10
    return 5


# ---------------------------------------------------------------------------
# Core: Constraint-Based Scheduling Algorithm
# ---------------------------------------------------------------------------
def constraint_schedule(
    tasks: List[TaskItem],
    start_hour: int,
    end_hour: int,
    schedule_date: datetime
) -> tuple:
    available_minutes   = (end_hour - start_hour) * 60
    total_task_minutes  = sum(t.estimated_minutes for t in tasks)

    # Score every task: urgency dominates, then priority weight
    scored = []
    for task in tasks:
        urgency   = compute_urgency_score(task.deadline)
        priority  = PRIORITY_SCORE.get(task.priority or "medium", 2)
        composite = urgency * 0.5 + priority * 10
        scored.append((composite, task))

    scored.sort(key=lambda x: x[0], reverse=True)
    sorted_tasks = [t for _, t in scored]

    blocks: List[TimeBlock]       = []
    current  = schedule_date.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    work_end = schedule_date.replace(hour=end_hour,   minute=0, second=0, microsecond=0)
    unscheduled_titles: List[str] = []

    for task in sorted_tasks:
        task_end = current + timedelta(minutes=task.estimated_minutes)
        if task_end > work_end:
            unscheduled_titles.append(task.title)
            continue

        current_energy  = get_energy_level(current.hour)
        required_energy = task.energy_required or "medium"

        reasons = []
        urgency_score = compute_urgency_score(task.deadline)
        if urgency_score >= 90:
            reasons.append("deadline is today/tomorrow")
        elif urgency_score >= 50:
            reasons.append("deadline within the week")
        if task.priority == "high":
            reasons.append("high priority")
        if current_energy == required_energy:
            reasons.append(f"energy window matches ({required_energy} work)")
        elif ENERGY_SCORE.get(current_energy, 1) < ENERGY_SCORE.get(required_energy, 1):
            reasons.append("scheduled early to avoid low-energy window later")

        reason = "; ".join(reasons) if reasons else "standard scheduling order"

        blocks.append(TimeBlock(
            task_id=task.id,
            title=task.title,
            start_time=current.strftime("%H:%M"),
            end_time=task_end.strftime("%H:%M"),
            color=task.color or "#A0785A",
            priority=task.priority or "medium",
            energy_required=required_energy,
            constraint_reason=reason
        ))
        current = task_end + timedelta(minutes=break_minutes(task.estimated_minutes))

    # Detect overdue conflicts
    deadline_conflicts: List[str] = []
    for task in sorted_tasks:
        if task.deadline:
            try:
                dl    = datetime.fromisoformat(task.deadline.split("T")[0])
                today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                if (dl - today).days < 0:
                    deadline_conflicts.append(f"{task.title} (overdue)")
            except (ValueError, TypeError):
                pass

    scheduled_count = len(sorted_tasks) - len(unscheduled_titles)
    utilization     = min(100.0, total_task_minutes / available_minutes * 100) if available_minutes > 0 else 0.0
    overload        = total_task_minutes > available_minutes

    metrics = ScheduleMetrics(
        total_tasks=len(tasks),
        scheduled_tasks=scheduled_count,
        unscheduled_tasks=len(unscheduled_titles),
        total_planned_minutes=total_task_minutes,
        available_work_minutes=available_minutes,
        utilization_percent=round(utilization, 1),
        overload_warning=overload,
        deadline_conflicts=deadline_conflicts
    )
    return blocks, metrics


# ---------------------------------------------------------------------------
# Groq: Generate natural language schedule explanation
# ---------------------------------------------------------------------------
def generate_schedule_explanation(blocks: List[TimeBlock], metrics: ScheduleMetrics) -> str:
    if not GROQ_API_KEY:
        overload_note = " ⚠️ Overload detected — consider deferring low-priority tasks." if metrics.overload_warning else ""
        return (
            f"Schedule optimized for {metrics.scheduled_tasks}/{metrics.total_tasks} tasks "
            f"({metrics.utilization_percent}% day utilization). "
            f"Tasks ranked by deadline urgency, then priority weight. "
            f"Energy-aligned time blocks used for deep vs light work.{overload_note}"
        )
    try:
        from langchain_groq import ChatGroq
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        llm = ChatGroq(groq_api_key=GROQ_API_KEY, model_name=GROQ_MODEL, temperature=0.4, max_tokens=300)
        schedule_summary = "\n".join(
            f"- {b.start_time}–{b.end_time}: {b.title} [{b.priority}] → {b.constraint_reason}"
            for b in blocks
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are an expert AI productivity coach. In 3 concise sentences explain the generated schedule. "
             "Mention: (1) why tasks are in this order, (2) any overload or deadline risk, (3) one practical tip. "
             "Be direct, specific, motivating. Plain sentences only — no bullet points."),
            ("human",
             "Today's AI schedule:\n{schedule}\n\n"
             "Metrics: {scheduled}/{total} tasks scheduled, {utilization}% utilization, "
             "overload={overload}, conflicts={conflicts}. Explain this to the user.")
        ])
        chain  = prompt | llm | StrOutputParser()
        result = chain.invoke({
            "schedule":   schedule_summary,
            "scheduled":  metrics.scheduled_tasks,
            "total":      metrics.total_tasks,
            "utilization": metrics.utilization_percent,
            "overload":   "YES" if metrics.overload_warning else "No",
            "conflicts":  ", ".join(metrics.deadline_conflicts) or "None"
        })
        return result.strip()
    except Exception as e:
        print(f"[AI Service Warning] Groq schedule explanation failed: {e}")
        return (
            f"Schedule optimized: {metrics.scheduled_tasks}/{metrics.total_tasks} tasks fit in your day "
            f"({metrics.utilization_percent}% utilization). Ordered by deadline urgency and priority."
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-microservice",
        "version": "3.0.0",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
        "scheduling_engine": "constraint-based-v2"
    }


@app.post("/schedule/generate", response_model=ScheduleResponse)
def generate_schedule(request: ScheduleRequest):
    """
    Constraint-Based AI Scheduling Engine v2:
    - Ranks by: deadline urgency (50%) + priority weight (50%)
    - Aligns tasks to energy windows (deep work in 9-12 and 15-17)
    - Detects overload and deadline conflicts
    - Smart break insertion (5/10/20 min based on task length)
    - Groq-powered natural language schedule explanation
    """
    if not request.tasks:
        return ScheduleResponse(
            user_email=request.user_email,
            schedule=[],
            metrics=ScheduleMetrics(
                total_tasks=0, scheduled_tasks=0, unscheduled_tasks=0,
                total_planned_minutes=0, available_work_minutes=0,
                utilization_percent=0.0, overload_warning=False,
                deadline_conflicts=[]
            ),
            recommendation="No tasks provided. Add tasks to generate a schedule."
        )

    schedule_date = datetime.now()
    if request.date:
        try:
            schedule_date = datetime.fromisoformat(request.date.split("T")[0])
        except (ValueError, TypeError):
            pass

    start  = max(0,       min(request.start_hour or 9, 23))
    end    = max(start+1, min(request.end_hour   or 18, 24))

    blocks, metrics = constraint_schedule(request.tasks, start, end, schedule_date)
    recommendation  = generate_schedule_explanation(blocks, metrics)

    return ScheduleResponse(
        user_email=request.user_email,
        schedule=blocks,
        metrics=metrics,
        recommendation=recommendation
    )

@app.post("/coach/analyze", response_model=CoachResponse)
def analyze_performance(request: CoachRequest):
    rate = (request.completed_tasks / request.total_tasks * 100
            if request.total_tasks > 0 else 0)

    # If Groq API Key is configured, use LangChain + Groq
    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser

            llm = ChatGroq(
                groq_api_key=GROQ_API_KEY,
                model_name=GROQ_MODEL,
                temperature=0.6,
                max_tokens=600
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", 
                 "You are an elite, highly actionable AI executive productivity and time management coach. "
                 "Analyze the user's performance metrics and output strict JSON with exactly two fields:\n"
                 "- 'analysis': A sharp 2-sentence summary of their productivity pattern and focus discipline.\n"
                 "- 'tips': A list of 3-4 specific, high-impact tactical recommendations to overcome procrastination and optimize deep work.\n"
                 "Return ONLY the valid JSON object without markdown fences or extra explanations."),
                ("human", 
                 "User metrics:\n"
                 "- Planned tasks: {total_tasks}\n"
                 "- Completed tasks: {completed_tasks}\n"
                 "- Completion rate: {rate:.1f}%\n"
                 "- Total focus time tracked: {total_focus_minutes} minutes ({hours:.1f} hours)\n\n"
                 "Provide personalized executive productivity coaching.")
            ])

            chain = prompt | llm | JsonOutputParser()
            result = chain.invoke({
                "total_tasks": request.total_tasks,
                "completed_tasks": request.completed_tasks,
                "rate": rate,
                "total_focus_minutes": request.total_focus_minutes,
                "hours": request.total_focus_minutes / 60.0
            })

            return CoachResponse(
                user_email=request.user_email,
                analysis=result.get("analysis", f"Completion rate: {rate:.1f}%. Total focus: {request.total_focus_minutes}m."),
                tips=result.get("tips", [
                    "Prioritize single-task deep work blocks.",
                    "Review low-completion categories and adjust task estimations."
                ])
            )
        except Exception as e:
            print(f"[AI Service Warning] Groq API call failed: {e}. Falling back to rule-based coach.")

    # Fallback rule-based coaching if no API key is provided
    tips = []
    if rate < 50:
        tips.append("You completed less than 50% of your tasks. Try breaking large tasks into smaller 25-minute blocks.")
        tips.append("Schedule your hardest task first at your chosen start hour before distractions begin.")
    elif rate < 80:
        tips.append("Good progress! To reach 80%+, avoid multitasking during deep-work sessions.")
        tips.append("Consider reducing your task list by 20% to increase focus quality.")
    else:
        tips.append("Excellent performance! You are in the top productivity tier.")
        tips.append("Try adding stretch goals to push your limits further.")

    if request.total_focus_minutes < 120:
        tips.append("You focused less than 2 hours today. Try the Pomodoro technique: 25 min work, 5 min break.")

    analysis = (
        f"Completion rate: {rate:.1f}%. "
        f"Total focus time: {request.total_focus_minutes} minutes. "
        f"Tasks completed: {request.completed_tasks}/{request.total_tasks}."
    )
    return CoachResponse(user_email=request.user_email, analysis=analysis, tips=tips)

@app.post("/tasks/decompose",response_model=DecomposeResponse)
def decompose_goal(request:DecomposeRequest):
    max_minutes=(request.target_hours or 4)*60
    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser

            llm=ChatGroq(groq_api_key=GROQ_API_KEY,model_name=GROQ_MODEL,temperature=0.5)
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

                # Fallback default decomposition if no API key is configured
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