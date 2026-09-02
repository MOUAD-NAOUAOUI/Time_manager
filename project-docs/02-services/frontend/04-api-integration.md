# Frontend API Integration

## 1. Central API Utility (src/lib/api.ts)
All communication with the Spring Boot backend is routed through src/lib/api.ts.

### Key Functions
- etchWithAuth(url, options): Intercepts outgoing requests, reads the 	oken from localStorage, attaches Authorization: Bearer <token>, and safely wraps responses. If a network failure occurs, it catches the error and returns a graceful HTTP 503 response.
- logout(navigate): Clears authentication tokens and redirects the user to /auth.

## 2. Endpoints Called from Frontend
`	ypescript
// Tasks API
GET    /tasks?email={email}
POST   /tasks
PUT    /tasks/{id}
PATCH  /tasks/{id}/status?email={email}
DELETE /tasks/{id}

// Sessions API
POST   /sessions (start focus session)
PUT    /sessions/{id}/stop (stop session, record actual time)
GET    /sessions/active?email={email} (restore running timer on refresh)

// Schedule API
GET    /schedule/weekly?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
POST   /schedule/generate

// Analytics & AI
GET    /analytics/dashboard?email={email}
POST   /ai/coach
POST   /ai/decompose
`
