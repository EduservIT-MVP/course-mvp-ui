# PPT Agent API Reference

> **Agent config key:** `AGENT_PPTX_URL` (alias: `AGENT_PPT_URL`)  
> **Default mock port:** `8001`  
> **Mock endpoint:** `http://localhost:8001/build-pptx`

---

## How the Backend Calls This Agent

```
backend/.env
───────────────────────────────────────────────
AGENT_PPTX_URL=http://localhost:8001/build-pptx
```

*Note: The backend generates the presentation plan locally. The external agent is only called for the final PPTX generation.*

## Endpoint — Generate PPTX Binary File

Called after the instructor approves the plan. The backend sends the course details (which include the approved `ppt_plan`) and expects a `.pptx` binary in return.

**Method:** `POST`  
**URL:** Value of `AGENT_PPTX_URL` (e.g. `http://localhost:8001/build-pptx`)

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
    "status": "PPT_PLAN_REVIEW",
    "ppt_plan": {
      "summary": "Event-Driven Microservices · 45 min · Intermediate · 6 slides",
      "sections": 6,
      "slides": [
        {
          "id": 1,
          "title": "1. Core Concept",
          "kicker": "FOUNDATION",
          "heading": "Event Streaming vs Request-Response",
          "body": "• Async event logs replace HTTP coupling.\n• Producers emit immutable state events.",
          "notes": "Introduce the motivation."
        }
      ]
    }
  }
}
```

### Course Brief Field Reference

| Field | Type | Description |
|---|---|---|
| `course.id` | `string (uuid)` | Unique course identifier |
| `course.title` | `string` | Course title |
| `course.description` | `string` | Full course description |
| `course.topics` | `string` | Newline-separated list of topics |
| `course.objectives` | `string` | Newline-separated learning objectives |
| `course.level` | `string` | `Beginner`, `Intermediate`, or `Advanced` |
| `course.duration` | `string` | Estimated total duration (e.g. `"45 min"`) |
| `course.language` | `string` | Language of instruction |
| `course.category` | `string` | Course category / domain |
| `course.persona` | `string` | Target learner persona |
| `course.prerequisites` | `string` | Required prior knowledge |
| `course.ppt_plan` | `object` | The approved presentation plan, containing `slides` |

### Response — `200 OK`

- **Content-Type:** `application/vnd.openxmlformats-officedocument.presentationml.presentation` (or `application/octet-stream`)
- **Body:** Raw binary bytes of the `.pptx` file

> **What the backend does:** Saves the binary to disk as an artifact, converts slides to images for preview, writes an `Artifact` record (type: `ppt`) to the database, and sets `status = "PPT_READY"`.

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `AGENT_PPTX_URL` | Full URL to the PPT agent endpoint |
| `AGENT_TIMEOUT_SECONDS` | Max wait time for agent response (default: `30`) |
