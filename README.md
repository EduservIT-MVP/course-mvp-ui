# EduServit · CourseForge

React SPA for the CourseForge workflow: login, course brief, PPT agent, lab generation, and lab guide.

> 🛠️ **Agent Developers**: To integrate your standalone agent servers (PPTX, Lab, Lab Guide), see the [**Agent Integration Guide (DEVELOPER.md)**](DEVELOPER.md).
> 🐳 **Docker Users**: To run the entire stack with Docker Compose, see the [**Dockerization Guide (DOCKER.md)**](DOCKER.md).

## Requirements

- Node.js 18+ (20+ recommended)
- npm
- Or Docker & Docker Compose (see [DOCKER.md](DOCKER.md))

## Run with Docker (Fastest)

```bash
docker compose up --build -d
docker compose exec backend python app.py seed
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## Run locally (Without Docker)

Start the Flask API first, then run the React app.

```bash
cd backend
uv venv
uv pip install -r requirements.txt
uv run python app.py seed
uv run python app.py

# In a second terminal
cd ..
npm install
npm run dev
```

Open the URL Vite prints, usually:

- http://localhost:5173/

If that port is busy, Vite uses the next one (for example `5174`).

### Walk the UI

1. Sign in
2. **Create course**
3. Fill the brief → **Generate presentation**
4. PPT agent: review slides, tag a slide, enter a prompt, **Regenerate tagged slide**, or **Download PPT**
5. **Generate lab**
6. **Generate lab guide**
7. **Download All** on the complete screen

All account, course, workflow, and artifact data comes from the Flask API.

## Environment

Copy `.env.example` to `.env` if you do not already have one.

The app uses `http://127.0.0.1:8080` by default, so this file is only needed to override the API location.

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_API_PROXY_TARGET=http://localhost:8080
```

Restart `npm run dev` after changing `.env`.

## Connect a real REST API

If the API does not allow browser CORS, proxy through Vite:

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=https://your-api.example.com
```

Login uses `POST {API}/auth/login` with the email and password you type.

## Other commands

```bash
npm run build      # production build
npm run preview    # serve the production build
npm run lint       # oxlint
```

## Troubleshooting

- **Login error about `VITE_API_BASE_URL`:** set the Flask API URL in `.env` and restart the dev server.
- **Port already in use:** use the alternate localhost port Vite prints.
- **Stale UI after env change:** stop the terminal (`Ctrl+C`) and run `npm run dev` again, then hard-refresh the browser.
