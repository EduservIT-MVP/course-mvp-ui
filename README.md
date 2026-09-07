# EduServit · CourseForge

React SPA for the CourseForge workflow: login, course brief, PPT agent, lab generation, and lab guide.

## Requirements

- Node.js 18+ (20+ recommended)
- npm

## Run locally (UI preview)

This is the default. No external API is required.

```bash
cd eduservit
npm install
npm run dev
```

Open the URL Vite prints, usually:

- http://localhost:5173/

If that port is busy, Vite uses the next one (for example `5174`).

### Sign in (preview)

The login form is prefilled.

| Email | Password | Role |
|---|---|---|
| `instructor@eduservit.local` | `CourseForge123!` | instructor |
| `admin@eduservit.local` | `CourseForge123!` | admin |
| `reviewer@eduservit.local` | `CourseForge123!` | reviewer |
| `learner@eduservit.local` | `CourseForge123!` | learner |

### Walk the UI

1. Sign in
2. **Create course**
3. Fill the brief → **Generate presentation**
4. PPT agent: review slides, tag a slide, enter a prompt, **Regenerate tagged slide**, or **Download PPT**
5. **Generate lab**
6. **Generate lab guide**
7. **Download All** on the complete screen

Preview data is stored in the browser (`localStorage`). Refresh keeps the current course status.

## Environment

Copy `.env.example` to `.env` if you do not already have one.

```env
# UI preview (default)
VITE_USE_MOCK=true
VITE_API_BASE_URL=

# Real REST API (later)
# VITE_USE_MOCK=false
# VITE_API_BASE_URL=https://your-api.example.com
# VITE_API_PROXY_TARGET=https://your-api.example.com
```

Restart `npm run dev` after changing `.env`.

## Connect a real REST API

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://your-api.example.com
```

If the API does not allow browser CORS, proxy through Vite:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=https://your-api.example.com
```

Login then uses `POST {API}/auth/login` with the email and password you type. No demo users are used in this mode.

## Other commands

```bash
npm run build      # production build
npm run preview    # serve the production build
npm run lint       # oxlint
```

## Troubleshooting

- **Blank login error about `VITE_API_BASE_URL`:** set `VITE_USE_MOCK=true` and restart the dev server.
- **Port already in use:** use the alternate localhost port Vite prints.
- **Stale UI after env change:** stop the terminal (`Ctrl+C`) and run `npm run dev` again, then hard-refresh the browser.
