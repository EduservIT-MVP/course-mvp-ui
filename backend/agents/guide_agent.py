"""
Lab Guide documentation generation agent client and fallback generator.
"""

from __future__ import annotations

import time
from config import JOB_DELAY, AGENT_LAB_GUIDE_URL
from agents.client import _call_agent_json


def _split_list(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def agent_generate_guide(course: dict, lab: dict | None = None) -> dict:
    """
    Generate step-by-step lab guide.
    If AGENT_LAB_GUIDE_URL is configured, calls the external Lab Guide agent server.
    Otherwise generates structured markdown sections locally as fallback.
    """
    if AGENT_LAB_GUIDE_URL:
        payload = {"course": course, "lab": lab or {}}
        res = _call_agent_json("LAB_GUIDE", AGENT_LAB_GUIDE_URL, payload)
        if isinstance(res, dict) and "guide" in res and isinstance(res["guide"], dict):
            return res["guide"]
        if isinstance(res, dict):
            return res
        raise ValueError(f"Agent [LAB_GUIDE] returned invalid response format: {type(res)}")

    time.sleep(JOB_DELAY)
    lab = lab or {}
    outcomes = _split_list(course.get("objectives"))[:3] or ["Understand the scenario", "Know the success criteria"]
    pages = [
        {"id": "overview", "label": "Overview", "kicker": "GETTING STARTED", "title": "Lab overview", "lede": "What you will build and why it matters."},
        {"id": "setup", "label": "Setup", "kicker": "ENVIRONMENT", "title": "Environment setup", "lede": "Prepare the workspace before you begin."},
        {"id": "walkthrough", "label": "Walkthrough", "kicker": "STEPS", "title": "Guided walkthrough", "lede": "Follow each step and capture evidence."},
    ]
    sections = []
    for p in pages:
        sections.append(
            {
                **p,
                "lede": f"{p['lede']} Scenario: {lab.get('scenario') or course.get('title') or 'this lab'}.",
            }
        )
    return {
        "title": course.get("title") or "Lab guide",
        "outcomes": outcomes,
        "pages": sections,
        "sections": sections,
        "plan": "# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide. The guide will consist of 4 main sections:\n\n1. **Overview**: High-level summary of the lab goals and prerequisites.\n2. **Setup**: Instructions for preparing the local environment and dependencies.\n3. **Walkthrough**: Step-by-step execution tasks for the learner to follow.\n4. **Verification**: Automated and manual checks to ensure the learner successfully completed the lab.\n\n**Target Audience:** Intermediate learners who have completed the prerequisites.\n**Estimated Duration:** 45 minutes.\n\n*(Approve this plan to generate the full guide content)*",
    }
