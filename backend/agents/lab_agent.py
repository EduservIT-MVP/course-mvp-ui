"""
Practical lab exercise generation agent client and fallback generator.
"""

from __future__ import annotations

import time
from config import JOB_DELAY, AGENT_LAB_URL
from agents.client import _call_agent_json


def _split_list(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def agent_generate_lab(course: dict, lab_input: dict | None = None) -> dict:
    """
    Generate practical lab exercise.
    If AGENT_LAB_URL is configured, calls the external Lab agent server.
    Otherwise generates structured lab exercise locally as fallback.
    """
    if AGENT_LAB_URL:
        payload = {"course": course, "lab_input": lab_input or {}}
        res = _call_agent_json("LAB", AGENT_LAB_URL, payload)
        if isinstance(res, dict) and "lab" in res and isinstance(res["lab"], dict):
            return res["lab"]
        if isinstance(res, dict):
            return res
        raise ValueError(f"Agent [LAB] returned invalid response format: {type(res)}")

    time.sleep(JOB_DELAY)
    lab_input = lab_input or {}
    title = (course.get("title") or "Course").strip() or "Course"
    raw_criteria = _split_list(course.get("objectives"))
    if len(raw_criteria) >= 2 or (len(raw_criteria) == 1 and len(raw_criteria[0]) > 28):
        criteria = raw_criteria
    else:
        criteria = [
            "Learner can explain the scenario in their own words",
            "Learner completes the required lab steps",
            "Learner can identify at least one improvement",
        ]
    scenario = (lab_input.get("scenario") or "").strip() or title
    environment = (lab_input.get("environment") or "").strip() or "Browser workspace"
    assets = (lab_input.get("assets") or "").strip() or "Starter notes, template, evaluation rubric"
    return {
        "scenario": scenario,
        "environment": environment,
        "assets": assets,
        "tasks": [
            {"n": 1, "title": "Set up the workspace", "detail": "Open the starter files and confirm the environment.", "time": "10 min"},
            {"n": 2, "title": "Complete the core flow", "detail": "Follow the use-case steps and capture notes.", "time": "25 min"},
            {"n": 3, "title": "Validate outcomes", "detail": "Check your work against the success criteria.", "time": "15 min"},
        ],
        "criteria": criteria,
        "code": {
            "language": "javascript",
            "files": [
                {
                    "path": "lab/agent.js",
                    "content": f"// Lab starter for {title}\nexport const goal = {repr(course.get('objectives') or '')}\n",
                }
            ],
        },
        "useCase": (lab_input.get("scenario") or "").strip()
        or f"Apply {title} concepts in a guided hands-on exercise.",
    }
