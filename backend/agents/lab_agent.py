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
    title = (course.get("title") or "CIBA Grant Flow Lab").strip() or "CIBA Grant Flow Lab"
    raw_criteria = _split_list(course.get("objectives"))
    if len(raw_criteria) >= 2 or (len(raw_criteria) == 1 and len(raw_criteria[0]) > 28):
        criteria = raw_criteria
    else:
        criteria = [
            "CIBA authorization request is initiated out-of-band without direct credential prompts",
            "Async approval polling status lifecycle executes correctly",
            "Bypass wrong-choice path triggers instructional security error message",
            "All test assertions pass using Pytest and Mockk",
        ]
    scenario = (lab_input.get("scenario") or "").strip() or title
    environment = (lab_input.get("environment") or "").strip() or "Docker, Python 3.11, Flask, Pytest, Mockk"
    assets = (lab_input.get("assets") or "").strip() or "Lab repository starter files, CIBA emulator, evaluation rubric"
    
    sample_readme = (
        f"# {title}\n\n"
        "**Summary:** This lab demonstrates the Client Initiated Backchannel Authentication (CIBA) grant flow, "
        "where a client requests authorization from a user through an out-of-band method.\n\n"
        "**Trainee persona / decision:** Helpdesk Agent\n\n"
        "## Steps\n"
        "1. Start an action on the index page to initiate a CIBA grant flow\n"
        "2. The action calls the client module, which simulates an async approval flow\n"
        "3. The trainee is redirected to a pending page that polls a status endpoint while the request is 'in flight'\n"
        "4. The trainee can simulate the request being approved or denied through dev-only endpoints\n"
        "5. The trainee is redirected to a success or denied page, depending on the outcome\n\n"
        "## Wrong-choice path\n"
        "If the trainee chooses to bypass the CIBA grant flow and attempt to authenticate the user directly, "
        "they will encounter an error message explaining the importance of using CIBA for secure and user-friendly authentication.\n\n"
        "## Simulated systems (no real network calls, no real credentials)\n"
        "Async Approval Service\n"
        "CIBA Authenticator\n\n"
        "## Expected packages\n"
        "Flask\n"
        "Pytest\n"
        "Mockk\n"
    )

    return {
        "scenario": scenario,
        "environment": environment,
        "assets": assets,
        "readme": sample_readme,
        "persona": "Helpdesk Agent",
        "summary": "This lab demonstrates the Client Initiated Backchannel Authentication (CIBA) grant flow, where a client requests authorization from a user through an out-of-band method.",
        "wrongChoicePath": (
            "If the trainee chooses to bypass the CIBA grant flow and attempt to authenticate the user directly, "
            "they will encounter an error message explaining the importance of using CIBA for secure and user-friendly authentication."
        ),
        "simulatedSystems": [
            "Async Approval Service",
            "CIBA Authenticator",
        ],
        "expectedPackages": [
            "Flask",
            "Pytest",
            "Mockk",
        ],
        "steps": [
            "Start an action on the index page to initiate a CIBA grant flow",
            "The action calls the client module, which simulates an async approval flow",
            "The trainee is redirected to a pending page that polls a status endpoint while the request is 'in flight'",
            "The trainee can simulate the request being approved or denied through dev-only endpoints",
            "The trainee is redirected to a success or denied page, depending on the outcome",
        ],
        "tasks": [
            {"n": 1, "title": "Initiate CIBA Grant Flow", "detail": "Start an action on the index page to initiate a CIBA grant flow via client module.", "time": "10 min"},
            {"n": 2, "title": "Simulate Asynchronous Approval", "detail": "Poll status endpoint while request is in flight and simulate approval/denial.", "time": "25 min"},
            {"n": 3, "title": "Verify Outcomes & Test Wrong-Choice Guard", "detail": "Verify redirection to outcome page and ensure bypass attempts trigger explanatory feedback.", "time": "15 min"},
        ],
        "criteria": criteria,
        "code": {
            "language": "python",
            "files": [
                {
                    "path": "lab/app.py",
                    "content": f"# Lab starter for {title}\nfrom flask import Flask\napp = Flask(__name__)\n",
                }
            ],
        },
        "useCase": (lab_input.get("scenario") or "").strip()
        or f"Apply {title} concepts in a guided hands-on exercise.",
    }
