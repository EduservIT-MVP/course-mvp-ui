# Real Agent Developer Guide: Course Brief Fetching & Endpoints

This guide explains **how real AI agents receive the course brief**, how each agent endpoint must be implemented, and the exact JSON schemas required so your real agents plug directly into the EduServ IT platform without modifying UI or backend code.

---

## 1. How the Agent Gets the Course Brief

> **Core Principle**: Your agent does **not** need to poll the backend, connect to a database, or scrape the UI.
> 
> Whenever an instructor triggers a step in the UI, the backend's Celery task makes an **HTTP POST request directly to your agent's URL** with the entire Course Brief packaged in the JSON body.

### Python / FastAPI Example: How Your Agent Reads the Brief
```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/plan")
async def generate_plan(request: Request):
    payload = await request.json()
    
    # 1. Fetch the course brief object
    course = payload.get("course", {})
    
    # 2. Extract specific brief fields for your AI prompt
    course_id    = course.get("id")
    title        = course.get("title")        # e.g. "Event-Driven Architecture"
    description  = course.get("description")  # e.g. "Architecting resilient systems..."
    topics       = course.get("topics")       # e.g. "Kafka\nCQRS\nEvent Sourcing"
    objectives   = course.get("objectives")   # e.g. "1. Implement idempotency\n2. ..."
    level        = course.get("level")        # e.g. "Intermediate"
    duration     = course.get("duration")     # e.g. "45 min"
    persona      = course.get("persona")      # e.g. "Senior Backend Engineers"
    prereqs      = course.get("prerequisites")# e.g. "Docker & Node.js"
    
    # 3. Pass these variables to your LLM / Agent chain
    ...
```

### Node.js / Express Example: How Your Agent Reads the Brief
```javascript
app.post("/plan", (req, res) => {
  const course = req.body.course || {};
  
  const title = course.title;
  const objectives = course.objectives;
  const topics = course.topics;
  const level = course.level;
  
  // Pass to LangChain / LlamaIndex / Agent pipeline
});
```

---

## 2. Complete Flow Matrix (UI ↔ Backend ↔ Agent ↔ DB)

| Stage | UI Step | User Action | Backend Trigger | Agent Endpoint Called | Agent Expected Response | What Backend Does with Output |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1A** | Course Brief | Click "Generate presentation plan" | Celery: `job_generate_ppt_plan` | `POST {AGENT_PPTX_URL}/plan` | JSON: `{ "slides": [...], "raw": "..." }` | Saves plan to `course.ppt_plan`. UI shows **PPT Plan Review** screen. |
| **1B** | PPT Review | Click "Approve & Generate Slides →" | Celery: `job_generate_ppt` | `POST {AGENT_PPTX_URL}/` | Binary stream: `.pptx` file | Saves `.pptx` to disk, renders slide PNGs, writes `Artifact` (type `ppt`) to DB. UI shows **Interactive Slide Viewer**. |
| **2** | Lab Review | Click "Generate Lab" | Celery: `job_generate_lab` | `POST {AGENT_LAB_URL}/` | JSON: `{ "lab": { "raw": "...", "artifacts": [...] } }` | Saves each artifact to disk & DB `Artifact` table. UI shows **Lab Spec + Download Artifacts**. |
| **3A** | Lab Guide | Click "Generate Lab Guide" | Celery: `job_generate_guide_plan` | `POST {AGENT_LAB_GUIDE_URL}/plan` | JSON: `{ "plan": { "chapters": [...], "raw": "..." } }` | Saves to `course.guide_plan`. UI shows **Guide Plan Review + Chapters list**. |
| **3B** | Guide Review | Click "Approve & Generate Guide →" | Celery: `job_generate_guide` | `POST {AGENT_LAB_GUIDE_URL}/` | JSON: `{ "guide": { "pages": [...] } }` | Saves `guide.json` to DB & disk. UI shows **Tabbed Documentation Reader**. |

---

## 3. Agent 1: PPT Agent Specification (`AGENT_PPTX_URL`)

### Endpoint 1A: Presentation Outline & Plan
- **Route**: `POST /plan`
- **Request Payload**:
  ```json
  {
    "course": {
      "id": "7966d004-3f17-4959-887e-13bc74d71e86",
      "title": "Event-Driven Microservices",
      "topics": "Kafka\nCQRS\nEvent Sourcing",
      "objectives": "Implement Kafka consumer idempotency\nHandle rebalancing",
      "level": "Intermediate",
      "duration": "45 min"
    }
  }
  ```
