from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class TaskHistorySample(BaseModel):
    title: str
    category: Optional[str] = "general"
    estimated_minutes: int
    actual_minutes: int
    completed: bool

class UserEstimationProfile(BaseModel):
    user_email: str
    total_evaluated_tasks: int
    bias_factor: float # e.g. 1.25 means user underestimates tasks by 25%
    bias_category: str # "underestimator", "overestimator", "accurate"
    recommended_multiplier: float
    category_insights: Dict[str, float]
    summary: str

def analyze_estimation_bias(user_email: str, samples: List[TaskHistorySample]) -> UserEstimationProfile:
    valid_samples = [s for s in samples if s.completed and s.estimated_minutes > 0 and s.actual_minutes > 0]
    
    if not valid_samples:
        return UserEstimationProfile(
            user_email=user_email,
            total_evaluated_tasks=0,
            bias_factor=1.0,
            bias_category="accurate",
            recommended_multiplier=1.0,
            category_insights={},
            summary="Insufficient historical completed tasks to compute estimation bias. Default 1.0x factor applied."
        )

    # Compute global bias factor = sum(actual) / sum(estimated)
    total_actual = sum(s.actual_minutes for s in valid_samples)
    total_estimated = sum(s.estimated_minutes for s in valid_samples)
    
    bias_factor = round(total_actual / max(1, total_estimated), 2)
    
    if bias_factor >= 1.15:
        bias_category = "underestimator"
        summary = f"You typically require {int(round((bias_factor - 1.0) * 100))}% more time than initially planned. Recommended auto-padding applied."
        recommended_multiplier = bias_factor
    elif bias_factor <= 0.85:
        bias_category = "overestimator"
        summary = f"You finish tasks ~{int(round((1.0 - bias_factor) * 100))}% faster than estimated. You have room for denser scheduling."
        recommended_multiplier = bias_factor
    else:
        bias_category = "accurate"
        summary = "Your time estimations are well calibrated within a 15% tolerance window."
        recommended_multiplier = 1.0

    # Category breakdowns
    category_insights: Dict[str, float] = {}
    categories = set(s.category or "general" for s in valid_samples)
    for cat in categories:
        cat_samples = [s for s in valid_samples if (s.category or "general") == cat]
        cat_actual = sum(s.actual_minutes for s in cat_samples)
        cat_est = sum(s.estimated_minutes for s in cat_samples)
        if cat_est > 0:
            category_insights[cat] = round(cat_actual / cat_est, 2)

    return UserEstimationProfile(
        user_email=user_email,
        total_evaluated_tasks=len(valid_samples),
        bias_factor=bias_factor,
        bias_category=bias_category,
        recommended_multiplier=recommended_multiplier,
        category_insights=category_insights,
        summary=summary
    )
