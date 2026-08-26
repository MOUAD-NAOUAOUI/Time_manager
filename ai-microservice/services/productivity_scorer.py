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
    grade: str # "A+", "A", "B", "C", "Needs Attention"
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
    completed_count = len(completed_tasks)
    completion_rate = (completed_count / total_tasks) * 100.0

    # 1. Completion Rate Component (Weight: 40 points)
    completion_points = (completed_count / total_tasks) * 40.0

    # 2. Estimation Accuracy Component (Weight: 25 points)
    evaluable_tasks = [t for t in completed_tasks if t.actual_minutes and t.actual_minutes > 0 and t.estimated_minutes > 0]
    if evaluable_tasks:
        deviations = []
        for t in evaluable_tasks:
            dev = abs(t.actual_minutes - t.estimated_minutes) / t.estimated_minutes
            deviations.append(min(dev, 1.0))
        avg_deviation = sum(deviations) / len(deviations)
        accuracy_percent = max(0.0, (1.0 - avg_deviation) * 100.0)
        estimation_points = (accuracy_percent / 100.0) * 25.0
    else:
        accuracy_percent = 85.0
        estimation_points = 21.25

    # 3. Focus & Deep Work Component (Weight: 20 points)
    deep_tasks = [t for t in completed_tasks if (t.energy_required or "medium").lower() in ["high", "deep"]]
    deep_work_ratio = (len(deep_tasks) / max(1, completed_count)) * 100.0
    focus_points = min(20.0, (total_focus_minutes / 180.0) * 10.0 + (deep_work_ratio / 100.0) * 10.0)

    # 4. Priority Execution Component (Weight: 15 points)
    high_priority_completed = [t for t in completed_tasks if (t.priority or "medium").lower() in ["high", "critical"]]
    total_high_priority = [t for t in records if (t.priority or "medium").lower() in ["high", "critical"]]
    if total_high_priority:
        priority_points = (len(high_priority_completed) / len(total_high_priority)) * 15.0
    else:
        priority_points = 12.0

    raw_score = int(round(completion_points + estimation_points + focus_points + priority_points))
    final_score = max(10, min(100, raw_score))

    # Burnout Risk Assessment
    if total_focus_minutes > 480 or (total_tasks > 12 and completion_rate < 40):
        burnout_risk = "high"
    elif total_focus_minutes > 360 or total_tasks > 9:
        burnout_risk = "elevated"
    elif total_focus_minutes > 240:
        burnout_risk = "moderate"
    else:
        burnout_risk = "low"

    # Grade
    if final_score >= 90:
        grade = "A+"
    elif final_score >= 80:
        grade = "A"
    elif final_score >= 70:
        grade = "B"
    elif final_score >= 55:
        grade = "C"
    else:
        grade = "Needs Attention"

    # Strengths and Growth Areas
    strengths = []
    growth_areas = []
    actionable_advice = []

    if completion_rate >= 75:
        strengths.append(f"Strong execution rate ({completion_rate:.1f}% completed)")
    else:
        growth_areas.append(f"Task completion rate is {completion_rate:.1f}% — focus on smaller task batches")

    if accuracy_percent >= 80:
        strengths.append("High time estimation precision")
    else:
        growth_areas.append("Significant variance between estimated and actual task duration")

    if total_focus_minutes >= 120:
        strengths.append(f"Accumulated {total_focus_minutes}m of deep focus time")
    else:
        growth_areas.append("Low logged focus session volume")

    if burnout_risk in ["elevated", "high"]:
        actionable_advice.append("Take deliberate 15-minute recovery intervals between high-cognitive blocks.")
    if completion_rate < 60:
        actionable_advice.append("Apply the 'Rule of 3': select only 3 non-negotiable tasks before adding new ones.")
    if accuracy_percent < 75:
        actionable_advice.append("Add a 25% buffer to your next estimated task durations to account for planning fallacy.")
    if not actionable_advice:
        actionable_advice.append("Maintain your current rhythm. Consider tackling complex high-leverage milestones next.")

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
