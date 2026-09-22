# PPT Agent API Reference

> **Agent config key:** `AGENT_PPTX_URL` (alias: `AGENT_PPT_URL`)  
> **Default mock port:** `8001`  
> **Mock endpoint:** `http://localhost:8001/build-pptx`

---

## How the Backend Calls This Agent

The backend dispatches **all PPT requests** to the single URL set in `AGENT_PPTX_URL`. The **same URL** is used for both plan generation and final PPTX generation — the difference is what payload fields are included.

```
backend/.env
───────────────────────────────────────────────
AGENT_PPTX_URL=http://localhost:8001/build-pptx
```

---

## Endpoint 1 — Generate Presentation Plan

The backend calls this first when the instructor submits a course. The agent should return a structured slide outline. **No binary is expected here.**

**Method:** `POST`  
**URL:** Value of `AGENT_PPTX_URL` (e.g. `http://localhost:8001/build-pptx`)

> Note: The backend calls `agent_generate_ppt_plan()` which passes `{ "course": course }` to `AGENT_PPTX_URL`. If you want to separate plan vs generate on your agent side, route internally using a field in the payload.

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
    "status": "PPT_PLAN_REVIEW"
  }
}
```

### Course Brief Field Reference

| Field | Type | Description |
|---|---|---|
| `id` | `string (uuid)` | Unique course identifier |
| `title` | `string` | Course title |
| `description` | `string` | Full course description |
| `topics` | `string` | Newline-separated list of topics |
| `objectives` | `string` | Newline-separated learning objectives |
| `level` | `string` | `Beginner`, `Intermediate`, or `Advanced` |
| `duration` | `string` | Estimated total duration (e.g. `"45 min"`) |
| `language` | `string` | Language of instruction |
| `category` | `string` | Course category / domain |
| `persona` | `string` | Target learner persona |
| `prerequisites` | `string` | Required prior knowledge |
| `status` | `string` | Current workflow status of the course |

### Response — `200 OK`

- **Content-Type:** `application/json`

```json
{
  "summary": "Event-Driven Microservices · 45 min · Intermediate · 6 slides",
  "sections": 6,
  "duration": "30 min",
  "raw": "# Presentation Outline\n\n** Core Concept **\n- Event streaming vs traditional request-response\n- Decoupling producers and consumers\n\n** Architecture **\n- Kafka Brokers, Topics, Partitions",
  "slides": [
    {
      "id": 1,
      "title": "1. Core Concept",
      "kicker": "FOUNDATION",
      "heading": "Event Streaming vs Request-Response",
      "body": "• Asynchronous event logs replace point-to-point HTTP coupling.\n• Producers emit immutable state events without knowing downstream consumers.",
      "notes": "Introduce the motivation. Emphasize why REST fails under high event throughput."
    },
    {
      "id": 2,
      "title": "2. Architecture & Design",
      "kicker": "ARCHITECTURE",
      "heading": "Kafka Broker Topology",
      "body": "• Topics partitioned across cluster brokers.\n• Consumer groups scale out reads cooperatively.",
      "notes": "Walk through partition reassignment."
    }
  ]
}
```

### Response Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `summary` | `string` | ✅ Yes | Short summary displayed in the plan review header |
| `sections` | `integer` | ✅ Yes | Number of slides (used for UI display) |
| `duration` | `string` | ✅ Yes | Presentation duration estimate |
| `raw` | `string` | ✅ Yes | Full markdown outline displayed in the plan review panel |
| `slides` | `array` | ✅ Yes | Structured slide data |
| `slides[].id` | `integer` | ✅ Yes | Slide number (1-indexed) |
| `slides[].title` | `string` | ✅ Yes | Short section title (e.g. `"1. Core Concept"`) |
| `slides[].kicker` | `string` | ✅ Yes | Category label shown above the title (e.g. `"FOUNDATION"`) |
| `slides[].heading` | `string` | ✅ Yes | Main slide heading |
| `slides[].body` | `string` | ✅ Yes | Bullet-point body text (use `•` prefix for each bullet) |
| `slides[].notes` | `string` | ✅ Yes | Presenter notes for this slide |

> **What the backend does:** Saves the full JSON response to `course.ppt_plan` in the database and sets `status = "PPT_PLAN_REVIEW"`. The UI shows the plan review screen.

---

## Endpoint 2 — Generate PPTX Binary File

Called after the instructor approves the plan. The backend sends the same `AGENT_PPTX_URL` with the approved `ppt_plan` embedded inside the course payload.

**Method:** `POST`  
**URL:** Value of `AGENT_PPTX_URL` (e.g. `http://localhost:8001/build-pptx`)

> **Tip:** Differentiate plan vs generate calls on your agent side by checking whether `course.ppt_plan` is present in the payload — if it exists, the instructor approved the plan and expects the final `.pptx` binary.

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
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

### Response — `200 OK`

- **Content-Type:** `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **Body:** Raw binary bytes of the `.pptx` file

> **What the backend does:** Saves the binary to disk as an artifact, converts slides to images for preview, writes an `Artifact` record (type: `ppt`) to the database, and sets `status = "PPT_READY"`.

---

## Environment Variable Reference

| Variable | Alias | Description |
|---|---|---|
| `AGENT_PPTX_URL` | `AGENT_PPT_URL` | Base URL for the PPT agent. Both plan and generate calls go to this URL. |
| `AGENT_TIMEOUT_SECONDS` | — | Max wait time for agent response (default: `30`) |
