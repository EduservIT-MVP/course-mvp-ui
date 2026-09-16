"""
Artifact and media serving routes: downloads, PPTX streaming, and slide preview images.
"""

from __future__ import annotations

import re
from flask import Blueprint, send_file
from extensions import db, ok, err
from config import ARTIFACTS_DIR
from models.course import Course
from models.artifact import Artifact
from auth.security import require_permission

artifacts_bp = Blueprint("artifacts", __name__)


def get_course(course_id: str) -> Course | None:
    return db.session.get(Course, course_id)


@artifacts_bp.get("/courses/<course_id>/artifacts")
@require_permission("artifacts:download")
def list_artifacts(course_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    return ok({"artifacts": [a.to_dict() for a in (course.artifacts or [])]})


@artifacts_bp.get("/courses/<course_id>/artifacts/<artifact_id>/download")
@require_permission("artifacts:download")
def download_artifact(course_id: str, artifact_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    artifact = db.session.get(Artifact, artifact_id)
    if not artifact or artifact.course_id != course.id:
        return err("File not found.", "not_found", 404)
    path = ARTIFACTS_DIR / artifact.storage_path
    if not path.exists():
        return err("File missing on disk.", "not_found", 404)
    return send_file(path, mimetype=artifact.mime_type or "application/octet-stream", as_attachment=True, download_name=artifact.name)


@artifacts_bp.get("/courses/<course_id>/ppt")
@require_permission("course:view")
def get_course_ppt(course_id: str):
    """Serve the course PPTX file directly for in-browser presentation rendering."""
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    ppt = next(
        (
            a
            for a in (course.artifacts or [])
            if str(a.type or "").lower() == "ppt" or str(a.name or "").lower().endswith(".pptx")
        ),
        None,
    )
    if not ppt:
        ppt = Artifact.query.filter_by(course_id=course.id, type="ppt").first()
    if not ppt:
        return err("PPT presentation not found.", "not_found", 404)
    path = ARTIFACTS_DIR / ppt.storage_path
    if not path.is_file():
        return err("PPT file missing on disk.", "not_found", 404)
    return send_file(
        path,
        mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        as_attachment=False,
        download_name=ppt.name,
    )


@artifacts_bp.get("/courses/<course_id>/slides/<filename>")
@require_permission("course:view")
def get_slide_image(course_id: str, filename: str):
    """Serve a pre-rendered slide PNG for in-browser preview (not the downloadable .pptx)."""
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    if not re.fullmatch(r"slide-\d{2}\.png", filename or ""):
        return err("Invalid slide image.", "validation", 400)
    path = ARTIFACTS_DIR / course.id / "slides" / filename
    if path.name != filename or not path.is_file():
        return err("Slide image not found.", "not_found", 404)
    return send_file(path, mimetype="image/png", as_attachment=False, download_name=filename)
