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

| Stage | Function called | URL dispatched to |
|---|---|---|
| Plan generation | `agent_generate_guide_plan()` | `AGENT_LAB_GUIDE_URL + "/plan"` |
| Full guide generation | `agent_generate_guide()` | `AGENT_LAB_GUIDE_URL` (bare root) |

So if your env is `AGENT_LAB_GUIDE_URL=http://localhost:8003/generate-guide`, the backend calls:
- **Plan:** `POST http://localhost:8003/generate-guide/plan`
- **Full guide:** `POST http://localhost:8003/generate-guide`

---

## Endpoint 1 — Generate Lab Guide Plan

Called when the instructor clicks "Generate Lab Guide". Returns a structured outline/plan for the learner guide.

**Method:** `POST`  
**URL:** `{AGENT_LAB_GUIDE_URL}/plan` — e.g. `http://localhost:8003/generate-guide/plan`

> **Fallback behavior:** If this endpoint fails or `AGENT_LAB_GUIDE_URL` is not set, the backend falls back to local generation silently. This is the only agent endpoint with a silent fallback.

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
    "artifacts": [...]
  },
  "stage": "plan"
}
```

### Request Field Reference

| Field | Type | Description |
|---|---|---|
| `course` | `object` | Full course brief |
| `lab` | `object` | The `lab` dict saved from the Lab Agent response |
| `lab.raw` | `string` | Lab markdown instructions |
| `lab.environment` | `string` | Runtime environment |
| `lab.estimated_time` | `integer` | Duration in minutes |
| `lab.artifacts` | `array` | Code files (same shape as Lab Agent artifacts) |
| `stage` | `string` | Always `"plan"` — identifies this as the plan call |

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
      },
      {
        "title": "3. Guided Walkthrough",
        "desc": "Step-by-step milestones: listener setup, Redis lock check, and offset commits."
      },
      {
        "title": "4. Verification Rubric",
        "desc": "Running automated test assertions and evaluating throughput."
      }
    ],
    "raw": "# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide..."
  }
}
```

### Response Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `plan` | `object` | ✅ Yes | Root wrapper key |
| `plan.title` | `string` | ✅ Yes | Guide plan title |
| `plan.estimated_time` | `integer` | ✅ Yes | Duration shown in UI |
| `plan.target_audience` | `string` | ✅ Yes | Audience label (e.g. `"Intermediate"`) |
| `plan.sections` | `array of string` | ✅ Yes | Ordered section names |
| `plan.chapters` | `array` | ✅ Yes | Chapter list displayed in the plan review UI |
| `plan.chapters[].title` | `string` | ✅ Yes | Chapter title |
| `plan.chapters[].desc` | `string` | ✅ Yes | Short chapter description |
| `plan.raw` | `string` | ✅ Yes | Full markdown plan text displayed in the review panel |

> **What the backend does:** Saves the unwrapped `plan` dict to `course.guide_plan` in the DB and sets `status = "LAB_GUIDE_PLAN_REVIEW"`.

---

## Endpoint 2 — Generate Full Learner Guide

Called after the instructor approves the guide plan. Returns the full structured documentation for the learner.

**Method:** `POST`  
**URL:** `AGENT_LAB_GUIDE_URL` (bare root) — e.g. `http://localhost:8003/generate-guide`

### Request Body

- **Content-Type:** `application/json`

```json
{
  "course": {
    "id": "7966d004-3f17-4959-887e-13bc74d71e86",
    "title": "Event-Driven Microservices with Kafka",
    "level": "Intermediate"
  },
  "lab": {
    "raw": "# Kafka Idempotency Lab\n\n## Milestone Tasks...",
    "environment": "Node.js 20 / Redis / Kafka",
    "estimated_time": 45,
    "artifacts": [
      { "name": "consumer.js", "content": "..." }
    ]
  }
}
```

### Response — `200 OK`

- **Content-Type:** `application/json`
- The response **must** be wrapped in a `guide` key.

