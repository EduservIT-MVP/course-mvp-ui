"""
Background worker thread jobs for asynchronous course generation stages.
"""

from __future__ import annotations

import logging
import threading
from flask import current_app
from extensions import db, utcnow
from config import ARTIFACTS_DIR
from models.course import Course
from agents.pptx_agent import agent_build_pptx
from agents.lab_agent import agent_generate_lab
from agents.guide_agent import agent_generate_guide
from agents.plan_agent import agent_generate_plan, agent_regenerate_slides
from services.artifact_service import (
    write_ppt_artifact,
    write_ppt_slide_images,
    write_lab_artifact,
    write_guide_artifact,
)

logger = logging.getLogger(__name__)


def run_bg(fn, *args, **kwargs):
    """Run a callable asynchronously within the active Flask application context."""
    app = current_app._get_current_object()

    def runner():
        with app.app_context():
            try:
                fn(*args, **kwargs)
            except Exception:
                app.logger.exception("Background job failed")

    threading.Thread(target=runner, daemon=True).start()


def _fail(course_id: str, failed_screen: int, message: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    course.status = "FAILED"
    course.failed_screen = failed_screen
    course.error = message
    course.updated_at = utcnow()
    db.session.commit()


def job_generate_plan(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.plan = agent_generate_plan(course.to_dict())
        course.status = "WAITING_FOR_APPROVAL"
        course.stage = "Plan ready for approval"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "Plan generation failed.")


def job_generate_ppt(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        if not course.plan:
            course.plan = agent_generate_plan(course.to_dict())
        course.stage = "Building presentation file…"
        course.updated_at = utcnow()
        db.session.commit()

        pptx = agent_build_pptx(course.to_dict())
        artifact = write_ppt_artifact(course, content=pptx)

        try:
            write_ppt_slide_images(course, ARTIFACTS_DIR / artifact.storage_path)
        except Exception as img_err:
            logger.warning("Optional slide images rendering skipped: %s", img_err)

        course.status = "PPT_READY"
        course.stage = "Presentation ready"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "PPT generation failed.")


def job_regenerate_slides(course_id: str, slides: list, prompt: str, notes: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.plan = agent_regenerate_slides(course.plan, slides, prompt=prompt, notes=notes)
        artifact = write_ppt_artifact(course, content=agent_build_pptx(course.to_dict()))
        try:
            write_ppt_slide_images(course, ARTIFACTS_DIR / artifact.storage_path)
        except Exception as img_err:
            logger.warning("Optional slide images rendering skipped: %s", img_err)
        course.status = "PPT_READY"
        course.stage = "Slides updated"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "Slide regeneration failed.")


def job_generate_lab(course_id: str, lab_input: dict | None = None) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        merged = {**(course.lab or {}), **(lab_input or {})}
        course.lab = agent_generate_lab(course.to_dict(), merged)
        try:
            guide_preview = agent_generate_guide(course.to_dict(), course.lab)
            course.guide = {"plan": guide_preview.get("plan", "No plan provided by agent.")}
        except Exception as e:
            course.guide = {"plan": f"Could not generate plan preview: {e}"}
        course.status = "LAB_REVIEW"
        course.stage = "Lab ready for approval"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 2, str(exc) or "Lab generation failed.")


def job_generate_guide(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        if course.lab:
            write_lab_artifact(course)
        course.guide = agent_generate_guide(course.to_dict(), course.lab)
        write_guide_artifact(course)
        if course.plan and not any(a.type == "ppt" for a in (course.artifacts or [])):
            write_ppt_artifact(course, content=agent_build_pptx(course.to_dict()))
        course.status = "COMPLETE"
        course.stage = "Course package complete"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 3, str(exc) or "Lab guide generation failed.")
