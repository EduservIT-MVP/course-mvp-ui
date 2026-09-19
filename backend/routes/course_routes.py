"""
Course management, curriculum planning, and agent generation routes.
"""

from __future__ import annotations

import shutil
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from datetime import timezone
from extensions import db, ok, err, utcnow
from config import ARTIFACTS_DIR
from models.course import Course
from auth.security import require_permission
from services.job_service import (
    job_generate_plan,
    job_generate_ppt,
    job_regenerate_slides,
    job_generate_lab,
    job_generate_guide,
)

courses_bp = Blueprint("courses", __name__, url_prefix="/courses")


def get_course(course_id: str) -> Course | None:
    return db.session.get(Course, course_id)


def apply_brief(course: Course, body: dict) -> None:
    for key in ("title", "audience", "level", "duration", "objectives", "topics", "category"):
        if key in body:
            setattr(course, key, body.get(key) or (getattr(course, key) if key in ("title", "level", "duration") else ""))
    if isinstance(body.get("lab"), dict):
        course.lab = {**(course.lab or {}), **body["lab"]}


@courses_bp.get("")
@require_permission("course:list")
def list_courses():
    category = request.args.get("category")
    query = Course.query
    
    if category:
        if category == "Uncategorized":
            query = query.filter((Course.category.is_(None)) | (Course.category == ""))
        else:
            query = query.filter(Course.category == category)
            
    items = query.order_by(Course.updated_at.desc()).all()
    return ok({"courses": [c.to_dict() for c in items]})


@courses_bp.post("")
@require_permission("course:create")
def create_course():
    body = request.get_json(silent=True) or {}
    lab = body.get("lab") if isinstance(body.get("lab"), dict) else {}
    course = Course(
        title=body.get("title") or "Untitled course",
        category=body.get("category") or "Uncategorized",
        audience=body.get("audience") or "",
        level=body.get("level") or "Intermediate",
        duration=body.get("duration") or "90 minutes",
        objectives=body.get("objectives") or "",
        topics=body.get("topics") or "",
        lab={
            "scenario": lab.get("scenario") or "",
            "environment": lab.get("environment") or "Browser workspace",
            "assets": lab.get("assets") or "",
        },
        status="SELECT_COURSE",
        owner_id=get_jwt_identity(),
    )
    db.session.add(course)
    db.session.commit()
    return ok(course.to_dict(), 201)


