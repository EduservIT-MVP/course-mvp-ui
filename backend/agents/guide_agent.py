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



def agent_generate_guide(course: dict, lab: dict | None = None) -> bytes:
    """
    Generate practical lab guide PDF document.
    If AGENT_LAB_GUIDE_URL is configured, calls the external Guide agent server.
    Otherwise generates a fallback PDF locally.
    """
    if AGENT_LAB_GUIDE_URL:
        from agents.client import _call_agent_binary
        payload = {"course": course, "lab": lab or {}}
        return _call_agent_binary("GUIDE", AGENT_LAB_GUIDE_URL, payload)

    time.sleep(JOB_DELAY)
    
    # Fallback to minimal PDF
    return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Outlines 2 0 R\n/Pages 3 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Outlines\n/Count 0\n>>\nendobj\n3 0 obj\n<<\n/Type /Pages\n/Count 1\n/Kids [ 4 0 R ]\n>>\nendobj\n4 0 obj\n<<\n/Type /Page\n/Parent 3 0 R\n/MediaBox [ 0 0 612 792 ]\n/Contents 5 0 R\n/Resources <<\n/ProcSet [ /PDF /Text ]\n/Font << /F1 6 0 R >>\n>>\n>>\nendobj\n5 0 obj\n<< /Length 73 >>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Mock PDF Generated successfully) Tj\nET\nendstream\nendobj\n6 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/Name /F1\n/BaseFont /Helvetica\n/Encoding /MacRomanEncoding\n>>\nendobj\ntrailer\n<<\n/Size 7\n/Root 1 0 R\n>>\n%%EOF"
