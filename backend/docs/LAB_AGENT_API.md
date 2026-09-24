# Lab Agent API Reference

> **Agent config key:** `AGENT_LAB_URL`  
> **Default mock port:** `8002`  
> **Mock endpoint:** `http://localhost:8002/generate-lab`

---

## How the Backend Calls This Agent

```
backend/.env
───────────────────────────────────────────────
AGENT_LAB_URL=http://localhost:8002/generate-lab
```

The Lab Agent has **two distinct sub-calls** that the backend makes at different stages:

| Stage | Function called | URL dispatched to |
|---|---|---|
| Plan generation | `agent_generate_lab_plan()` | `AGENT_LAB_URL + "/plan"` |
| Full lab generation | `agent_generate_lab()` | `AGENT_LAB_URL` (bare) |

---

## Endpoint 1 — Generate Lab Plan

Called when the instructor initiates Lab generation. The agent should return a structured lab outline and metadata.

**Method:** `POST`  
**URL:** `{AGENT_LAB_URL}/plan` (e.g. `http://localhost:8002/generate-lab/plan`)

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
    "description": "Architecting resilient distributed event-driven systems using Apache Kafka and Node.js.",
    "topics": "Event Sourcing\nCQRS\nKafka Consumer Groups\nIdempotency",
    "objectives": "Implement Kafka consumer idempotency\nHandle rebalancing and poisoned pills",
    "level": "Intermediate",
    "duration": "45 min",
    "language": "English",
    "category": "Cloud & Distributed Systems",
    "persona": "Backend Software Engineers",
    "prerequisites": "Working knowledge of Node.js and Docker fundamentals",
    "status": "PPT_READY"
  }
}
```

### Response — `200 OK`

- **Content-Type:** `application/json`
- The response **must** be wrapped in a `lab` key.

```json
{
  "lab": {
    "title": "Event-Driven Microservices with Kafka Lab",
    "scenario": "Event-Driven Microservices with Kafka Guided Exercise",
    "environment": "Node.js / Express",
    "estimated_time": 45,
    "raw": "# Lab Plan\n\n**Summary:** This lab provides a guided, hands-on coding scenario."
  }
}
```

---

## Endpoint 2 — Generate Lab Exercises & Code Artifacts

Called after the plan is approved. The agent returns the final lab metadata and optional code artifacts.

**Method:** `POST`  
**URL:** Value of `AGENT_LAB_URL` (e.g. `http://localhost:8002/generate-lab`)

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
    "lab_plan": {
      "title": "Event-Driven Microservices with Kafka Lab",
      "scenario": "Event-Driven Microservices with Kafka Guided Exercise",
      "environment": "Node.js / Express",
      "estimated_time": 45,
      "raw": "# Lab Plan\n\n**Summary:** This lab provides a guided, hands-on coding scenario."
    }
  }
}
```

### Response — `200 OK`

- **Content-Type:** `application/json`
- The response **must** be wrapped in a `lab` key.

```json
{
  "lab": {
    "raw": "# Kafka Idempotency Lab\n\n**Summary:** This lab provides a guided, hands-on coding scenario.\n\n## Milestone Tasks\n1. Launch containers: `docker-compose up -d`\n2. Implement Redis deduplication check in `consumer.js`\n3. Run tests: `npm test`",
    "environment": "Node.js 20 / Redis / Kafka",
    "estimated_time": 45,
    "artifacts": [
      {
        "name": "consumer.js",
        "label": "Starter Consumer Implementation",
        "type": "lab-starter",
        "mime_type": "text/javascript",
        "content": "const { Kafka } = require('kafkajs');\n// TODO: Add deduplication logic\n"
      },
      {
        "name": "test_consumer.js",
        "label": "Automated Verification Test Suite",
        "type": "lab-test",
        "mime_type": "text/javascript",
        "content": "const assert = require('assert');\ndescribe('Idempotency', () => { ... });\n"
      },
      {
        "name": "docker-compose.yml",
        "label": "Local Docker Environment",
        "type": "lab-config",
        "mime_type": "text/yaml",
        "content": "version: '3.8'\nservices:\n  kafka:\n    image: confluentinc/cp-kafka:latest\n"
      }
    ]
  }
}
```

### Artifact Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `artifacts[].name` | `string` | ✅ Yes | Exact filename including extension (e.g. `consumer.js`) |
| `artifacts[].label` | `string` | ✅ Yes | Friendly display name for the UI download list |
| `artifacts[].type` | `string` | ✅ Yes | Category: `lab-starter`, `lab-test`, or `lab-config` |
| `artifacts[].mime_type` | `string` | ✅ Yes | Standard MIME type (e.g. `text/javascript`, `text/yaml`) |
| `artifacts[].content` | `string` | ✅ Yes | Raw file content as a string |

> **What the backend does:** Saves `lab.raw`, `lab.environment`, and `lab.estimated_time` to `course.lab` in the DB. Iterates over `lab.artifacts` and writes each as an `Artifact` record to DB and disk. Sets `status = "LAB_REVIEW"`.
