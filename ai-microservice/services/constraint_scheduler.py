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
    user_timezone: str = "UTC",
    sleep_start: str = "22:00",
    sleep_end: str = "06:00"
) -> Tuple[List[TimeBlock], ScheduleMetrics]:
    """
    Mathematical Constraint Satisfaction Engine:
    - Anchored 8-Hour Circadian Sleep Recovery Block (#1E1B4B)
    - Urgency + Priority Weighted Sorting
    - Cognitive Energy Window Placement & Micro-Task Transition Slotting
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

    # Parse sleep window
    try:
        sh, sm = map(int, (sleep_start or "22:00").split(":"))
        eh, em = map(int, (sleep_end or "06:00").split(":"))
        s_start_mins = sh * 60 + sm
        s_end_mins = eh * 60 + em
        sleep_duration_mins = (24 * 60 - s_start_mins + s_end_mins) if s_end_mins <= s_start_mins else (s_end_mins - s_start_mins)
    except Exception:
        s_start_mins = 22 * 60
        s_end_mins = 6 * 60
        sleep_duration_mins = 480
        sleep_start = "22:00"
        sleep_end = "06:00"

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

    # Anchored Circadian Sleep Block (Night)
    sleep_block = TimeBlock(
        task_id="circadian-sleep-block",
        title="Sleep & Circadian Recovery",
        start_time=sleep_start,
        end_time=sleep_end,
        color="#1E1B4B",
        priority="high",
        energy_required="rest",
        constraint_reason=f"Circadian Deep Restoration Window ({sleep_start} - {sleep_end}, {sleep_duration_mins // 60}h)"
    )

    current_minutes = max(start_hour * 60, s_end_mins if s_end_mins < 12 * 60 and start_hour * 60 < s_end_mins else start_hour * 60)
    end_limit_minutes = min(end_hour * 60, s_start_mins if s_start_mins > current_minutes else end_hour * 60)
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
        if duration <= 15:
            reasons.append("Quick-Win Habit: 10-15m low-friction focus slot")
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

    # Always include the Sleep Block in the daily schedule
    blocks.append(sleep_block)

    scheduled_count = len([b for b in blocks if b.task_id != "circadian-sleep-block"])
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
