"""
PPTX presentation generation agent client and template resolver.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
import config
from config import BASE_DIR, PPT_DIR, PPT_TEMPLATE_FILE, AGENT_PPTX_URL
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

    time.sleep(config.JOB_DELAY)
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
import re
import time
import random


def _split_list(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def _primary_topic(course: dict) -> str:
    topics = _split_list(course.get("topics"))
    if topics:
        return topics[0]
    title = (course.get("title") or "").strip()
    return title or "this topic"


def _body_lines_from_block(text: str) -> list[str]:
    lines = []
    for raw in (text or "").split("\n"):
        ln = raw.strip()
        if not ln:
            continue
        if ln.startswith(("-", "*", "•")):
            lines.append(ln.lstrip("-*•").strip())
        elif lines:
            lines[-1] = f"{lines[-1]} {ln}"
        else:
            lines.append(ln)
    return lines


def parse_agent_plan_text(raw: str, *, level: str = "COURSE", course_title: str = "Course") -> dict:
    """
    Parse agent markdown-ish text into plan.slides.
    Expects blocks like:
      ** Core Concept **
      - bullet one
      - bullet two
    """
    text = (raw or "").replace("\r\n", "\n").strip()
    if not text:
        return {"summary": course_title, "sections": 0, "slides": [], "raw": raw}

    header_re = re.compile(r"\*\*\s*(.+?)\s*\*\*", re.MULTILINE)
    parts = header_re.split(text)
    slides = []
    idx = 1
    start = 1 if len(parts) > 1 else 0
    if start == 0 and parts:
        body_lines = _body_lines_from_block(parts[0])
        slides.append(
            {
                "id": 1,
                "title": f"1. {course_title}",
                "kicker": (level or "COURSE").upper(),
                "heading": course_title,
                "body": "\n".join(f"• {ln}" for ln in body_lines) if body_lines else "• Course overview",
                "notes": "Generated from unstructured agent output.",
            }
        )
        return {
            "summary": f"{course_title} · 1 slide",
            "sections": 1,
            "slides": slides,
            "raw": raw,
        }

    i = start
    while i < len(parts):
        header = (parts[i] or "").strip()
        body_chunk = parts[i + 1] if i + 1 < len(parts) else ""
        i += 2
        if not header:
            continue
        cleaned_title = re.sub(r"^\d+[\.\)]\s*", "", header).strip()
        lines = _body_lines_from_block(body_chunk)
        heading = lines[0] if lines else cleaned_title
        rest = lines[1:] if len(lines) > 1 else lines
        bullet_body = "\n".join(f"• {ln}" for ln in rest) if rest else f"• {heading}"
        slides.append(
            {
                "id": idx,
                "title": f"{idx}. {cleaned_title}",
                "kicker": (level or "COURSE").upper(),
                "heading": heading,
                "body": bullet_body,
                "notes": f"Presenter notes for {cleaned_title}. Emphasize key takeaways and practitioner trade-offs.",
            }
        )
        idx += 1

    return {
        "summary": f"{course_title} · {len(slides)} slides",
        "sections": max(1, len(slides)),
        "slides": slides,
        "raw": raw,
    }


def _compose_course_content_agent_text(course: dict) -> str:
    """Course-content agent stub: emit ** Section ** shape grounded in the brief."""
    title = (course.get("title") or "Course").strip() or "Course"
    topic = _primary_topic(course)
    topics = _split_list(course.get("topics"))
    other_topic = topics[1] if len(topics) > 1 else "alternative approaches"
    raw_objs = _split_list(course.get("objectives"))
    obj_line = (
        "; ".join(raw_objs)
        if raw_objs
        else f"Apply {topic} confidently in real scenarios."
    )
    raw = f"""
** Core Concept **
- {topic} is the core idea this course teaches for practitioners.
- Learners should leave able to: {obj_line}.
- Keep the definition short, precise, and free of vendor jargon.
- Anchor every later slide back to this definition.

** Comparison **
- Contrast {topic} with the default approach teams use today.
- Call out when {topic} is the better fit, and when it is not.
- Highlight one trade-off (security, UX, or operations) practitioners will feel.
- Map {topic} against {other_topic}.

** Real-World Example **
- Walk through a concrete intermediate scenario using {topic}.
- Show the before state (pain) and after state (with {topic}).
- Name the roles involved and the decision each role owns.
- Capture one failure mode teams actually hit in production.

** Best Practices **
- Start with a narrow scope before expanding {topic}.
- Prefer explicit contracts and checkable outcomes over vague guidance.
- Document assumptions so the lab can validate them.
- Review {topic} decisions against the course objectives.

** Flow **
- Introduce the goal -> define {topic} -> compare options -> apply in a scenario.
- Sequence slides so each step unlocks the next decision.
- Reserve time for questions before the hands-on lab.
- End the flow with a short "what good looks like" checklist.
- (Regeneration ID: {random.randint(1000, 9999)})

** Remember This **
- {topic} matters because practitioners must make better decisions under pressure.
- One crisp takeaway: apply {topic} deliberately, then verify with evidence.
- Point learners to the lab for practice, not more slides.
- Revisit this slide if discussion drifts into tooling details.
""".strip()
    return raw


def agent_generate_ppt_plan(course: dict) -> dict:
    """Return { summary, sections, slides:[{id,title,kicker,heading,body,notes}] }."""
    time.sleep(config.JOB_DELAY)
    level = (course.get("level") or "COURSE").strip() or "COURSE"
    title = (course.get("title") or "Course").strip() or "Course"
    raw = _compose_course_content_agent_text(course)
    plan = parse_agent_plan_text(raw, level=level, course_title=title)
    plan["summary"] = (
        f"{title} · {course.get('duration') or 'flexible'} · {level} · {len(plan.get('slides') or [])} slides"
    )
    return plan


def agent_regenerate_slides(plan: dict, targets: list, prompt: str = "", notes: str = "") -> dict:
    time.sleep(config.JOB_DELAY)
    next_plan = dict(plan or {"summary": "", "sections": 1, "slides": []})
    slides = list(next_plan.get("slides") or [])
    for target in targets or []:
        at = -1
        for i, item in enumerate(slides):
            if str(item.get("id")) == str(target.get("id")):
                at = i
                break
            if target.get("index") is not None and i == int(target["index"]):
                at = i
                break
        if at < 0:
            continue
        updated = dict(slides[at])
        if prompt:
            lines = [ln.strip() for ln in str(prompt).split("\n") if ln.strip()]
            updated["body"] = "\n".join(
                ln if ln.startswith("•") or ln.startswith("-") else f"• {ln}" for ln in lines
            )
        if notes or prompt:
            updated["notes"] = notes or prompt
        slides[at] = updated
    next_plan["slides"] = slides
    return next_plan
