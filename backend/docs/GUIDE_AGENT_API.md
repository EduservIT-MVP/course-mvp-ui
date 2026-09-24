# Lab Guide Agent API Reference

> **Agent config key:** `AGENT_LAB_GUIDE_URL` (alias: `AGENT_GUIDE_URL`)  
> **Default mock port:** `8003`  
> **Mock endpoint:** `http://localhost:8003/generate-guide`

---

## How the Backend Calls This Agent

```
backend/.env
───────────────────────────────────────────────
AGENT_LAB_GUIDE_URL=http://localhost:8003/generate-guide
```

The Guide Agent has **two distinct sub-calls** that the backend makes at different stages:

| Stage | Function called | URL dispatched to | Response Expected |
|---|---|---|---|
| Plan generation | `agent_generate_guide_plan()` | `AGENT_LAB_GUIDE_URL + "/plan"` | JSON Plan Outline |
| Full guide generation | `agent_generate_guide()` | `AGENT_LAB_GUIDE_URL` (bare) | PDF Binary |

---

## Endpoint 1 — Generate Lab Guide Plan

Called when the instructor clicks "Generate Lab Guide". Returns a structured outline/plan for the learner guide.

**Method:** `POST`  
**URL:** `{AGENT_LAB_GUIDE_URL}/plan` (e.g. `http://localhost:8003/generate-guide/plan`)

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
    "level": "Intermediate",
    "duration": "45 min",
    "persona": "Backend Software Engineers"
  },
  "lab": {
    "raw": "# Kafka Idempotency Lab\n\n## Milestone Tasks\n1. ...",
    "environment": "Node.js 20 / Redis / Kafka",
    "estimated_time": 45,
    "artifacts": []
  },
  "stage": "plan"
}
```

### Response — `200 OK`

- **Content-Type:** `application/json`
- The response **must** be wrapped in a `plan` key.

```json
{
  "plan": {
    "title": "Event-Driven Microservices - Lab Guide Plan",
    "estimated_time": 45,
    "target_audience": "Intermediate",
    "sections": ["Overview", "Setup", "Walkthrough", "Verification"],
    "chapters": [
      {
        "title": "1. Overview & Objectives",
        "desc": "System architecture, Kafka topic topologies, and prerequisite credentials."
      },
      {
        "title": "2. Environment Setup",
        "desc": "Bootstrapping Docker containers and configuring client connection string."
      }
    ],
    "raw": "# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide..."
  }
}
```

---

## Endpoint 2 — Generate Full Learner Guide (PDF)

Called after the instructor approves the guide plan. Returns a PDF binary for the learner guide.

**Method:** `POST`  
**URL:** `AGENT_LAB_GUIDE_URL` (bare root) (e.g. `http://localhost:8003/generate-guide`)

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
    "level": "Intermediate",
    "guide_plan": {
      "title": "Event-Driven Microservices - Lab Guide Plan",
      "chapters": [
        {
          "title": "1. Overview & Objectives",
          "desc": "System architecture, Kafka topic topologies, and prerequisite credentials."
        }
      ]
    }
  },
  "lab": {
    "raw": "# Kafka Idempotency Lab\n\n## Milestone Tasks...",
    "environment": "Node.js 20 / Redis / Kafka",
    "estimated_time": 45,
    "artifacts": []
  }
}
```

### Response — `200 OK`

- **Content-Type:** `application/pdf` (or `application/octet-stream`)
- **Body:** Raw binary bytes of the PDF file

> **What the backend does:** Saves the PDF binary to disk and creates an artifact record for the course.
