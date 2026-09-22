"""
Lab Guide documentation generation agent client and fallback generator.
"""

from __future__ import annotations

import logging
import time
from config import JOB_DELAY, AGENT_LAB_GUIDE_URL
from agents.client import _call_agent_json

logger = logging.getLogger(__name__)



def _split_list(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def agent_generate_guide_plan(course: dict, lab: dict | None = None) -> dict:
    """
    Generate structured Lab Guide Plan markdown before full guide generation.
    If AGENT_LAB_GUIDE_URL is configured, attempts to query external Guide agent for plan.
    Otherwise generates structured guide plan and chapters dynamically.
    """
    if AGENT_LAB_GUIDE_URL:
        payload = {"course": course, "lab": lab or {}, "stage": "plan"}
        try:
            res = _call_agent_json("GUIDE_PLAN", f"{AGENT_LAB_GUIDE_URL.rstrip('/')}/plan", payload)
            if isinstance(res, dict) and "plan" in res:
                return res["plan"] if isinstance(res["plan"], dict) else {"raw": res["plan"]}
            if isinstance(res, dict):
                return res
        except Exception as e:
            logger.warning("External guide plan endpoint failed, falling back to local generator: %s", e)

    time.sleep(JOB_DELAY)
    title = (course.get("title") or "Generic Course").strip() or "Generic Course"
    lab_data = lab if isinstance(lab, dict) else {}
    env = lab_data.get("environment") or "Standard Environment"
    est_time = lab_data.get("estimated_time") or 45
    target_audience = course.get("level") or "Intermediate"
    
    chapters = [
        {"title": "1. Overview & Objectives", "desc": f"Prerequisites, architecture, and learning goals for {title}"},
        {"title": "2. Environment Setup", "desc": f"Workspace initialization and dependency tooling for {env}"},
        {"title": "3. Guided Walkthrough", "desc": f"Step-by-step milestone execution for hands-on tasks"},
        {"title": "4. Verification Rubric", "desc": f"Automated test validation and completion checks"},
    ]

    return {
        "title": f"{title} Lab Guide Plan",
        "raw": (
            f"# {title} - Lab Guide Plan\n\n"
            "This plan outlines the structure of the final learner guide. The guide will consist of 4 main sections:\n\n"
            f"1. **Overview**: High-level summary of the lab goals, target audience ({target_audience}), and prerequisites.\n"
            f"2. **Setup**: Instructions for preparing the {env} runtime, environment variables, and dependencies.\n"
            "3. **Walkthrough**: Step-by-step execution tasks for the learner to follow.\n"
            "4. **Verification**: Automated and manual checks to ensure the learner successfully completed the lab.\n\n"
            f"**Target Audience:** {target_audience} learners who have completed the prerequisites.\n"
            f"**Estimated Duration:** {est_time} minutes.\n\n"
            "*(Approve this plan to generate the full step-by-step learner guide content)*"
        ),
        "sections": ["Overview", "Setup", "Walkthrough", "Verification"],
        "chapters": chapters,
        "estimated_time": est_time,
        "target_audience": target_audience,
    }



def agent_generate_guide(course: dict, lab: dict | None = None) -> dict:
    """
    Generate practical lab guide document.
    If AGENT_LAB_GUIDE_URL is configured, calls the external Guide agent server.
    Otherwise generates a fallback guide locally.
    """
    if AGENT_LAB_GUIDE_URL:
        payload = {"course": course, "lab": lab or {}}
        res = _call_agent_json("GUIDE", AGENT_LAB_GUIDE_URL, payload)
        if isinstance(res, dict) and "guide" in res and isinstance(res["guide"], dict):
            return res["guide"]
        if isinstance(res, dict):
            return res
        raise ValueError(f"Agent [GUIDE] returned invalid response format: {type(res)}")

    time.sleep(JOB_DELAY)
    
    title = (course.get("title") or "Generic Course").strip() or "Generic Course"
    lab_scenario = f"{title} Guided Exercise"
    
    pages = [
        {
            "id": "overview",
            "label": "Overview",
            "kicker": "GETTING STARTED",
            "title": f"Lab Overview: {title}",
            "lede": "Welcome to the hands-on lab. In this exercise, you will put theoretical concepts into practice by completing a guided implementation.",
            "content": f"### Welcome to the Lab\n\nThis lab is designed to give you practical experience with the concepts covered in this course.\n\n**Prerequisites**\n- Basic understanding of {title}\n- Access to the lab environment\n\n**Expected Time**\n- 45 minutes",
        },
        {
            "id": "setup",
            "label": "Setup",
            "kicker": "ENVIRONMENT",
            "title": "Workspace & Tooling Configuration",
            "lede": "Confirm your containerized workspace is online and environment variables are properly initialized before starting the tasks.",
            "content": "### Environment Setup\n\n1. Open your terminal.\n2. Run `docker-compose up -d` to start the required services.\n3. Verify that all containers are running successfully using `docker ps`.\n4. Initialize the environment dependencies.",
        },
        {
            "id": "walkthrough",
            "label": "Walkthrough",
            "kicker": "EXECUTION",
            "title": "Step-by-Step Exercise Execution",
            "lede": "Follow each milestone in sequential order, validating intermediate state and capturing debugging logs as you proceed.",
            "content": "### Step 1: Initialize the Project\nRun the initial scaffolding command to create the base structure.\n\n### Step 2: Implement the Core Logic\nAdd the primary logic to fulfill the requirements.\n\n### Step 3: Test the Integration\nTrigger the test suite to observe the results.",
        },
        {
            "id": "verification",
            "label": "Verification",
            "kicker": "EVALUATION",
            "title": "Assessment & Success Verification",
            "lede": "Verify your finished implementation against the success rubric, run the automated validation script, and review outcomes.",
            "content": "### Success Verification\n\nRun the automated test suite:\n```bash\nnpm run test:e2e\n```\n\n**Expected Output:**\nAll integration tests should pass. If any fail, review the error logs and adjust your logic.",
        },
    ]

    return {
        "title": f"{title} Lab Guide",
        "outcomes": [
            "Understand the system architecture and runtime constraints",
            "Complete the guided hands-on implementation steps",
            "Validate outcomes against defined evaluation rubrics",
        ],
        "pages": pages,
        "sections": pages,
        "plan": f"# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide. The guide will consist of 4 main sections:\n\n1. **Overview**: High-level summary of the lab goals and prerequisites.\n2. **Setup**: Instructions for preparing the local environment and dependencies.\n3. **Walkthrough**: Step-by-step execution tasks for the learner to follow.\n4. **Verification**: Automated and manual checks to ensure the learner successfully completed the lab.\n\n**Target Audience:** Intermediate learners who have completed the prerequisites.\n**Estimated Duration:** 45 minutes.\n\n*(Approve this plan to generate the full guide content)*",
    }
