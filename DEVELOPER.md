# CourseForge — Developer & Agent Integration Guide

Welcome to the CourseForge project!

For complete step-by-step instructions on integrating standalone agent microservices (PPTX Agent, Lab Agent, Lab Guide Agent) with the CourseForge backend, please see the dedicated developer guide:

👉 **[backend/DEVELOPER.md](backend/DEVELOPER.md)**

---

## Quick Reference: The 3 Agent Endpoints

| Agent | Environment Variable | Expected Output | Purpose |
| :--- | :--- | :--- | :--- |
| **PPTX Agent** | `AGENT_PPTX_URL` | Binary (`application/vnd.openxmlformats-officedocument.presentationml.presentation`) | Assembles `.pptx` presentations |
| **Lab Agent** | `AGENT_LAB_URL` | JSON (`{ "lab": { "scenario": ..., "tasks": [...], "code": ... } }`) | Generates practical lab exercises & rubrics |
| **Lab Guide Agent** | `AGENT_LAB_GUIDE_URL` | JSON (`{ "guide": { "title": ..., "pages": [...] } }`) | Generates step-by-step lab walkthrough documentation |

---

## Quick Start for Agent Developers

1. **Configure your endpoints in `backend/.env`**:
   ```env
   AGENT_PPTX_URL=http://localhost:8001/build-pptx
   AGENT_LAB_URL=http://localhost:8002/generate-lab
   AGENT_LAB_GUIDE_URL=http://localhost:8003/generate-guide
   ```
2. **Inspect the reference implementation**:
   See `backend/mock_agents_server.py` for working examples of all three endpoints.
3. **Verify with the end-to-end smoke test**:
   ```bash
   cd backend
   uv run python app.py smoke
   ```
