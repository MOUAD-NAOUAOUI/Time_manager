# Key Data Flows

## 1. Time Session Completion Flow
1. User starts session: `time_sessions` row created with `start_time = NOW()`; related `tasks.status` set to `in_progress`.
2. Timer runs in client browser.
3. User completes session:
   - `time_sessions.end_time` set to `NOW()`.
   - `duration_minutes` computed.
   - `tasks.actual_minutes_spent += duration_minutes`.
   - If marked finished: `tasks.status = 'completed'`; otherwise `tasks.status = 'pending'`.

## 2. AI Schedule Generation Flow
1. User requests weekly schedule optimization from frontend.
2. Spring Boot reads user's pending `tasks` from database.
3. Payload sent to FastAPI `/api/v1/schedule/optimize`.
4. Constraint solver computes non-overlapping hourly slots.
5. Spring Boot saves new `schedules` and child `schedule_time_blocks` in a single transaction.
