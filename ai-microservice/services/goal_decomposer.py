from typing import List, Optional
from pydantic import BaseModel
import os
import json

class MilestonePhase(BaseModel):
    phase_number: int
    name: str # e.g. "Phase 1: Architecture & Foundations"
    estimated_hours: float
    tasks: List[str]
    dependencies: List[int] = [] # phase indices that must be done first

class AdvancedGoalPlan(BaseModel):
    user_email: str
    goal: str
    target_hours: float
    critical_path_hours: float
    phases: List[MilestonePhase]
    ai_strategic_guidance: str

def decompose_goal_hierarchical(user_email: str, goal: str, target_hours: float = 8.0) -> AdvancedGoalPlan:
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    
    if groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            prompt = f"""You are an elite Agile Project Director and Systems Architect.
Decompose the following complex project goal into 3 structured chronological phases with clear milestone dependencies.

Goal: "{goal}"
Target Total Hours: {target_hours}

Return ONLY a valid JSON object matching this exact schema:
{{
  "phases": [
    {{
      "phase_number": 1,
      "name": "Phase 1: Discovery & Architecture",
      "estimated_hours": 2.5,
      "tasks": ["Task A", "Task B"],
      "dependencies": []
    }},
    {{
      "phase_number": 2,
      "name": "Phase 2: Core Implementation",
      "estimated_hours": 3.5,
      "tasks": ["Task C", "Task D"],
      "dependencies": [1]
    }},
    {{
      "phase_number": 3,
      "name": "Phase 3: Validation & Launch",
      "estimated_hours": 2.0,
      "tasks": ["Task E", "Task F"],
      "dependencies": [2]
    }}
  ],
  "ai_strategic_guidance": "Clear, concise high-leverage execution advice"
}}
Do not wrap in markdown quotes. Return pure JSON only.
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800
            )
            raw = completion.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            phases = [MilestonePhase(**p) for p in data.get("phases", [])]
            guidance = data.get("ai_strategic_guidance", "Execute in strict chronological sequence.")
            crit_path = sum(p.estimated_hours for p in phases)
            return AdvancedGoalPlan(
                user_email=user_email,
                goal=goal,
                target_hours=target_hours,
                critical_path_hours=round(crit_path, 1),
                phases=phases,
                ai_strategic_guidance=guidance
            )
        except Exception:
            pass

    # Deterministic Algorithmic Fallback
    p1_hrs = round(target_hours * 0.3, 1)
    p2_hrs = round(target_hours * 0.5, 1)
    p3_hrs = round(target_hours * 0.2, 1)

    phases = [
        MilestonePhase(
            phase_number=1,
            name=f"Phase 1: Foundations & Scope — {goal[:25]}...",
            estimated_hours=p1_hrs,
            tasks=[
                f"Requirements specification for {goal[:30]}",
                "System architecture & schema definition",
                "Environment & toolchain setup"
            ],
            dependencies=[]
        ),
        MilestonePhase(
            phase_number=2,
            name=f"Phase 2: Core Engineering & Build",
            estimated_hours=p2_hrs,
            tasks=[
                "Implement primary component modules",
                "Data pipeline and service integration",
                "Error boundary and edge case handling"
            ],
            dependencies=[1]
        ),
        MilestonePhase(
            phase_number=3,
            name=f"Phase 3: Quality Assurance & Delivery",
            estimated_hours=p3_hrs,
            tasks=[
                "Unit and integration verification",
                "Performance optimization & review",
                "Final release deployment"
            ],
            dependencies=[2]
        )
    ]

    return AdvancedGoalPlan(
        user_email=user_email,
        goal=goal,
        target_hours=target_hours,
        critical_path_hours=round(p1_hrs + p2_hrs + p3_hrs, 1),
        phases=phases,
        ai_strategic_guidance="Sequential milestone progression: complete Phase 1 before unlocking Phase 2 to prevent rework."
    )
