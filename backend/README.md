# CourseForge API — Modular Backend Architecture

A clean, modular Flask backend designed for maintainability and clear separation of concerns.

> 🛠️ **Agent Integration Guide**: See [**DEVELOPER.md**](DEVELOPER.md) for full endpoint contracts, request/response JSON schemas, and code samples for integrating PPTX, Lab, and Lab Guide agents.

---

## Directory Architecture

```
backend/
├── app.py                      # Application entry point, app factory & CLI runner
├── config.py                   # Centralized configuration, environment variables & paths
├── extensions.py               # Shared SQLAlchemy and JWTManager instances
├── commands.py                 # CLI database seeding (seed) and smoke testing (smoke)
├── mock_agents_server.py       # Standalone mock agent server for local end-to-end testing
│
├── models/                     # Database Models & State Machines
│   ├── __init__.py             # Exports User, Course, Artifact, ROLE_PERMISSIONS
│   ├── user.py                 # User model, password hashing & permissions
│   ├── course.py               # Course model & status transition state machine
│   └── artifact.py             # Artifact model and serialization
│
├── auth/                       # Security & Authorization
│   ├── __init__.py             # Exports require_auth, require_permission, current_user
│   └── security.py             # JWT error handlers, current user context & RBAC decorator
│
├── agents/                     # External Agent Microservices Clients
│   ├── __init__.py             # Exports agent integration functions
│   ├── client.py               # HTTP dispatch helpers (_call_agent_json, _call_agent_binary)
│   ├── pptx_agent.py           # PPTX Agent integration & template resolver
│   ├── lab_agent.py            # Lab Agent integration & task structuring
│   ├── guide_agent.py          # Lab Guide Agent integration & documentation structuring
│   └── plan_agent.py           # Course curriculum plan generation & slide regeneration
│
├── services/                   # Business Services & Background Jobs
│   ├── __init__.py
│   ├── artifact_service.py     # File artifact persistence & slide preview rendering
│   └── job_service.py          # Async thread jobs (plan, ppt, lab, guide)
│
└── routes/                     # Modular Flask Blueprints
    ├── __init__.py             # Blueprint registration helper
    ├── auth_routes.py          # /auth/signup, /auth/login, /auth/me
    ├── course_routes.py        # /courses CRUD & action endpoints
    ├── artifact_routes.py      # /courses/<id>/artifacts, /courses/<id>/ppt, slide previews
    └── system_routes.py        # /health, /openapi.json, /openapi.yaml, /docs
```

---

## Getting Started

### 1. Setup Environment
```bash
cd backend
uv venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
cp .env.example .env
```

### 2. Seed Database
```bash
uv run python app.py seed
```

### 3. Run Backend Server
```bash
uv run python app.py
```
API runs on `http://127.0.0.1:8080`.

| URL | Purpose |
|---|---|
| `http://127.0.0.1:8080/health` | Service and agent endpoints health check |
| `http://127.0.0.1:8080/docs` | **Swagger UI** (interactive API documentation) |
| `http://127.0.0.1:8080/openapi.json` | OpenAPI 3 JSON specification |
| `http://127.0.0.1:8080/openapi.yaml` | OpenAPI 3 YAML specification |

---

## Agent Microservice Configuration

Each agent runs on its own separate server and is configured via environment variables in `.env`:

| Agent | Environment Variable | Default Local Mock URL |
| :--- | :--- | :--- |
| **PPTX Agent** | `AGENT_PPTX_URL` | `http://localhost:8001/build-pptx` |
| **Lab Agent** | `AGENT_LAB_URL` | `http://localhost:8002/generate-lab` |
| **Lab Guide Agent** | `AGENT_LAB_GUIDE_URL` | `http://localhost:8003/generate-guide` |

### Testing with Standalone Mock Agents
Start the mock agent servers in a separate terminal:
```bash
uv run python mock_agents_server.py
```
Then run the end-to-end smoke test:
```bash
uv run python app.py smoke
```

---

## CLI Commands

```bash
uv run python app.py         # Start Flask development server on :8080
uv run python app.py seed    # Seed demo users and sample courses
uv run python app.py smoke   # Run full end-to-end flow test against running server
```

---

## Demo Accounts

| Email | Password | Role |
|---|---|---|
| `instructor@eduservit.local` | `CourseForge123!` | instructor |
| `admin@eduservit.local` | `CourseForge123!` | admin |
| `reviewer@eduservit.local` | `CourseForge123!` | reviewer |
| `learner@eduservit.local` | `CourseForge123!` | learner |
