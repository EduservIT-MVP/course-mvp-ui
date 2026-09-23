"""
Artifact and media serving routes: downloads, PPTX streaming, and slide preview images.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from flask import Blueprint, send_file
from extensions import db, ok, err
from config import ARTIFACTS_DIR
from models.course import Course
from models.artifact import Artifact
from auth.security import require_permission

artifacts_bp = Blueprint("artifacts", __name__)

# Sample guide candidates (mirrors mock_agents_server.py priority order)
_BASE_DIR = Path(__file__).resolve().parent.parent
_GUIDE_SAMPLES = [
    _BASE_DIR / "ppt" / "Lab VM walkthrough.pdf",
    _BASE_DIR / "ppt" / "lab_guide_sample.pdf",
    _BASE_DIR / "ppt" / "lab_guide_sample.docx",
]

# Map of file magic bytes → mime type
_MAGIC_MIME = [
    (b"%PDF",       "application/pdf"),
    (b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
]

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_SANE_MIMES = {"application/pdf", _DOCX_MIME, "application/msword"}


def _get_sample_guide() -> tuple[Path, str] | tuple[None, None]:
    """Return (path, mime_type) for the best available sample guide file."""
    ext_mime = {".pdf": "application/pdf", ".docx": _DOCX_MIME, ".doc": "application/msword"}
    for p in _GUIDE_SAMPLES:
        if p.is_file():
            return p, ext_mime.get(p.suffix.lower(), "application/pdf")
    return None, None


def _sniff_mime(path: Path, artifact) -> str:
    """Detect mime type from file magic bytes.
    If the file is stale JSON (old artifact), auto-repairs it by copying the
    real sample guide PDF/DOCX onto disk and updating the artifact DB record.
    Returns the correct mime type to use for serving.
    """
    try:
        with open(path, "rb") as fh:
            head = fh.read(8)

        # Check magic bytes first
        for magic, mime in _MAGIC_MIME:
            if head[:len(magic)] == magic:
                # Self-heal stale DB mime_type
                if artifact and artifact.mime_type != mime:
                    artifact.mime_type = mime
                    db.session.commit()
                return mime

        # If it's JSON (old stale artifact) — auto-repair
        if head[:1] in (b"{", b"["):
            sample_path, sample_mime = _get_sample_guide()
            if sample_path:
                # Copy real guide file over the stale JSON
                new_name = path.stem.replace("-guide", "-guide") + Path(sample_path).suffix
                new_path = path.parent / new_name
                shutil.copy2(sample_path, new_path)
                # Remove old JSON file if different path
                if new_path != path:
                    try:
                        path.unlink(missing_ok=True)
                    except OSError:
                        pass
                # Update artifact DB record
                if artifact:
                    artifact.mime_type = sample_mime
                    artifact.name = new_name
                    artifact.storage_path = str(Path(artifact.storage_path).parent / new_name)
                    db.session.commit()
                return sample_mime

    except OSError:
        pass

    # Already-sane stored mime
    if artifact and artifact.mime_type in _SANE_MIMES:
        return artifact.mime_type

    return "application/pdf"


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
    mime = _sniff_mime(path, artifact)
    # Re-read path in case auto-repair renamed it
    path = ARTIFACTS_DIR / artifact.storage_path
    return send_file(path, mimetype=mime, as_attachment=True, download_name=artifact.name)


@artifacts_bp.get("/courses/<course_id>/artifacts/<artifact_id>/view")
def view_artifact(course_id: str, artifact_id: str):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    artifact = db.session.get(Artifact, artifact_id)
    if not artifact or artifact.course_id != course.id:
        return err("File not found.", "not_found", 404)
    path = ARTIFACTS_DIR / artifact.storage_path
    if not path.exists():
        return err("File missing on disk.", "not_found", 404)
    mime = _sniff_mime(path, artifact)
    # Re-read path in case auto-repair renamed it
    path = ARTIFACTS_DIR / artifact.storage_path
    return send_file(path, mimetype=mime, as_attachment=False)


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
