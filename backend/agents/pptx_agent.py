"""
PPTX presentation generation agent client and template resolver.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from config import BASE_DIR, PPT_DIR, PPT_TEMPLATE_FILE, JOB_DELAY, AGENT_PPTX_URL
from agents.client import _call_agent_binary

logger = logging.getLogger(__name__)


def resolve_ppt_template() -> Path | None:
    """Pick a static .pptx from backend/ppt/ (or PPT_TEMPLATE_FILE). Never writes to it."""
    explicit = PPT_TEMPLATE_FILE
    if explicit:
        path = Path(explicit)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        else:
            path = path.resolve()
        return path if path.is_file() else None
    if not PPT_DIR.is_dir():
        return None
    files = sorted(PPT_DIR.glob("*.pptx"), key=lambda p: p.name.lower())
    return files[0] if files else None


def agent_build_pptx(course: dict) -> bytes:
    """
    Build or fetch PPTX binary for course.
    If AGENT_PPTX_URL is configured, calls the external PPTX agent server.
    Otherwise reuses a static template from backend/ppt/ as local-dev fallback.
    """
    if AGENT_PPTX_URL:
        return _call_agent_binary("PPTX", AGENT_PPTX_URL, {"course": course})

    time.sleep(JOB_DELAY)
    template = resolve_ppt_template()
    if not template:
        raise FileNotFoundError(
            f"No PPTX template found. Place a .pptx in {PPT_DIR} "
            "or set PPT_TEMPLATE_FILE to an existing file."
        )
    logger.info(
        "PPT template reuse (no agent): course=%r title=%r template=%s",
        course.get("id"),
        course.get("title"),
        template.name,
    )
    return template.read_bytes()
