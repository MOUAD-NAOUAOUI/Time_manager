# Frontend State Management

## 1. State Architecture
The frontend uses standard React hooks (useState, useEffect, useCallback, useMemo) combined with optimistic UI updates for instant feedback.

## 2. Key State Elements (Dashboard & Tasks Pages)
- **Active Focus Session**:
  - ctiveSession: Holds the active 	ask.id (or 
ull).
  - sessionId: Holds the backend database UUID of the active TimeSession.
  - elapsed: Real-time seconds elapsed in the active browser session.
  - ctualMinutesSpent: Total minutes previously persisted in the database.
- **Overtime Detection & Time-Up Modal**:
  - showTimeUpModal: Boolean triggering the overtime dialogue when 
emainingTime <= 0.
  - 	imeUpTask: Reference to the task whose allotted time has expired.
  - hasPrompted: Guard flag preventing recurring popups for the same session.
- **Weekly Hour Grid Data**:
  - Matrix organized by dateKey (e.g. 2026-08-30) and 24 hour slots.
  - Utilizes ormatLocalDate(date) to prevent UTC midnight date shift bugs.
