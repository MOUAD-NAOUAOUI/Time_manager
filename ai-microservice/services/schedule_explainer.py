from typing import List
from core.config import GROQ_API_KEY, GROQ_MODEL
from core.models import TimeBlock, ScheduleMetrics

def generate_schedule_explanation(blocks: List[TimeBlock], metrics: ScheduleMetrics) -> str:
    """Uses Groq LLaMA 3.3 to produce a natural language summary explaining the schedule order and risks."""
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
        chain = prompt | llm | StrOutputParser()
        result = chain.invoke({
            "schedule": schedule_summary,
            "scheduled": metrics.scheduled_tasks,
            "total": metrics.total_tasks,
            "utilization": metrics.utilization_percent,
            "overload": "YES" if metrics.overload_warning else "No",
            "conflicts": ", ".join(metrics.deadline_conflicts) or "None"
        })
        return result.strip()
    except Exception as e:
        print(f"[AI Service Warning] Groq schedule explanation fallback: {e}")
        return (
            f"Schedule optimized: {metrics.scheduled_tasks}/{metrics.total_tasks} tasks fit in your day "
            f"({metrics.utilization_percent}% utilization). Ordered by deadline urgency and priority."
        )
