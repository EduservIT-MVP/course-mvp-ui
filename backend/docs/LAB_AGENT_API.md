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

The backend calls `agent_generate_lab(course, lab_input)` which POSTs to `AGENT_LAB_URL`.

---

## Endpoint — Generate Lab Exercises & Code Artifacts

Called when the instructor triggers Lab generation. The agent should return a lab specification, estimated time, environment info, and optionally a list of code/config artifact files.

**Method:** `POST`  
**URL:** Value of `AGENT_LAB_URL` (e.g. `http://localhost:8002/generate-lab`)

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
  },
  "lab_input": {
    "scenario": "Implement Idempotent Consumer in Node.js",
    "environment": "Node.js 20 / Docker",
    "assets": "Kafka starter container"
  }
}
```

### Request Field Reference

| Field | Parent | Type | Description |
|---|---|---|---|
| `course` | — | `object` | Full course brief (see PPT_AGENT_API.md for all course fields) |
| `lab_input.scenario` | `lab_input` | `string` | Optional: user-defined scenario for the lab |
| `lab_input.environment` | `lab_input` | `string` | Optional: tech stack/environment override |
| `lab_input.assets` | `lab_input` | `string` | Optional: asset or starter resources hint |

> `lab_input` can be an empty object `{}` if no extra context is provided by the user.

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

### Response Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `lab` | `object` | ✅ Yes | Root wrapper key — backend unwraps this |
| `lab.raw` | `string` | ✅ Yes | Markdown lab instructions displayed in the Lab Review screen |
| `lab.environment` | `string` | ✅ Yes | Tech stack string shown in the UI metadata bar |
| `lab.estimated_time` | `integer` | ✅ Yes | Expected duration in minutes shown in UI metadata bar |
| `lab.artifacts` | `array` | ⚠️ Optional | Code/config files to persist. Backend saves each to disk & DB. |
| `artifacts[].name` | `string` | ✅ Yes (if array given) | Exact filename including extension (e.g. `consumer.js`) |
| `artifacts[].label` | `string` | ✅ Yes | Friendly display name for the UI download list |
| `artifacts[].type` | `string` | ✅ Yes | Category: `lab-starter`, `lab-test`, or `lab-config` |
| `artifacts[].mime_type` | `string` | ✅ Yes | Standard MIME type (e.g. `text/javascript`, `text/yaml`) |
| `artifacts[].content` | `string` | ✅ Yes | Raw file content as a string |

> **What the backend does:** Saves `lab.raw`, `lab.environment`, and `lab.estimated_time` to `course.lab` in the DB. Iterates over `lab.artifacts` and writes each as an `Artifact` record to DB and disk. Sets `status = "LAB_REVIEW"`.

---

## Artifact Type Reference

| `type` value | Description |
|---|---|
| `lab-starter` | Boilerplate / skeleton code for the learner to complete |
| `lab-test` | Automated test suite to validate learner work |
| `lab-config` | Config files (Dockerfile, docker-compose.yml, etc.) |

---

## Response Validation Rules (Backend-enforced)

The backend (`lab_agent.py`) validates the response as follows:

```python
# Valid response: must be a dict with a "lab" key that is also a dict
if isinstance(res, dict) and "lab" in res and isinstance(res["lab"], dict):
    return res["lab"]
# Fallback: any top-level dict is accepted as-is
if isinstance(res, dict):
    return res
# Any other shape raises ValueError
```

This means you can **optionally skip the `lab` wrapper** and return the fields at the top level, but wrapping in `lab` is strongly recommended for clarity.

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `AGENT_LAB_URL` | Full URL to the Lab agent endpoint |
| `AGENT_TIMEOUT_SECONDS` | Max wait time for agent response (default: `30`) |
