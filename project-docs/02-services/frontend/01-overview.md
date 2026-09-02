# Frontend Service Overview

## 1. Responsibilities
The Frontend is a Next.js 16 (React 19) single-page / server-rendered hybrid application located in rontend/. Its key responsibilities include:
- **User Authentication**: Login, registration, token persistence in \localStorage\ and cookie sync for middleware.
- **Real-Time Focus Session Interface**: Live timer calculation, remaining time countdown, visual progress bars, and overtime interception modals.
- **Task Management**: CRUD operations on user tasks, priority assignment, category tagging, manual time logging, and inline completion toggling.
- **Interactive Schedule Matrix**: 24/7 weekly hour matrix visualizing planned focus blocks, completed work, and incomplete items.
- **Productivity Visualizations**: Weekly focus time bar charts, task distribution donuts, and historical completion trends using Recharts.
- **AI Coaching Interface**: Renders real-time AI evaluation, actionable tips, and automated goal decomposition.

## 2. Technology Stack & Key Libraries
- **Framework**: Next.js 16.3.1 (React 19.2.8)
- **Styling**: Tailwind CSS v4 with custom color palette
- **Icons**: \lucide-react- **Charts**: echarts\ v3.10.1
- **HTTP Client**: Native \etch\ wrapped with authorization interceptor (\src/lib/api.ts\)