```json
{
  "guide": {
    "title": "Event-Driven Microservices - Learner Guide",
    "outcomes": [
      "Provision a local Kafka broker environment using Docker",
      "Implement deduplicated message processing using Redis keys",
      "Execute automated test assertions with zero dropped events"
    ],
    "pages": [
      {
        "id": "overview",
        "label": "Overview",
        "kicker": "GETTING STARTED",
        "title": "Lab Architecture & Prerequisites",
        "lede": "Understand the event topology and dependencies before initiating the exercise.",
        "content": "### Welcome to the Kafka Idempotency Lab\n\nIn this lab, you will prevent duplicate processing in distributed consumer groups...\n\n#### Prerequisites\n- Node.js 20+\n- Docker Desktop"
      },
      {
        "id": "setup",
        "label": "Setup",
        "kicker": "ENVIRONMENT",
        "title": "Workspace & Container Configuration",
        "lede": "Launch the local broker, topic partitioners, and state store.",
        "content": "### Step 1: Start Docker Services\n```bash\ndocker-compose up -d\n```\nVerify that containers are healthy."
      },
      {
        "id": "walkthrough",
        "label": "Walkthrough",
        "kicker": "EXECUTION",
        "title": "Guided Implementation Steps",
        "lede": "Follow each milestone sequentially.",
        "content": "### Milestone 1: Instantiate Consumer\nOpen `consumer.js` and initialize the Kafka client...\n\n### Milestone 2: Atomic State Deduplication\nCheck Redis for `msg.eventId` before processing."
      },
      {
        "id": "verification",
        "label": "Verification",
        "kicker": "EVALUATION",
        "title": "Automated Validation & Evaluation",
        "lede": "Validate outcomes against the success rubric.",
        "content": "### Execute the Test Suite\n```bash\nnpm test\n```\n**Expected Outcome:** All test suites pass with green status."
      }
    ]
  }
}
```

### Response Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `guide` | `object` | ✅ Yes | Root wrapper key |
| `guide.title` | `string` | ✅ Yes | Guide title |
| `guide.outcomes` | `array of string` | ✅ Yes | Learning outcomes shown in the guide header |
| `guide.pages` | `array` | ✅ Yes | Ordered tab pages for the learner guide reader |
| `pages[].id` | `string` | ✅ Yes | Unique slug for the page/tab (e.g. `"overview"`) |
| `pages[].label` | `string` | ✅ Yes | Tab label shown in the UI (e.g. `"Setup"`) |
| `pages[].kicker` | `string` | ✅ Yes | Small label above the title (e.g. `"ENVIRONMENT"`) |
| `pages[].title` | `string` | ✅ Yes | Page heading |
| `pages[].lede` | `string` | ✅ Yes | Short introductory paragraph below the heading |
| `pages[].content` | `string` | ✅ Yes | Full markdown page content (supports code blocks, headers, lists) |

> **What the backend does:** Saves the unwrapped `guide` dict to `course.guide` in the DB, writes a `guide.json` artifact to disk and the `Artifact` table, then sets `status = "COMPLETE"`.

---

## Response Validation Rules (Backend-enforced)

```python
# From guide_agent.py

# For /plan endpoint:
if isinstance(res, dict) and "plan" in res:
    return res["plan"] if isinstance(res["plan"], dict) else {"raw": res["plan"]}
if isinstance(res, dict):
    return res

# For full guide endpoint:
if isinstance(res, dict) and "guide" in res and isinstance(res["guide"], dict):
    return res["guide"]
if isinstance(res, dict):
    return res
raise ValueError(...)
```

---

## Environment Variable Reference

| Variable | Alias | Description |
|---|---|---|
| `AGENT_LAB_GUIDE_URL` | `AGENT_GUIDE_URL` | Base URL. `/plan` is appended for plan calls; used bare for full guide |
| `AGENT_TIMEOUT_SECONDS` | — | Max wait time for agent response (default: `30`) |
