from datetime import datetime, date
from typing import List, Tuple
from core.config import ENERGY_WINDOWS, PRIORITY_WEIGHTS, ENERGY_SCORE_WEIGHTS
from core.models import TaskItem, TimeBlock, ScheduleMetrics

def compute_urgency_score(task: TaskItem, ref_date: date) -> float:
    """
    Computes a continuous urgency score (0-150):
    - Overdue: 150
    - Due today: 100
    - Due tomorrow: 90
    - Due within 3 days: 70
    - Due within 7 days: 50
    - Beyond 7 days: decayed
    - No deadline: 20
    """
    if not task.deadline:
        return 20.0
    try:
        deadline_str = task.deadline.split("T")[0]
        dl_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
        days_left = (dl_date - ref_date).days
        if days_left < 0:
            return 150.0 # Overdue
        elif days_left == 0:
            return 100.0 # Due today
        elif days_left == 1:
            return 90.0
        elif days_left <= 3:
            return 70.0
        elif days_left <= 7:
            return 50.0
        else:
            return max(0.0, 30.0 - (days_left - 7) * 2.0)
    except Exception:
        return 20.0

def get_energy_level(hour: int) -> str:
    """Returns 'deep', 'medium', or 'light' for a given clock hour."""
    return ENERGY_WINDOWS.get(hour, "medium")

def break_minutes(task_duration: int) -> int:
    """Smart break length following cognitive fatigue curves."""
    if task_duration >= 90:
        return 20
    elif task_duration >= 45:
        return 10
    return 5

def generate_constraint_schedule(
    tasks: List[TaskItem],
    start_hour: int = 9,
    end_hour: int = 18,
    schedule_date_str: str = None,
    user_timezone: str = "UTC"
) -> Tuple[List[TimeBlock], ScheduleMetrics]:
    """
    Mathematical Constraint Satisfaction Engine:
    - Urgency + Priority Weighted Sorting
    - Cognitive Energy Window Placement
    - Inter-task Smart Breaks & Overload Calculation
    """
    try:
        from zoneinfo import ZoneInfo
        ref_date = datetime.now(ZoneInfo(user_timezone or "UTC")).date()
    except Exception:
        ref_date = date.today()

    if schedule_date_str:
        try:
            ref_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
        except Exception:
            pass

    available_work_minutes = (end_hour - start_hour) * 60
    total_planned_minutes = sum(t.estimated_minutes for t in tasks)

    # Composite score = urgency * 0.5 + priority_weight * 10
    scored_tasks = []
    for t in tasks:
        urgency = compute_urgency_score(t, ref_date)
        p_weight = PRIORITY_WEIGHTS.get((t.priority or "medium").lower(), 2)
        composite = urgency * 0.5 + p_weight * 10
        scored_tasks.append((composite, urgency, t))

    # Highest score first (Eat the Frog / Deadline Urgency)
    scored_tasks.sort(key=lambda x: x[0], reverse=True)

    blocks: List[TimeBlock] = []
    current_minutes = start_hour * 60
    end_limit_minutes = end_hour * 60
    deadline_conflicts: List[str] = []

    for composite, urgency, task in scored_tasks:
        duration = task.estimated_minutes
        if current_minutes + duration > end_limit_minutes:
            if urgency >= 90:
                deadline_conflicts.append(f"{task.title} (urgent, but day full)")
            continue

        slot_hour = current_minutes // 60
        energy_window = get_energy_level(slot_hour)
        task_energy = (task.energy_required or "medium").lower()

        # Build transparent human reasoning for why the block was placed here
        reasons = []
        if urgency >= 100:
            reasons.append("Deadline is today/overdue (highest priority)")
        elif urgency >= 70:
            reasons.append(f"Due soon (urgency score {int(urgency)})")
        if (task.priority or "").lower() == "high":
            reasons.append("High priority flag")
        if task_energy == "deep" and energy_window == "deep":
            reasons.append(f"Deep work matched to peak focus window ({slot_hour}:00)")
        elif energy_window == "light":
            reasons.append(f"Placed in light-focus afternoon window ({slot_hour}:00)")
        if not reasons:
            reasons.append(f"Scheduled based on daily flow ({slot_hour}:00)")

        start_str = f"{current_minutes // 60:02d}:{current_minutes % 60:02d}"
        finish_min = current_minutes + duration
        end_str = f"{finish_min // 60:02d}:{finish_min % 60:02d}"

        blocks.append(TimeBlock(
            task_id=task.id,
            title=task.title,
            start_time=start_str,
            end_time=end_str,
            color=task.color or "#A0785A",
            priority=task.priority or "medium",
            energy_required=task_energy,
            constraint_reason="; ".join(reasons)
        ))

        rest = break_minutes(duration)
        current_minutes = finish_min + rest

    scheduled_count = len(blocks)
    unscheduled_count = len(tasks) - scheduled_count
    actual_scheduled_minutes = sum(
        t.estimated_minutes for _, _, t in scored_tasks[:scheduled_count]
    )
    utilization = min(100.0, round((actual_scheduled_minutes / max(1, available_work_minutes)) * 100, 1))
    overload = total_planned_minutes > available_work_minutes

    metrics = ScheduleMetrics(
        total_tasks=len(tasks),
        scheduled_tasks=scheduled_count,
        unscheduled_tasks=unscheduled_count,
        total_planned_minutes=actual_scheduled_minutes,
        available_work_minutes=available_work_minutes,
        utilization_percent=utilization,
        overload_warning=overload,
        deadline_conflicts=deadline_conflicts
    )

    return blocks, metrics