- **Response Format (`200 OK` JSON)**:
  ```json
  {
    "summary": "Event-Driven Microservices · 45 min · 6 slides",
    "sections": 6,
    "duration": "30 min",
    "raw": "# Presentation Outline\n\n** 1. Core Concept **\n- Decoupling producers and consumers...",
    "slides": [
      {
        "id": 1,
        "title": "1. Core Concept",
        "kicker": "FOUNDATION",
        "heading": "Event Streaming vs Request-Response",
        "body": "• Asynchronous event logs replace point-to-point HTTP coupling.\n• Producers emit immutable state events without knowing downstream consumers.\n• Enables real-time scalability.",
        "notes": "Introduce the motivation. Emphasize why REST fails under high event throughput."
      },
      {
        "id": 2,
        "title": "2. Architecture & Design",
        "kicker": "ARCHITECTURE",
        "heading": "Kafka Broker Topology",
        "body": "• Topics partitioned across cluster brokers.\n• Consumer groups scale out reads cooperatively.\n• Offsets track consumption progress.",
        "notes": "Walk through partition reassignment."
      }
    ]
  }
  ```

### Endpoint 1B: Binary PowerPoint Deck Generation
- **Route**: `POST /`
- **Request Payload**:
  ```json
  {
    "course": {
      "id": "7966d004-3f17-4959-887e-13bc74d71e86",
      "title": "Event-Driven Microservices",
      "ppt_plan": { ...approved_plan_from_endpoint_1A... }
    }
  }
  ```
