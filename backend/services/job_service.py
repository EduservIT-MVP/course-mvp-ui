"""
Background worker thread jobs for asynchronous course generation stages.
"""

from __future__ import annotations

import logging
from flask import current_app
from extensions import db, utcnow
from celery import shared_task
from config import ARTIFACTS_DIR
from models.course import Course
from agents.pptx_agent import agent_build_pptx, agent_generate_ppt_plan, agent_regenerate_slides
from agents.lab_agent import agent_generate_lab, agent_generate_lab_plan
from agents.guide_agent import agent_generate_guide, agent_generate_guide_plan
from services.artifact_service import (
    write_ppt_artifact,
    write_ppt_slide_images,
    write_lab_artifact,
    write_lab_artifacts,
    write_guide_artifact,
)


logger = logging.getLogger(__name__)



def _fail(course_id: str, failed_screen: int, message: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    course.status = "FAILED"
    course.failed_screen = failed_screen
    course.error = message
    course.updated_at = utcnow()
    db.session.commit()


@shared_task(ignore_result=True)
def job_generate_ppt_plan(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.ppt_plan = agent_generate_ppt_plan(course.to_dict())
        course.status = "PPT_PLAN_REVIEW"
        course.stage = "PPT Plan ready for approval"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "PPT Plan generation failed.")


@shared_task(ignore_result=True)
def job_generate_ppt(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        if not course.ppt_plan:
            course.ppt_plan = agent_generate_ppt_plan(course.to_dict())
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


@shared_task(ignore_result=True)
def job_regenerate_slides(course_id: str, slides: list, prompt: str, notes: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.ppt_plan = agent_regenerate_slides(course.ppt_plan, slides, prompt=prompt, notes=notes)
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


@shared_task(ignore_result=True)
def job_generate_lab_plan(course_id: str, lab_input: dict | None = None) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        merged = {**(course.lab_plan or {}), **(lab_input or {})}
        course.lab_plan = agent_generate_lab_plan(course.to_dict(), merged)
        course.status = "LAB_PLAN_REVIEW"
        course.stage = "Lab plan ready for review"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 2, str(exc) or "Lab plan generation failed.")

@shared_task(ignore_result=True)
def job_generate_lab(course_id: str, lab_input: dict | None = None) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        merged = {**(course.lab or {}), **(lab_input or {})}
        course.lab = agent_generate_lab(course.to_dict(), merged)
        if course.lab:
            try:
                write_lab_artifacts(course)
            except Exception as art_err:
                logger.warning("Could not write lab artifacts: %s", art_err)
        course.status = "LAB_REVIEW"
        course.stage = "Lab environment ready"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 2, str(exc) or "Lab generation failed.")


@shared_task(ignore_result=True)
def job_generate_guide_plan(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.guide_plan = agent_generate_guide_plan(course.to_dict(), course.lab)
        course.status = "LAB_GUIDE_PLAN_REVIEW"
        course.stage = "Lab Guide plan ready for approval"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 3, str(exc) or "Lab guide plan generation failed.")


@shared_task(ignore_result=True)
def job_generate_guide(course_id: str) -> None:
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        if course.lab:
            write_lab_artifacts(course)
        guide_bytes = agent_generate_guide(course.to_dict(), course.lab)
        write_guide_artifact(course, content=guide_bytes)
        course.guide = {"name": f"{course.title or 'Course'} Lab Guide.pdf", "pdf_generated": True}
        if (course.ppt_plan or getattr(course, "plan", None)) and not any(a.type == "ppt" for a in (course.artifacts or [])):
            write_ppt_artifact(course, content=agent_build_pptx(course.to_dict()))
        course.status = "COMPLETE"
        course.stage = "Course package complete"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 3, str(exc) or "Lab guide generation failed.")