@courses_bp.get("/<course_id>")
@require_permission("course:view")
def get_course_route(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
        
    # Auto-recover stuck generations if the worker died (timeout after 5 mins)
    if course.status and "GENERATING" in course.status:
        updated_aware = course.updated_at.replace(tzinfo=timezone.utc) if course.updated_at else utcnow()
        elapsed = (utcnow() - updated_aware).total_seconds()
        if elapsed > 300:  # 5 minutes timeout
            course.status = "FAILED"
            course.error = "Agent generation timed out or the worker was interrupted. Please try again."
            db.session.commit()
            
    return ok(course.to_dict())


@courses_bp.patch("/<course_id>")
@require_permission("course:update")
def update_course(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    apply_brief(course, request.get_json(silent=True) or {})
    course.updated_at = utcnow()
    db.session.commit()
    return ok(course.to_dict())


@courses_bp.delete("/<course_id>")
@require_permission("course:delete")
def delete_course(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    title = course.title
    course_dir = ARTIFACTS_DIR / course.id
    db.session.delete(course)
    db.session.commit()
    if course_dir.exists():
        shutil.rmtree(course_dir, ignore_errors=True)
    return ok({"ok": True, "id": course_id, "title": title})


@courses_bp.post("/<course_id>/plan/generate")
@require_permission("plan:generate")
def plan_generate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    if course.status not in {"SELECT_COURSE", "FAILED", "WAITING_FOR_APPROVAL", "PLAN_REVIEW"}:
        if not course.can_transition_to("PLAN_GENERATING"):
            return err(f"Cannot generate plan from status {course.status}.", "invalid_transition", 409)
    try:
        course.transition_to("PLAN_GENERATING", failed_screen=1)
    except ValueError as exc:
        return err(str(exc), "invalid_transition", 409)
    course.stage = "Generating course plan"
    db.session.commit()
    job_generate_plan.delay(course.id)
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/plan/regenerate")
@require_permission("plan:regenerate")
def plan_regenerate(course_id: str):
    return plan_generate(course_id)


@courses_bp.post("/<course_id>/plan/approve")
@require_permission("plan:approve")
def plan_approve(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    if course.status not in {"WAITING_FOR_APPROVAL", "PLAN_REVIEW"}:
        return err(f"Plan can only be approved from WAITING_FOR_APPROVAL/PLAN_REVIEW (got {course.status}).", "invalid_transition", 409)
    try:
        course.transition_to("PPT_GENERATING", failed_screen=1)
    except ValueError as exc:
        return err(str(exc), "invalid_transition", 409)
    course.stage = "Generating presentation"
    db.session.commit()
    job_generate_ppt.delay(course.id)
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/ppt/generate")
@require_permission("ppt:generate")
def ppt_generate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    try:
        course.transition_to("PPT_GENERATING", failed_screen=1)
    except ValueError as exc:
        return err(str(exc), "invalid_transition", 409)
    course.stage = "Generating presentation"
    db.session.commit()
    job_generate_ppt.delay(course.id)
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/ppt/regenerate")
@require_permission("ppt:regenerate")
def ppt_regenerate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    if course.status in {"PPT_READY", "FAILED", "REGENERATE"}:
        course.status = "PPT_GENERATING"
        course.failed_screen = 1
        course.error = None
        course.updated_at = utcnow()
    else:
        try:
            course.transition_to("PPT_GENERATING", failed_screen=1)
        except ValueError as exc:
            return err(str(exc), "invalid_transition", 409)
    course.stage = "Regenerating presentation"
    db.session.commit()
    job_generate_ppt.delay(course.id)
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/ppt/slides/regenerate")
@require_permission("ppt:regenerate")
def ppt_slides_regenerate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    body = request.get_json(silent=True) or {}
    course.status = "PPT_GENERATING"
    course.failed_screen = 1
    course.error = None
    course.stage = "Regenerating tagged slides"
    course.updated_at = utcnow()
    db.session.commit()
    job_regenerate_slides.delay(course.id, body.get("slides") or [], body.get("prompt") or "", body.get("notes") or body.get("prompt") or "")
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/lab/generate")
@require_permission("lab:generate")
def lab_generate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    body = request.get_json(silent=True) or {}
    if course.status not in {"PPT_READY", "LAB_REVIEW", "FAILED"}:
        if not course.can_transition_to("LAB_GENERATING"):
            return err(f"Cannot generate lab from status {course.status}.", "invalid_transition", 409)
    if isinstance(body, dict) and body:
        course.lab = {**(course.lab or {}), **body}
    course.status = "LAB_GENERATING"
    course.failed_screen = 2
    course.error = None
    course.stage = "Generating lab"
    course.updated_at = utcnow()
    db.session.commit()
    job_generate_lab.delay(course.id, body if isinstance(body, dict) else {})
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/lab/regenerate")
@require_permission("lab:regenerate")
def lab_regenerate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    course.status = "LAB_GENERATING"
    course.failed_screen = 2
    course.error = None
    course.stage = "Regenerating lab"
    course.updated_at = utcnow()
    db.session.commit()
    job_generate_lab.delay(course.id, course.lab or {})
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/lab/approve")
@require_permission("lab:approve")
def lab_approve(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    if course.status != "LAB_REVIEW":
        return err(f"Lab can only be approved from LAB_REVIEW (got {course.status}).", "invalid_transition", 409)
    course.status = "LAB_GUIDE_GENERATING"
    course.failed_screen = 3
    course.error = None
    course.stage = "Generating lab guide"
    course.updated_at = utcnow()
    db.session.commit()
    job_generate_guide.delay(course.id)
    return ok(course.to_dict())


@courses_bp.post("/<course_id>/lab-guide/generate")
@require_permission("guide:generate")
def lab_guide_generate(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    course.status = "LAB_GUIDE_GENERATING"
    course.failed_screen = 3
    course.error = None
    course.stage = "Generating lab guide"
    course.updated_at = utcnow()
    db.session.commit()
    job_generate_guide.delay(course.id)
    return ok(course.to_dict())
