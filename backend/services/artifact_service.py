"""
Artifact persistence, file management, and LibreOffice slide preview generation service.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from config import ARTIFACTS_DIR, LIBREOFFICE_PATH
from extensions import db
from models.artifact import Artifact
from agents.pptx_agent import agent_build_pptx

logger = logging.getLogger(__name__)


def _slug(title: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in (title or "course"))
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "course"


def _size_label(path: Path) -> str:
    size = path.stat().st_size
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def _upsert_artifact(course, *, type_: str, name: str, label: str, mime_type: str, relative_path: str, source_agent: str = None) -> Artifact:
    existing = next((a for a in (course.artifacts or []) if a.type == type_), None)
    abs_path = ARTIFACTS_DIR / relative_path
    size = _size_label(abs_path)
    if existing:
        existing.name = name
        existing.label = label
        existing.mime_type = mime_type
        existing.storage_path = relative_path
        existing.size_label = size
        existing.source_agent = source_agent
        db.session.flush()
        return existing

    if not course.id:
        db.session.add(course)
        db.session.flush()

    artifact = Artifact(
        course_id=course.id,
        source_agent=source_agent,
        type=type_,
        name=name,
        label=label,
        mime_type=mime_type,
        storage_path=relative_path,
        size_label=size,
    )
    if course.artifacts is not None and artifact not in course.artifacts:
        course.artifacts.append(artifact)
    db.session.add(artifact)
    db.session.flush()
    return artifact


def write_ppt_artifact(course, content: bytes | None = None) -> Artifact:
    name = f"{_slug(course.title)}-theory.pptx"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    file_path = path / name
    if content is None:
        try:
            content = agent_build_pptx(course.to_dict())
        except FileNotFoundError:
            content = None
    if content:
        file_path.write_bytes(content)
    else:
        file_path.write_text(
            json.dumps({"format": "stub-pptx", "title": course.title, "plan": course.plan}, indent=2),
            encoding="utf-8",
        )
    return _upsert_artifact(
        course,
        type_="ppt",
        name=name,
        label="Theory / course deck",
        mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        relative_path=rel,
        source_agent="ppt_agent",
    )


def resolve_soffice() -> Path:
    """Locate LibreOffice soffice binary for headless PPTX→PDF conversion."""
    candidates = []
    if LIBREOFFICE_PATH:
        candidates.append(Path(LIBREOFFICE_PATH))
    if os.name == "nt":
        candidates.extend(
            [
                Path(r"C:\Program Files\LibreOffice\program\soffice.com"),
                Path(r"C:\Program Files\LibreOffice\program\soffice.exe"),
                Path(r"C:\Program Files (x86)\LibreOffice\program\soffice.com"),
            ]
        )
    else:
        candidates.extend(
            [
                Path("/opt/homebrew/bin/soffice"),
                Path("/usr/local/bin/soffice"),
                Path("/usr/bin/soffice"),
                Path("/usr/lib/libreoffice/program/soffice"),
                Path("/Applications/LibreOffice.app/Contents/MacOS/soffice"),
            ]
        )
    which = shutil.which("soffice") or shutil.which("soffice.com")
    if which:
        candidates.append(Path(which))
    for path in candidates:
        if path and path.is_file():
            return path
    raise FileNotFoundError(
        "LibreOffice not found. Install LibreOffice or set LIBREOFFICE_PATH "
        "so PPTX can be converted to slide preview images."
    )


def list_slide_images(course_id: str) -> list[dict]:
    if not course_id:
        return []
    slides_dir = ARTIFACTS_DIR / course_id / "slides"
    if not slides_dir.is_dir():
        return []
    files = sorted(slides_dir.glob("slide-*.png"))
    return [
        {
            "index": i,
            "name": f.name,
            "url": f"/courses/{course_id}/slides/{f.name}",
        }
        for i, f in enumerate(files)
    ]


def render_pptx_to_slide_images(pptx_path: Path, slides_dir: Path) -> list[Path]:
    """Faithful preview: LibreOffice PPTX→PDF, then PyMuPDF PDF→PNG per page."""
    pptx_path = Path(pptx_path).resolve()
    if not pptx_path.is_file():
        raise FileNotFoundError(f"PPTX not found: {pptx_path}")
    if pptx_path.stat().st_size < 64 or pptx_path.read_bytes()[:2] != b"PK":
        raise RuntimeError("PPT artifact is not a valid .pptx ZIP — cannot render slide images.")

    slides_dir = Path(slides_dir)
    slides_dir.mkdir(parents=True, exist_ok=True)
    for old in slides_dir.glob("slide-*.png"):
        old.unlink()

    soffice = resolve_soffice()
    work = Path(tempfile.mkdtemp(prefix="pptx_render_"))
    try:
        local = work / "deck.pptx"
        shutil.copy2(pptx_path, local)
        profile = work / "lo_profile"
        profile.mkdir()
        cmd = [
            str(soffice),
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            f"-env:UserInstallation={profile.resolve().as_uri()}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(work),
            str(local),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
        pdf = work / "deck.pdf"
        if proc.returncode != 0 or not pdf.is_file():
            detail = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
            raise RuntimeError(f"LibreOffice PPTX→PDF failed: {detail}")

        import pymupdf

        doc = pymupdf.open(pdf)
        paths: list[Path] = []
        try:
            zoom = pymupdf.Matrix(2, 2)
            for i, page in enumerate(doc, start=1):
                pix = page.get_pixmap(matrix=zoom, alpha=False)
                dest = slides_dir / f"slide-{i:02d}.png"
                pix.save(dest)
                paths.append(dest)
        finally:
            doc.close()
        if not paths:
            raise RuntimeError("PDF conversion produced zero pages.")
        logger.info("Rendered %s slide image(s) from %s", len(paths), pptx_path.name)
        return paths
    finally:
        shutil.rmtree(work, ignore_errors=True)


def write_ppt_slide_images(course, pptx_path: Path | None = None) -> list[dict]:
    """Render slide PNGs next to the course pptx artifact."""
    if pptx_path is None:
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
            raise FileNotFoundError("No PPT artifact to render.")
        pptx_path = ARTIFACTS_DIR / ppt.storage_path
    slides_dir = ARTIFACTS_DIR / course.id / "slides"
    render_pptx_to_slide_images(pptx_path, slides_dir)
    return list_slide_images(course.id)


def write_lab_artifact(course) -> Artifact:
    name = f"{_slug(course.title)}-lab.js"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    files = ((course.lab or {}).get("code") or {}).get("files") or []
    content = "\n".join(f"// {f.get('path')}\n{f.get('content', '')}" for f in files) or f"// Lab for {course.title}\n"
    (path / name).write_text(content, encoding="utf-8")
    return _upsert_artifact(course, type_="lab-code", name=name, label="Lab code", mime_type="text/javascript", relative_path=rel, source_agent="lab_generation")


def write_guide_artifact(course) -> Artifact:
    name = f"{_slug(course.title)}-guide.json"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    (path / name).write_text(json.dumps(course.guide or {}, indent=2), encoding="utf-8")
    return _upsert_artifact(course, type_="lab-guide", name=name, label="Lab guide", mime_type="application/json", relative_path=rel, source_agent="lab_guide")