- **Response Format (`200 OK` Binary)**:
  - **Header**: `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - **Body**: Raw binary `.pptx` file bytes.

---

## 4. Agent 2: Lab Agent Specification (`AGENT_LAB_URL`)

### Endpoint 2: Lab Exercise & Code Artifacts Generation
- **Route**: `POST /`
- **Request Payload**:
  ```json
  {
    "course": {
      "id": "7966d004-3f17-4959-887e-13bc74d71e86",
      "title": "Event-Driven Microservices",
      "topics": "Kafka\nCQRS",
      "objectives": "Implement Kafka consumer idempotency"
    },
    "lab_input": {
      "scenario": "Implement Idempotent Consumer in Node.js",
      "environment": "Node.js 20 / Docker",
      "assets": "Kafka starter container"
    }
  }
  ```

- **Response Format (`200 OK` JSON)**:
  > **Crucial**: Return both the Markdown `raw` plan **and** the `artifacts` array. The backend automatically writes each file into the database and disk!

  ```json
  {
    "lab": {
      "raw": "# Kafka Idempotency Lab\n\n**Scenario:** Implement an idempotent event processor.\n\n## Milestone Tasks\n1. Launch containers: `docker-compose up -d`\n2. Implement Redis deduplication check in `consumer.js`\n3. Run tests: `npm test`",
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

---

## 5. Agent 3: Lab Guide Agent Specification (`AGENT_LAB_GUIDE_URL`)

### Endpoint 3A: Lab Guide Plan Generation
- **Route**: `POST /plan`
- **Request Payload**:
  ```json
  {
    "course": { "title": "Event-Driven Microservices", "level": "Intermediate" },
    "lab": { "environment": "Node.js 20 / Docker", "estimated_time": 45 },
    "stage": "plan"
  }
  ```
- **Response Format (`200 OK` JSON)**:
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
      "raw": "# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide documentation..."
    }
  }
  ```

### Endpoint 3B: Full Learner Guide Generation
- **Route**: `POST /`
- **Request Payload**:
  ```json
  {
    "course": { "title": "Event-Driven Microservices" },
    "lab": { "environment": "Node.js 20", "artifacts": [...] }
  }
  ```
- **Response Format (`200 OK` JSON)**:
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

---

## 6. Ready-to-Run FastAPI Boilerplate for Real Agents

Copy this snippet directly into your agent repository to start receiving requests immediately:

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="EduServ IT Real Agent Microservice")

# -------------------------------------------------------------
# 1. PPT Agent (/plan & /)
# -------------------------------------------------------------
@app.post("/ppt/plan")
async def generate_ppt_plan(request: Request):
    payload = await request.json()
    course = payload.get("course", {})
    title = course.get("title", "Course")
    objectives = course.get("objectives", "")
    
    # Call your LLM model here (e.g. OpenAI, Claude, Gemini, LangChain)
    return {
        "summary": f"{title} · 30 min · 5 slides",
        "sections": 5,
        "duration": "30 min",
        "raw": f"# {title} Outline\n\n** 1. Overview **\n- Core concepts",
        "slides": [
            {
                "id": 1,
                "title": "1. Overview",
                "kicker": "FOUNDATION",
                "heading": f"Introduction to {title}",
                "body": f"• Key objectives: {objectives}",
                "notes": "Emphasize key takeaways"
            }
        ]
    }

@app.post("/ppt")
async def generate_pptx_file(request: Request):
    payload = await request.json()
    course = payload.get("course", {})
    
    # Generate real binary .pptx bytes (e.g. via python-pptx)
    # with open("output.pptx", "rb") as f:
    #     pptx_bytes = f.read()
    pptx_bytes = b"PK\x03\x04..." # raw bytes
    
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

# -------------------------------------------------------------
# 2. Lab Agent (/)
# -------------------------------------------------------------
@app.post("/lab")
async def generate_lab(request: Request):
    payload = await request.json()
    course = payload.get("course", {})
    lab_input = payload.get("lab_input", {})
    title = course.get("title", "Lab")
    
    # Return markdown + code files
    return {
        "lab": {
            "raw": f"# {title} Hands-on Lab\n\n## Tasks\n1. Run the starter code",
            "environment": lab_input.get("environment", "Python 3.12"),
            "estimated_time": 45,
            "artifacts": [
                {
                    "name": "main.py",
                    "label": "Starter Implementation",
                    "type": "lab-starter",
                    "mime_type": "text/x-python",
                    "content": "print('Lab ready')\n"
                },
                {
                    "name": "test_main.py",
                    "label": "Verification Tests",
                    "type": "lab-test",
                    "mime_type": "text/x-python",
                    "content": "def test_ok(): assert True\n"
                }
            ]
        }
    }

# -------------------------------------------------------------
# 3. Lab Guide Agent (/plan & /)
# -------------------------------------------------------------
@app.post("/guide/plan")
async def generate_guide_plan(request: Request):
    payload = await request.json()
    course = payload.get("course", {})
    title = course.get("title", "Guide")
    
    return {
        "plan": {
            "title": f"{title} Lab Guide Plan",
            "estimated_time": 45,
            "target_audience": "Intermediate",
            "sections": ["Overview", "Setup", "Walkthrough", "Verification"],
            "chapters": [
                {"title": "1. Overview & Objectives", "desc": "Context and prerequisites"},
                {"title": "2. Environment Setup", "desc": "Workspace tooling"},
                {"title": "3. Guided Walkthrough", "desc": "Step-by-step tasks"},
                {"title": "4. Verification Rubric", "desc": "Automated tests"}
            ],
            "raw": f"# {title} - Guide Plan\n\nOutline of documentation chapters..."
        }
    }

@app.post("/guide")
async def generate_full_guide(request: Request):
    payload = await request.json()
    course = payload.get("course", {})
    title = course.get("title", "Guide")
    
    return {
        "guide": {
            "title": f"{title} Documentation",
            "outcomes": ["Complete hands-on tasks", "Pass automated tests"],
            "pages": [
                {
                    "id": "overview",
                    "label": "Overview",
                    "kicker": "GETTING STARTED",
                    "title": "Prerequisites",
                    "lede": "Review prerequisites before starting",
                    "content": "### Overview\n\nDetailed walkthrough..."
                },
                {
                    "id": "setup",
                    "label": "Setup",
                    "kicker": "ENVIRONMENT",
                    "title": "Environment Setup",
                    "lede": "Configure your workspace",
                    "content": "### Setup\n\nRun setup commands..."
                }
            ]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 7. Connecting Your Agent to the EduServ IT Backend

Once your real agent service is running (e.g. at `http://192.168.1.50:8000`), update `backend/.env`:

```ini
AGENT_PPTX_URL=http://192.168.1.50:8000/ppt
AGENT_LAB_URL=http://192.168.1.50:8000/lab
AGENT_LAB_GUIDE_URL=http://192.168.1.50:8000/guide
```

Restart the Flask backend and Celery worker:
```bash
# Terminal 1: Backend
source .venv/bin/activate
python app.py

# Terminal 2: Celery Worker
source .venv/bin/activate
celery -A app.celery worker --pool=solo --loglevel=info
```

Your UI will now call your real AI agents directly!
