import os
from dotenv import load_dotenv

load_dotenv()

# Environment & API Configurations
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", 8000)))

# Productivity & Energy Windows Mapping
# Clock hours 0-23 mapped to cognitive capacity
ENERGY_WINDOWS = {
    6: "light", 7: "light", 8: "light",
    9: "deep", 10: "deep", 11: "deep",
    12: "light",
    13: "medium", 14: "medium",
    15: "deep", 16: "deep",
    17: "medium", 18: "medium", 19: "medium",
    20: "light", 21: "light", 22: "light", 23: "light",
}

# Task Urgency & Priority Scoring Weights
PRIORITY_WEIGHTS = {
    "high": 3,
    "medium": 2,
    "low": 1
}

ENERGY_SCORE_WEIGHTS = {
    "deep": 3,
    "medium": 2,
    "light": 1
}

# Work Week Constants
STANDARD_WORK_WEEK_MINUTES = 40 * 60 # 2400 minutes
DEFAULT_TASK_DURATION_MINUTES = 30
