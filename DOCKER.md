# EduServ IT — Docker Deployment Guide

This guide covers running the full EduServ IT (CourseForge) stack using Docker Compose, swapping mock agents with real ones, and common operational commands.

---

## 1. Prerequisites — Install Docker

### Option A: Docker Desktop (Official)
1. Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Choose **Apple silicon** (M1/M2/M3/M4) or **Intel** based on your Mac
3. Open the `.dmg`, drag Docker to Applications, launch it once
4. Verify:
   ```bash
   docker --version
   docker compose version
   ```

### Option B: OrbStack (Lighter Alternative)
```bash
brew install --cask orbstack
```
Start OrbStack once from Applications, then verify with the same commands above.

---

## 2. Stack Architecture

```
Browser (http://localhost:5173)
        │
        ▼
  ┌─────────────────────────────────┐
  │  frontend  (Nginx:80 → :5173)   │  React SPA — Vite Production Build
  └────────────────┬────────────────┘
                   │ HTTP API calls
                   ▼
  ┌─────────────────────────────────┐
  │  backend   (Gunicorn → :8080)   │  Flask REST API + Swagger UI
  └──────┬──────────────────┬───────┘
         │                  │
         ▼                  ▼
  ┌────────────┐    ┌──────────────────────┐
  │   redis    │    │   mock-agents        │  Simulates PPT / Lab / Guide agents
  │ (broker)   │    │   :8001 :8002 :8003  │  Replace with real agents in .env
  └────────────┘    └──────────────────────┘
         │
         ▼
  ┌─────────────┐
  │   worker    │  Celery background task runner (generation jobs)
  └─────────────┘
         │
         ▼
  ╔═════════════════════╗
  ║  courseforge_data   ║  Docker named volume (SQLite DB + Artifacts)
  ╚═════════════════════╝
```

| Container | Host Port | Description |
|---|---|---|
| `courseforge-frontend` | `5173` | React SPA (Nginx Alpine) |
| `courseforge-backend` | `8080` | Flask API + Swagger UI |
| `courseforge-worker` | — | Celery worker (no exposed port) |
| `courseforge-redis` | `6379` | Redis message broker |
| `courseforge-mock-agents` | `8001, 8002, 8003` | Mock agent microservices |

---

## 3. Quick Start

From the project root (`course-mvp-ui/`):

```bash
# Step 1: Build and start all containers in detached mode
docker compose up --build -d

# Step 2: Seed demo users and sample courses
docker compose exec backend python app.py seed

# Step 3: Run smoke test to verify everything is connected
docker compose exec backend python app.py smoke
```

### Expected smoke test output:
```
Smoke test completed successfully.
SMOKE OK
```

---

## 4. Access the Application

Once running:

| URL | Description |
|---|---|
| [http://localhost:5173](http://localhost:5173) | Web Application |
| [http://localhost:8080/docs](http://localhost:8080/docs) | Swagger UI (Interactive API Docs) |
| [http://localhost:8080/health](http://localhost:8080/health) | Backend Health Check |
| `http://localhost:8001/build-pptx` | Mock PPT Agent |
| `http://localhost:8002/generate-lab` | Mock Lab Agent |
| `http://localhost:8003/generate-guide` | Mock Lab Guide Agent |

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Trainer | `trainer@eduserv.com` | `Trainer#2026` |
| Admin | `admin@eduserv.com` | `Admin#2026` |
| Reviewer | `reviewer@eduserv.com` | `Reviewer#2026` |

---

## 5. Swapping Mock Agents with Real Agents

The mock agents are only used for local development and testing. When your real AI agent servers are ready, point the backend to them by setting env vars.

### Step 1: Create a `.env` file at the project root

Copy `.env.docker.example` as a starting point:
```bash
cp .env.docker.example .env
```

### Step 2: Set your real agent URLs

```ini
# .env (project root)

SECRET_KEY=your-production-secret-key
JWT_SECRET_KEY=your-production-jwt-secret-key

# Option A: Real agents on the same host machine
AGENT_PPTX_URL=http://host.docker.internal:9001/build-pptx
AGENT_LAB_URL=http://host.docker.internal:9002/generate-lab
AGENT_LAB_GUIDE_URL=http://host.docker.internal:9003/generate-guide

# Option B: Real agents on a remote server or cloud
# AGENT_PPTX_URL=https://ppt-agent.yourcompany.com/build-pptx
# AGENT_LAB_URL=https://lab-agent.yourcompany.com/generate-lab
# AGENT_LAB_GUIDE_URL=https://guide-agent.yourcompany.com/generate-guide

AGENT_TIMEOUT_SECONDS=120
```

### Step 3: Restart only the backend and worker

```bash
docker compose up -d backend worker
```

> The `mock-agents` service will still run but won't be called since the env vars override it.

> To fully disable mock agents, remove the `mock-agents` service from `docker-compose.yml` and remove the `AGENT_*_URL` defaults that point to it.

---

## 6. Common Operations

### View Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f mock-agents
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart one service
docker compose restart backend
docker compose restart worker
```

### Open a Shell Inside a Container

```bash
# Backend
docker compose exec backend bash

# Frontend (Nginx)
docker compose exec frontend sh
```

### Stop & Clean Up

```bash
# Stop containers (keeps data volume)
docker compose down

# Stop containers + delete all data (full reset)
docker compose down -v
```

### Rebuild After Code Changes

```bash
docker compose up --build -d
```

---

## 7. Environment Variables Reference

Set these in a `.env` file at the project root (copied from `.env.docker.example`).

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-change-me` | Flask session secret — **change in production** |
| `JWT_SECRET_KEY` | `dev-jwt-secret-change-me` | JWT signing key — **change in production** |
| `AGENT_PPTX_URL` | `http://mock-agents:8001/build-pptx` | PPT Agent endpoint |
| `AGENT_LAB_URL` | `http://mock-agents:8002/generate-lab` | Lab Agent endpoint |
| `AGENT_LAB_GUIDE_URL` | `http://mock-agents:8003/generate-guide` | Lab Guide Agent endpoint |
| `AGENT_TIMEOUT_SECONDS` | `120` | Max seconds to wait for an agent response |
| `REQUIRE_AGENT_ENDPOINTS` | `false` | Set to `true` to fail startup if agent URLs are missing |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Browser-accessible backend URL for the React app |
