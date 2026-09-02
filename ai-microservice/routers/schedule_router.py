from fastapi import APIRouter
from core.models import ScheduleRequest, ScheduleResponse
from services.constraint_scheduler import generate_constraint_schedule
from services.schedule_explainer import generate_schedule_explanation
from core.config import ENERGY_WINDOWS

router = APIRouter(prefix="/schedule", tags=["Schedule"])

@router.post("/generate", response_model=ScheduleResponse)
def schedule_generate(request: ScheduleRequest):
    """Generates an optimal constraint-based schedule with urgency scoring and energy alignment."""
    blocks, metrics = generate_constraint_schedule(
        tasks=request.tasks,
        start_hour=request.start_hour or 9,
        end_hour=request.end_hour or 18,
        schedule_date_str=request.date,
        user_timezone=request.timezone or "UTC",
        sleep_start=request.sleep_start or "22:00",
        sleep_end=request.sleep_end or "06:00"
    )
    explanation = generate_schedule_explanation(blocks, metrics)
    return ScheduleResponse(
        user_email=request.user_email or "user@example.com",
        schedule=blocks,
        metrics=metrics,
        recommendation=explanation
    )

@router.get("/energy-windows")
def get_energy_windows():
    """Returns the cognitive energy capacity mapping by hour."""
    return {"energy_windows": ENERGY_WINDOWS}
