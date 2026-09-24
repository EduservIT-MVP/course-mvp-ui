"""
Practical lab exercise generation agent client and fallback generator.
"""

from __future__ import annotations

import time
from config import JOB_DELAY, AGENT_LAB_URL
from agents.client import _call_agent_json


def _slug(title: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in (title or "course"))
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "course"


def _split_list(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def agent_generate_lab_plan(course: dict) -> dict:
    """
    Generate practical lab exercise plan.
    If AGENT_LAB_PLAN_URL is configured, calls the external Lab agent server.
    Otherwise generates structured lab exercise locally as fallback.
    """
    if AGENT_LAB_URL:
        payload = {"course": course}
        res = _call_agent_json("LAB_PLAN", f"{AGENT_LAB_URL.rstrip('/')}/plan", payload)
        if isinstance(res, dict) and "lab" in res and isinstance(res["lab"], dict):
            return res["lab"]
        if isinstance(res, dict):
            return res
        raise ValueError(f"Agent [LAB_PLAN] returned invalid response format: {type(res)}")

    time.sleep(JOB_DELAY)
    title = (course.get("title") or "Generic Course").strip() or "Generic Course"
    
    raw_criteria = _split_list(course.get("objectives"))
    if len(raw_criteria) >= 2 or (len(raw_criteria) == 1 and len(raw_criteria[0]) > 28):
        criteria = raw_criteria
    else:
        criteria = [
            "The environment is properly initialized",
            "The core logic correctly implements the required features",
            "All test assertions pass successfully",
        ]
    
    # Try to extract from course or use reasonable defaults
    scenario = course.get("scenario", f"{title} Guided Exercise")
    environment = course.get("environment", "Node.js / Express")
    
    sample_readme = (
        f"# {title} - Hands-on Lab\n\n"
        f"**Summary:** This lab provides a guided, hands-on coding scenario for **{title}**.\n\n"
        "**Target Persona:** Intermediate Developer / Engineer\n\n"
        "## Core Objectives & Success Criteria\n"
        + "".join(f"- {c}\n" for c in criteria) + "\n"
        "## Architecture & Environment\n"
        f"- **Runtime Environment:** {environment}\n"
        "- **Test Runner:** Mocha / Jest\n"
        "- **Simulated Services:** Mock Gateway, Local State Store\n\n"
        "## Milestone Tasks\n"
        "1. **Environment Initialization:** Validate configuration files and verify dependencies.\n"
        "2. **Feature Implementation:** Implement the handler methods according to the specification.\n"
        "3. **Unit & Integration Verification:** Run automated test assertions to confirm criteria.\n\n"
        "## Verification Command\n"
        "```bash\nnpm test\n```\n"
    )

    return {
        "title": title,
        "scenario": scenario,
        "environment": environment,
        "estimated_time": 45,
        "raw": sample_readme,
    }

def agent_generate_lab(course: dict) -> dict:
    """
    Generate practical lab artifacts.
    If AGENT_LAB_URL is configured, calls the external Lab agent server.
    Otherwise generates structured lab artifacts locally as fallback.
    """
    if AGENT_LAB_URL:
        payload = {"course": course}
        res = _call_agent_json("LAB", AGENT_LAB_URL, payload)
        if isinstance(res, dict) and "lab" in res and isinstance(res["lab"], dict):
            return res["lab"]
        if isinstance(res, dict):
            return res
        raise ValueError(f"Agent [LAB] returned invalid response format: {type(res)}")

    time.sleep(JOB_DELAY)
    title = (course.get("title") or "Generic Course").strip() or "Generic Course"
    slug = _slug(title)
    
    raw_criteria = _split_list(course.get("objectives"))
    if len(raw_criteria) >= 2 or (len(raw_criteria) == 1 and len(raw_criteria[0]) > 28):
        criteria = raw_criteria
    else:
        criteria = [
            "The environment is properly initialized",
            "The core logic correctly implements the required features",
            "All test assertions pass successfully",
        ]
    scenario = course.get("scenario", f"{title} Guided Exercise")
    environment = course.get("environment", "Node.js / Express")
    
    sample_readme = (
        f"# {title} - Hands-on Lab\n\n"
        f"**Summary:** This lab provides a guided, hands-on coding scenario for **{title}**.\n\n"
        "**Target Persona:** Intermediate Developer / Engineer\n\n"
        "## Core Objectives & Success Criteria\n"
        + "".join(f"- {c}\n" for c in criteria) + "\n"
        "## Architecture & Environment\n"
        f"- **Runtime Environment:** {environment}\n"
        "- **Test Runner:** Mocha / Jest\n"
        "- **Simulated Services:** Mock Gateway, Local State Store\n\n"
        "## Milestone Tasks\n"
        "1. **Environment Initialization:** Validate configuration files and verify dependencies.\n"
        "2. **Feature Implementation:** Implement the handler methods according to the specification.\n"
        "3. **Unit & Integration Verification:** Run automated test assertions to confirm criteria.\n\n"
        "## Verification Command\n"
        "```bash\nnpm test\n```\n"
    )

    starter_code = (
        f"/**\n * {title} - Starter Implementation\n * Auto-generated by Lab Agent\n */\n\n"
        f"console.log('Initializing {title} lab environment...');\n\n"
        "class LabExercise {\n"
        "  constructor() {\n"
        "    this.isReady = true;\n"
        "    this.results = [];\n"
        "  }\n\n"
        "  executeTask(taskId) {\n"
        "    // TODO: Implement task logic\n"
        "    return { status: 'success', taskId };\n"
        "  }\n"
        "}\n\n"
        "module.exports = { LabExercise };\n"
    )

    test_code = (
        f"/**\n * {title} - Automated Verification Tests\n * Auto-generated by Lab Agent\n */\n\n"
        "const assert = require('assert');\n"
        "const { LabExercise } = require('./" + slug + "-starter.js');\n\n"
        "describe('" + title + " Lab Verification', () => {\n"
        "  it('should initialize successfully', () => {\n"
        "    const lab = new LabExercise();\n"
        "    assert.strictEqual(lab.isReady, true);\n"
        "  });\n\n"
        "  it('should execute tasks correctly', () => {\n"
        "    const lab = new LabExercise();\n"
        "    const res = lab.executeTask(1);\n"
        "    assert.strictEqual(res.status, 'success');\n"
        "  });\n"
        "});\n"
    )

    artifacts = [
        {
            "name": f"{slug}-starter.js",
            "label": f"{title} Starter Code",
            "type": "lab-starter",
            "mime_type": "text/javascript",
            "content": starter_code,
        },
        {
            "name": f"{slug}-test.js",
            "label": "Automated Verification Suite",
            "type": "lab-test",
            "mime_type": "text/javascript",
            "content": test_code,
        },
    ]

    # Combine with existing plan data if present
    existing_plan = course.get("lab_plan") or {}
    
    return {
        "raw": existing_plan.get("raw") or "No plan provided.",
        "estimated_time": existing_plan.get("estimated_time") or 45,
        "environment": existing_plan.get("environment") or "Local",
        "artifacts": artifacts,
    }
