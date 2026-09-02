from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# ---------------------------------------------------------------------------
# Scheduling Models
# ---------------------------------------------------------------------------
class TaskItem(BaseModel):
    id: Optional[str] = None
    title: str
    estimated_minutes: int
    deadline: Optional[str] = None
    priority: Optional[str] = "medium" # high, medium, low
    energy_required: Optional[str] = "medium" # deep, medium, light
    color: Optional[str] = "#A0785A"

class ScheduleRequest(BaseModel):
    user_email: Optional[str] = "user@example.com"
    tasks: List[TaskItem]
    start_hour: Optional[int] = 9
    end_hour: Optional[int] = 18
    date: Optional[str] = None
    timezone: Optional[str] = "UTC"
    sleep_start: Optional[str] = "22:00"
    sleep_end: Optional[str] = "06:00"

class TimeBlock(BaseModel):
    task_id: Optional[str] = None
    title: str
    start_time: str
    end_time: str
    color: str
    priority: str = "medium"
    energy_required: str = "medium"
    constraint_reason: str = "Optimally scheduled"

class ScheduleMetrics(BaseModel):
    total_tasks: int
    scheduled_tasks: int
    unscheduled_tasks: int
    total_planned_minutes: int
    available_work_minutes: int
    utilization_percent: float
    overload_warning: bool
    deadline_conflicts: List[str] = []

class ScheduleResponse(BaseModel):
    user_email: str
    schedule: List[TimeBlock]
    metrics: ScheduleMetrics
    recommendation: str

# ---------------------------------------------------------------------------
# AI Coaching Models
# ---------------------------------------------------------------------------
class CoachAnalyzeRequest(BaseModel):
    user_email: str
    total_tasks: int
    completed_tasks: int
    total_focus_minutes: int

class CoachAnalyzeResponse(BaseModel):
    user_email: str
    analysis: str
    tips: List[str]

# ---------------------------------------------------------------------------
# Goal Decomposition Models
# ---------------------------------------------------------------------------
class DecomposeRequest(BaseModel):
    user_email: str
    goal: str
    target_hours: Optional[int] = 4

class SubTaskItem(BaseModel):
    title: str
    estimated_minutes: int
    priority: str
    color: str

class DecomposeResponse(BaseModel):
    user_email: str
    original_goal: str
    total_estimated_minutes: int
    tasks: List[SubTaskItem]
    ai_guidance: str

# ---------------------------------------------------------------------------
# Chat & Conversational Task Extraction Models
# ---------------------------------------------------------------------------
class ChatExistingTask(BaseModel):
    id: Optional[str] = None
    title: str
    estimated_minutes: Optional[int] = 30
    status: Optional[str] = "pending"
    deadline: Optional[str] = None

class ChatHistoryItem(BaseModel):
    role: str
    content: str

class ChatProcessRequest(BaseModel):
    user_email: str
    message: str
    existing_tasks: Optional[List[ChatExistingTask]] = []
    history: Optional[List[ChatHistoryItem]] = []

class ExtractedTaskItem(BaseModel):
    title: str
    estimated_minutes: int
    durationMinutes: Optional[int] = None
    recurrence: str = "none"
    priority: str
    deadline: Optional[str] = None
    color: str = "#A0785A"
    priority_reason: str

    def model_post_init(self, __context) -> None:
        minutes = self.durationMinutes or self.estimated_minutes
        self.estimated_minutes = minutes
        self.durationMinutes = minutes


class LlmExtractedTask(BaseModel):
    title: str = Field(description="The work item only, 1-5 words. Never copy the user utterance.")
    durationMinutes: int = Field(description="Exact duration in minutes. Spoken 'one hour' or 'an hour' is 60.")
    recurrence: Literal["none", "daily", "weekdays", "weekends", "weekly"] = Field(
        description="How often the work repeats. Daily covers every day / all days of the week."
    )
    priority: Literal["high", "medium", "low"] = "medium"
    deadline: Optional[str] = None
    color: str = "#A0785A"
    priority_reason: str = "Extracted from the user request."

class ScheduleImpact(BaseModel):
    existing_task_count: int
    existing_total_minutes: int
    added_minutes: int
    new_total_minutes: int
    weekly_capacity_percent: float
    overload_warning: bool
    collision_warning: bool
    summary: str

class PriorityReasoning(BaseModel):
    rank: int
    title: str
    reason: str

class LlmExtractionResult(BaseModel):
    is_conversational: bool = False
    ai_reply: str
    impact_summary: str = ""
    tasks: List[LlmExtractedTask] = []
    priority_ranking: List[PriorityReasoning] = []

class ChatProposal(BaseModel):
    extracted_tasks: List[ExtractedTaskItem]
    impact_analysis: ScheduleImpact
    priority_ranking: List[PriorityReasoning]

class ChatProcessResponse(BaseModel):
    user_email: str
    message: str
    ai_reply: str
    proposal: Optional[ChatProposal] = None

# ---------------------------------------------------------------------------
# Semantic Vector Embeddings Models
# ---------------------------------------------------------------------------
class EmbeddingRequest(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int

class SimilarityRequest(BaseModel):
    query_text: str
    candidate_texts: List[str]

class SimilarityResult(BaseModel):
    candidate: str
    score: float

class SimilarityResponse(BaseModel):
    results: List[SimilarityResult]
