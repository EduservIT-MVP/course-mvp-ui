# CourseForge API — single file

Everything lives in **`app.py`**.

## Setup

```bash
cd backend
uv venv
uv pip install -r requirements.txt
copy .env.example .env
uv run python app.py seed
```

## Run

```bash
uv run python app.py
```

| URL | Purpose |
|---|---|
| http://127.0.0.1:8080/health | Health check |
| http://127.0.0.1:8080/docs | **Swagger UI** (interactive API docs) |
| http://127.0.0.1:8080/openapi.json | OpenAPI 3 JSON |
| http://127.0.0.1:8080/openapi.yaml | OpenAPI 3 YAML source |

In Swagger: **Authorize** → paste the JWT from `POST /auth/login` (demo: `instructor@eduservit.local` / `CourseForge123!`).

## Commands

```bash
uv run python app.py seed    # demo users + sample courses
uv run python app.py smoke   # full flow against a running server
uv run python app.py         # start server on :8080
```

## Demo logins

| Email | Password | Role |
|---|---|---|
| `instructor@eduservit.local` | `CourseForge123!` | instructor |
| `admin@eduservit.local` | `CourseForge123!` | admin |
| `reviewer@eduservit.local` | `CourseForge123!` | reviewer |
| `learner@eduservit.local` | `CourseForge123!` | learner |

## Add your agents

In `app.py`, replace these stub functions (search for `AGENT HOOKS`):

- `agent_generate_plan(course)`
- `agent_regenerate_slides(plan, targets, prompt, notes)`
- `agent_build_pptx(course)` → return PPTX `bytes` or `None`
- `agent_generate_lab(course, lab_input)`
- `agent_generate_guide(course, lab)`

Do not change the routes unless the SPA contract changes.

## SPA env

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8080
```
