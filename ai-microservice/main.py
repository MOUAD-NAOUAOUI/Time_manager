from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Optional

app=FastAPI(
    title="Intelligent Time Manager - AI Engine",
    description="AI Microservice for Smart Scheduling and Performance Coaching",
    version="1.0.0"
)

class TaskItem(BaseModel):
    id:str
    title:str
    estimated_minutes:int
    deadline:Optional[str]=None
    color:Optional[str]="#A0785A"

class ScheduleRequest(BaseModel):
    user_email:str
    tasks:List[TaskItem]
    start_hour:Optional[int]=8

class TimeBlock(BaseModel):
    task_id:str
    title:str
    start_time:str
    end_time:str
    color:str

class ScheduleResponse(BaseModel):
    user_email:str
    schedule:List[TimeBlock]
    recommendation:str

from datetime import datetime,timedelta

@app.get("/health")
def health_check():
    return {"status":"healthy","service":"ai-microservice"}


@app.post("/schedule/generate",response_model=ScheduleResponse)
def generate_schedule(request:ScheduleRequest):
    schedule=[]
    start=datetime.now().replace(hour=request.start_hour,minute=0,second=0,microsecond=0)
    sorted_tasks=sorted(
        request.tasks,
        key=lambda t:t.estimated_minutes,
        reverse=True
    )

    for task in sorted_tasks:
        end=start + timedelta(minutes=task.estimated_minutes)
        schedule.append(TimeBlock(
            task_id=task.id,
            title=task.title,
            start_time=start.strftime("%H:%M"),
            end_time=end.strftime("%H:%M"),
            color=task.color or "#A0785A"
        ))
        start = end + timedelta(minutes=15)

    recommendation=(
        f"Schedule optimized for {len(sorted_tasks)} tasks."
        "Hardest tasks scheduled first (Eat the Frog strategy)."
        "15-minute breaks inserted between tasks for peak focus."
    )
    return ScheduleResponse(user_email=request.user_email,schedule=schedule,
                            recommendation=recommendation)



class CoachRequest(BaseModel):
    user_email:str
    total_tasks:int
    completed_tasks:int
    total_focus_minutes:int

class CoachResponse(BaseModel):
    user_email:str
    analysis:str
    tips:List[str]

@app.post("/coach/analyze", response_model=CoachResponse)
def analyze_performance(request: CoachRequest):
    rate = (request.completed_tasks / request.total_tasks * 100
            if request.total_tasks > 0 else 0)
    tips = []

    if rate < 50:
        tips.append("You completed less than 50% of your tasks. Try breaking large tasks into smaller 25-minute blocks.")
        tips.append("Schedule your hardest task first at your chosen start hour before distractions begin.")
    elif rate < 80:
        tips.append("Good progress! To reach 80%+, avoid multitasking during deep-work sessions.")
        tips.append("Consider reducing your task list by 20% to increase focus quality.")
    else:
        tips.append("Excellent performance! You are in the top productivity tier.")
        tips.append("Try adding stretch goals to push your limits further.")

    if request.total_focus_minutes < 120:
        tips.append("You focused less than 2 hours today. Try the Pomodoro technique: 25 min work, 5 min break.")

    analysis = (
        f"Completion rate: {rate:.1f}%. "
        f"Total focus time: {request.total_focus_minutes} minutes. "
        f"Tasks completed: {request.completed_tasks}/{request.total_tasks}."
    )
    return CoachResponse(user_email=request.user_email, analysis=analysis, tips=tips)
