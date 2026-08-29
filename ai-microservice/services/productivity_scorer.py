from typing import List, Optional
from pydantic import BaseModel

class TaskPerformanceRecord(BaseModel):
    title: str
    estimated_minutes: int
    actual_minutes: Optional[int] = None
    status: str # "completed", "pending", "in_progress", "cancelled"
    priority: Optional[str] = "medium"
    energy_required: Optional[str] = "medium"

class ProductivityAssessment(BaseModel):
    score: int # 0 to 100
    completion_rate: float
    estimation_accuracy_percent: float
    deep_work_ratio: float
    burnout_risk: str # "low", "moderate", "elevated", "high"
    grade: str # "A+", "A", "B", "C", "D", "Needs Attention"
    strengths: List[str]
    growth_areas: List[str]
    actionable_advice: List[str]

def calculate_productivity_score(
    records: List[TaskPerformanceRecord],
    total_focus_minutes: int = 0
) -> ProductivityAssessment:
    if not records:
        return ProductivityAssessment(
            score=0,
            completion_rate=0.0,
            estimation_accuracy_percent=0.0,
            deep_work_ratio=0.0,
            burnout_risk="low",
            grade="N/A",
            strengths=["Clean slate ready for new tasks"],
            growth_areas=["No tasks recorded yet"],
            actionable_advice=["Add tasks to your schedule to activate AI productivity scoring."]
        )

    total_tasks = len(records)
    completed_tasks = [t for t in records if t.status == "completed"]
    in_progress_tasks = [t for t in records if t.status == "in_progress"]
    completed_count = len(completed_tasks)
    completion_rate = (completed_count / max(1, total_tasks)) * 100.0

    # 1. Completion Rate Component (Weight: 35 points)
    completion_points = (completion_rate / 100.0) * 35.0

    # 2. Time Estimation Accuracy Component (Weight: 30 points)
    # Evaluates completed tasks and in-progress tasks with logged time
    evaluated_tasks = []
    for t in records:
        est = max(1, t.estimated_minutes)
        if t.status == "completed":
            # If actual_minutes was recorded, compare; if 0/null, user marked it done as planned
            act = t.actual_minutes if (t.actual_minutes is not None and t.actual_minutes > 0) else est
            accuracy = max(0.0, 100.0 - (abs(est - act) / float(est)) * 100.0)
            evaluated_tasks.append(accuracy)
        elif t.actual_minutes and t.actual_minutes > 0:
            act = t.actual_minutes
            accuracy = max(0.0, 100.0 - (abs(est - act) / float(est)) * 100.0)
            evaluated_tasks.append(accuracy)

    if evaluated_tasks:
        accuracy_percent = sum(evaluated_tasks) / len(evaluated_tasks)
        estimation_points = (accuracy_percent / 100.0) * 30.0
    else:
        accuracy_percent = 100.0 if completed_count > 0 else 0.0
        estimation_points = (accuracy_percent / 100.0) * 30.0 if completed_count > 0 else 0.0

    # 3. Deep Work Ratio Component (Weight: 20 points)
    # Ratio of focus time/tasks spent on high priority or deep energy items
    deep_items = [
        t for t in records 
        if (t.priority or "").lower() in ["high", "critical"] 
        or (t.energy_required or "").lower() in ["deep", "high"]
    ]
    deep_completed = [t for t in deep_items if t.status == "completed"]
    deep_minutes = sum(t.actual_minutes or t.estimated_minutes for t in deep_completed)
    total_evaluated_minutes = sum(t.actual_minutes or t.estimated_minutes for t in completed_tasks)

    if total_evaluated_minutes > 0:
        deep_work_ratio = min(100.0, (deep_minutes / total_evaluated_minutes) * 100.0)
    elif len(records) > 0:
        deep_work_ratio = min(100.0, (len(deep_items) / len(records)) * 100.0)
    else:
        deep_work_ratio = 0.0

    deep_work_points = (deep_work_ratio / 100.0) * 20.0

    # 4. Focus Consistency & Volume Component (Weight: 15 points)
    effective_focus = max(total_focus_minutes, sum(t.actual_minutes or 0 for t in records))
    focus_points = min(15.0, (effective_focus / 120.0) * 15.0)

    raw_score = int(round(completion_points + estimation_points + deep_work_points + focus_points))
    final_score = max(0, min(100, raw_score))

    # Burnout Risk Assessment
    if effective_focus > 480 or (total_tasks > 12 and completion_rate < 40):
        burnout_risk = "high"
    elif effective_focus > 360 or total_tasks > 9:
        burnout_risk = "elevated"
    elif effective_focus > 240:
        burnout_risk = "moderate"
    else:
        burnout_risk = "low"

    # Letter Grade
    if final_score >= 90:
        grade = "A+"
    elif final_score >= 80:
        grade = "A"
    elif final_score >= 70:
        grade = "B"
    elif final_score >= 60:
        grade = "C"
    elif final_score >= 50:
        grade = "D"
    else:
        grade = "Needs Attention"

    strengths = []
    growth_areas = []
    actionable_advice = []

    if completion_rate >= 70:
        strengths.append(f"High task execution rate ({completion_rate:.0f}% completed)")
    else:
        growth_areas.append(f"Task completion rate is {completion_rate:.0f}% — complete current batch before adding new ones")

    if accuracy_percent >= 75:
        strengths.append(f"Precise time estimation ({accuracy_percent:.0f}% accuracy)")
    else:
        growth_areas.append(f"Estimation accuracy is {accuracy_percent:.0f}% — adjust task buffers")

    if deep_work_ratio >= 40:
        strengths.append(f"Strong deep work allocation ({deep_work_ratio:.0f}% on high-impact tasks)")
    else:
        growth_areas.append("Low proportion of deep work — prioritize high-cognitive tasks")

    if burnout_risk in ["elevated", "high"]:
        actionable_advice.append("Take deliberate 15-minute recovery breaks between high-focus blocks.")
    elif completion_rate < 50:
        actionable_advice.append("Focus on finishing 1 high-priority task before opening another.")
    elif accuracy_percent < 70:
        actionable_advice.append("Add a 20% time buffer to planned tasks to align with real execution speed.")
    else:
        actionable_advice.append("Outstanding cognitive rhythm. Keep protecting your morning deep work windows.")

    return ProductivityAssessment(
        score=final_score,
        completion_rate=round(completion_rate, 1),
        estimation_accuracy_percent=round(accuracy_percent, 1),
        deep_work_ratio=round(deep_work_ratio, 1),
        burnout_risk=burnout_risk,
        grade=grade,
        strengths=strengths,
        growth_areas=growth_areas,
        actionable_advice=actionable_advice
    )
