# Frontend Folder Structure

`
frontend/
├── package.json               # Dependencies and scripts (dev, build, start, lint)
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js runtime configuration
├── postcss.config.mjs         # Tailwind v4 PostCSS configuration
├── public/                    # Static assets (favicons, SVGs)
└── src/
    ├── middleware.ts          # Route protection middleware
    ├── lib/
    │   └── api.ts             # Central API client with fetchWithAuth and auth utilities
    ├── components/            # Reusable UI widgets and modular elements
    └── app/
        ├── layout.tsx         # Root HTML layout with Inter font and global CSS
        ├── globals.css        # Global CSS, CSS variables, Tailwind directives
        ├── page.tsx           # Landing page / marketing page with feature showcase
        ├── auth/
        │   └── page.tsx       # Combined Login and Register tabbed interface
        ├── dashboard/
        │   └── page.tsx       # Main dashboard: live timer, weekly hour map, charts, AI coach
        ├── tasks/
        │   └── page.tsx       # Dedicated task manager: filters, search, manual logs, timers
        └── schedule/
            └── page.tsx       # Dedicated schedule manager and weekly timeline
`
