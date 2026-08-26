from fastapi import APIRouter
from core.models import CoachAnalyzeRequest, CoachAnalyzeResponse
from services.coach_engine import analyze_performance_and_coach

router = APIRouter(prefix="/coach", tags=["Coach"])

@router.post("/analyze", response_model=CoachAnalyzeResponse)
def coach_analyze(request: CoachAnalyzeRequest):
    """Analyzes user performance metrics and returns personalized productivity recommendations."""
    return analyze_performance_and_coach(request)
