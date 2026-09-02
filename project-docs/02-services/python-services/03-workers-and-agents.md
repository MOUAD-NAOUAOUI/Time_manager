# AI Engines & Specialized Modules

## 1. Internal Services in `services/`

### `coach_engine.py`
- Formulates multi-shot prompts analyzing user habits (e.g. high plan vs low execution ratio).
- Calls Groq API to return structured JSON containing summary, recommendations, and urgency ratings.

### `constraint_scheduler.py`
- Implements heuristic constraint satisfaction algorithms to distribute tasks across available hours, avoiding high-energy tasks during typical user fatigue windows.

### `goal_decomposer.py`
- Takes open-ended prompts (e.g., "Study for Physics Exam") and returns a structured tree of 3-7 subtasks with estimated minutes and priority.

### `productivity_scorer.py`
- Computes deterministic baseline scores (0-100) combining completion rate, session adherence, and consistency.

### `memory_service.py` & `embeddings_service.py`
- Handles semantic retrieval for context injection during chat and coaching sessions.
