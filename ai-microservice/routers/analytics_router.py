from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from services.productivity_scorer import (
    calculate_productivity_score,
    TaskPerformanceRecord,
    ProductivityAssessment
)
from services.memory_service import (
    analyze_estimation_bias,
    TaskHistorySample,
    UserEstimationProfile
)
from services.goal_decomposer import (
    decompose_goal_hierarchical,
    AdvancedGoalPlan
)

router = APIRouter(prefix="/analytics", tags=["Productivity & Intelligence"])

class ScoreRequest(BaseModel):
    user_email: str
    records: List[TaskPerformanceRecord]
    total_focus_minutes: Optional[int] = 0

class BiasRequest(BaseModel):
    user_email: str
    samples: List[TaskHistorySample]

class AdvancedDecomposeRequest(BaseModel):
    user_email: str
    goal: str
    target_hours: Optional[float] = 8.0

@router.post("/productivity-score", response_model=ProductivityAssessment)
def get_productivity_score(req: ScoreRequest):
    return calculate_productivity_score(req.records, req.total_focus_minutes or 0)

@router.post("/estimation-bias", response_model=UserEstimationProfile)
def get_estimation_bias(req: BiasRequest):
    return analyze_estimation_bias(req.user_email, req.samples)

@router.post("/decompose-advanced", response_model=AdvancedGoalPlan)
def get_advanced_decomposition(req: AdvancedDecomposeRequest):
    return decompose_goal_hierarchical(req.user_email, req.goal, req.target_hours or 8.0)
