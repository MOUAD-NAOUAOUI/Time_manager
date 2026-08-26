from core.config import GROQ_API_KEY, GROQ_MODEL
from core.models import CoachAnalyzeRequest, CoachAnalyzeResponse

def analyze_performance_and_coach(request: CoachAnalyzeRequest) -> CoachAnalyzeResponse:
    """
    AI Performance Coaching Engine:
    - Analyzes completion rate and focus duration
    - Pinpoints cognitive bottlenecks (e.g. procrastination, fragmented work)
    - Returns structured natural language feedback and 3 actionable tips
    """
    # 0 Activity Clean State
    if request.total_tasks == 0 and request.total_focus_minutes == 0:
        return CoachAnalyzeResponse(
            user_email=request.user_email,
            analysis="No tasks or focus sessions logged yet. Add your first task or start a timer to generate personalized AI coaching.",
            tips=[
                "Add 2-3 core tasks to structure your daily workflow.",
                "Use the interactive timer on the Dashboard to record real focus minutes.",
                "Generate an AI-optimized day on the Schedule page."
            ]
        )

    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser

            llm = ChatGroq(
                groq_api_key=GROQ_API_KEY,
                model_name=GROQ_MODEL,
                temperature=0.3
            )
            prompt = ChatPromptTemplate.from_messages([
                ("system",
                 "You are an elite, encouraging productivity and performance coach.\n"
                 "Analyze the user's focus metrics and provide deep, actionable insights.\n"
                 "Return strict JSON with:\n"
                 "- 'analysis': A 2-3 sentence personalized evaluation of their current workflow and cognitive stamina.\n"
                 "- 'tips': An array of exactly 3 tactical, highly specific recommendations to boost deep work.\n"
                 "Return ONLY the JSON without markdown formatting."),
                ("human",
                 "User Metrics:\n"
                 "- Total Tasks Planned: {total_tasks}\n"
                 "- Completed Tasks: {completed_tasks}\n"
                 "- Total Tracked Focus: {focus_hours:.1f} hours ({focus_mins} minutes)\n"
                 "- Completion Rate: {rate:.1f}%")
            ])
            chain = prompt | llm | JsonOutputParser()
            rate = (request.completed_tasks / max(1, request.total_tasks)) * 100
            result = chain.invoke({
                "total_tasks": request.total_tasks,
                "completed_tasks": request.completed_tasks,
                "focus_hours": request.total_focus_minutes / 60.0,
                "focus_mins": request.total_focus_minutes,
                "rate": rate
            })
            return CoachAnalyzeResponse(
                user_email=request.user_email,
                analysis=result.get("analysis", "Solid progress on your active workflow."),
                tips=result.get("tips", [
                    "Block high-energy mornings for deep analytical tasks.",
                    "Batch lightweight communications into afternoon windows.",
                    "Use 25-minute Pomodoro intervals for difficult starts."
                ])
            )
        except Exception as e:
            print(f"[AI Service Warning] Groq Coach analysis fallback: {e}")

    # Fallback rule-based coaching
    completion_rate = (request.completed_tasks / max(1, request.total_tasks)) * 100
    if completion_rate >= 80:
        analysis = (f"Outstanding performance! You completed {request.completed_tasks}/{request.total_tasks} tasks "
                    f"with {request.total_focus_minutes}m of deep focus.")
        tips = [
            "Maintain your momentum with structured rest intervals.",
            "Protect your morning focus window from early meetings.",
            "Review your hardest task at the start of the week."
        ]
    elif completion_rate >= 50:
        analysis = (f"Good progress with {request.completed_tasks}/{request.total_tasks} tasks finished. "
                    f"Consider breaking larger pending tasks into smaller 30-minute milestones.")
        tips = [
            "Tackle your highest-priority task first thing in the morning (Eat the Frog).",
            "Reduce task switching by grouping similar activities together.",
            "Set strict time limits on administrative and low-leverage tasks."
        ]
    else:
        analysis = (f"You have completed {request.completed_tasks}/{request.total_tasks} tasks. "
                    f"Your schedule may be overloaded or task sizes may be too large.")
        tips = [
            "Use the AI task decomposition feature to break big goals into 20-minute chunks.",
            "Dedicate your first 90 minutes solely to high-priority deep work.",
            "Eliminate background interruptions during active focus sessions."
        ]

    return CoachAnalyzeResponse(
        user_email=request.user_email,
        analysis=analysis,
        tips=tips
    )
