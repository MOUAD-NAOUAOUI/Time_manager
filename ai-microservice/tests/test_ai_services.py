import pytest
from core.models import TaskItem, CoachAnalyzeRequest, ChatProcessRequest, EmbeddingRequest, SimilarityRequest
from services.constraint_scheduler import generate_constraint_schedule, compute_urgency_score
from services.coach_engine import analyze_performance_and_coach
from services.task_extractor import process_chat_and_extract_tasks
from services.embeddings_service import generate_text_embeddings, rank_similar_candidates
from services.productivity_scorer import calculate_productivity_score, TaskPerformanceRecord
from services.memory_service import analyze_estimation_bias, TaskHistorySample
from services.goal_decomposer import decompose_goal_hierarchical

def test_urgency_scoring():
    task_no_dl = TaskItem(title="Task 1", estimated_minutes=30)
    score_no_dl = compute_urgency_score(task_no_dl, ref_date=__import__('datetime').date.today())
    assert score_no_dl == 20.0

def test_constraint_scheduling_placement():
    tasks = [
        TaskItem(id="1", title="Urgent Task", estimated_minutes=60, priority="high", energy_required="deep"),
        TaskItem(id="2", title="Admin Email", estimated_minutes=30, priority="low", energy_required="light")
    ]
    blocks, metrics = generate_constraint_schedule(tasks, start_hour=9, end_hour=18)
    assert len(blocks) == 2
    assert metrics.scheduled_tasks == 2
    assert metrics.total_planned_minutes == 90
    assert metrics.overload_warning is False
    assert blocks[0].title == "Urgent Task"

def test_coaching_engine():
    req = CoachAnalyzeRequest(
        user_email="test@example.com",
        total_tasks=10,
        completed_tasks=8,
        total_focus_minutes=240
    )
    resp = analyze_performance_and_coach(req)
    assert resp.user_email == "test@example.com"
    assert len(resp.tips) == 3
    assert len(resp.analysis) > 10

def test_task_extraction_fallback():
    req = ChatProcessRequest(
        user_email="test@example.com",
        message="I need to study for physics and write an essay"
    )
    resp = process_chat_and_extract_tasks(req)
    assert resp.proposal is not None
    assert len(resp.proposal.extracted_tasks) >= 2
    assert resp.proposal.impact_analysis.added_minutes > 0

def test_embeddings_and_similarity():
    texts = ["Prepare system design", "Study distributed caching", "Cook pasta dinner"]
    embeddings = generate_text_embeddings(texts)
    assert len(embeddings) == 3
    assert len(embeddings[0]) == 128

    similar = rank_similar_candidates("System architecture design", texts)
    assert len(similar) == 3
    assert similar[0].candidate == "Prepare system design"

def test_productivity_scorer():
    records = [
        TaskPerformanceRecord(title="Task A", estimated_minutes=60, actual_minutes=65, status="completed", priority="high", energy_required="deep"),
        TaskPerformanceRecord(title="Task B", estimated_minutes=30, actual_minutes=30, status="completed", priority="medium", energy_required="medium"),
        TaskPerformanceRecord(title="Task C", estimated_minutes=45, actual_minutes=None, status="pending", priority="low", energy_required="light"),
    ]
    assessment = calculate_productivity_score(records, total_focus_minutes=95)
    assert assessment.score >= 50
    assert assessment.completion_rate == 66.7
    assert assessment.estimation_accuracy_percent > 80.0
    assert assessment.grade in ["A+", "A", "B", "C"]
    assert len(assessment.strengths) > 0
    assert len(assessment.actionable_advice) > 0

def test_estimation_bias_analysis():
    samples = [
        TaskHistorySample(title="Feature A", category="dev", estimated_minutes=40, actual_minutes=60, completed=True),
        TaskHistorySample(title="Feature B", category="dev", estimated_minutes=20, actual_minutes=30, completed=True),
    ]
    profile = analyze_estimation_bias("dev@example.com", samples)
    assert profile.total_evaluated_tasks == 2
    assert profile.bias_factor == 1.5 # 90 / 60 = 1.5
    assert profile.bias_category == "underestimator"
    assert profile.recommended_multiplier == 1.5
    assert "dev" in profile.category_insights

def test_hierarchical_goal_decomposer():
    plan = decompose_goal_hierarchical(
        user_email="student@example.com",
        goal="Build and deploy a full-stack time management platform",
        target_hours=10.0
    )
    assert len(plan.phases) == 3
    assert plan.target_hours == 10.0
    assert plan.critical_path_hours > 0
    assert plan.phases[0].phase_number == 1
    assert plan.phases[1].dependencies == [1]
