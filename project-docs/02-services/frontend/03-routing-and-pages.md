# Frontend Routing & Pages

## 1. Routing Table
| Path | Component File | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| / | src/app/page.tsx | No | Public landing page explaining features and CTA to login |
| /auth | src/app/auth/page.tsx | No | Auth portal supporting Login and Registration with instant redirect |
| /dashboard | src/app/dashboard/page.tsx | Yes | Comprehensive control center with metrics, live timer, weekly map, charts, and AI coach |
| /tasks | src/app/tasks/page.tsx | Yes | Granular task list, create modal, edit modal, manual time logging, and focus sessions |
| /schedule | src/app/schedule/page.tsx | Yes | Weekly schedule planner and calendar block visualizer |

## 2. Route Protection (src/middleware.ts)
Next.js middleware checks for the presence of the authentication token in cookies or headers:
- Unauthenticated requests to /dashboard, /tasks, or /schedule are redirected to /auth.
- Authenticated requests to /auth are redirected directly to /dashboard.
