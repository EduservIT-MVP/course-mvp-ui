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
    existing = next(
        (a for a in (course.artifacts or []) if a.name == name or (a.type == type_ and a.type in {"ppt", "lab-guide"})),
        None,
    )
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
            json.dumps({"format": "stub-pptx", "title": course.title, "plan": getattr(course, "ppt_plan", None)}, indent=2),
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


def write_lab_artifacts(course) -> list[Artifact]:
    """
    Persist all lab artifacts returned by the lab agent (mock or real external).
    Supports:
    1. course.lab['artifacts'] = [{ name, label, content, type, mime_type }]
    2. course.lab['files'] = [{ path/name, content }]
    3. course.lab['code']['files']
    4. fallback starter template
    """
    lab_data = course.lab or {}
    artifacts_created = []
    course_dir = ARTIFACTS_DIR / course.id
    course_dir.mkdir(parents=True, exist_ok=True)
    slug = _slug(course.title)

    agent_artifacts = lab_data.get("artifacts")
    if isinstance(agent_artifacts, list) and agent_artifacts:
        for item in agent_artifacts:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or f"{slug}-artifact.js"
            label = item.get("label") or name
            type_ = item.get("type") or "lab-code"
            mime_type = item.get("mime_type") or "text/javascript"
            content = item.get("content") or ""

            file_path = course_dir / name
            if isinstance(content, bytes):
                file_path.write_bytes(content)
            else:
                file_path.write_text(str(content), encoding="utf-8")

            art = _upsert_artifact(
                course,
                type_=type_,
                name=name,
                label=label,
                mime_type=mime_type,
                relative_path=f"{course.id}/{name}",
                source_agent="lab_agent",
            )
            artifacts_created.append(art)
        return artifacts_created

    # Check files list
    files = lab_data.get("files") or (lab_data.get("code") or {}).get("files")
    if isinstance(files, list) and files:
        for f in files:
            if isinstance(f, dict):
                fname = Path(f.get("path") or f.get("name") or "app.js").name
                fcontent = f.get("content", "")
                fpath = course_dir / fname
                fpath.write_text(str(fcontent), encoding="utf-8")
                art = _upsert_artifact(
                    course,
                    type_="lab-code",
                    name=fname,
                    label=f.get("label") or f"Lab {fname}",
                    mime_type=f.get("mime_type") or "text/javascript",
                    relative_path=f"{course.id}/{fname}",
                    source_agent="lab_agent",
                )
                artifacts_created.append(art)
        return artifacts_created

    # Fallback default lab artifact
    name = f"{slug}-lab.js"
    content = f"// Hands-on Lab for {course.title}\n// Runtime: {lab_data.get('environment', 'Standard')}\n\nconsole.log('Lab initialized successfully');\n"
    (course_dir / name).write_text(content, encoding="utf-8")
    art = _upsert_artifact(
        course,
        type_="lab-code",
        name=name,
        label="Starter Implementation",
        mime_type="text/javascript",
        relative_path=f"{course.id}/{name}",
        source_agent="lab_agent",
    )
    return [art]


def write_lab_artifact(course) -> Artifact:
    arts = write_lab_artifacts(course)
    return arts[0] if arts else None


def _detect_guide_mime(content: bytes) -> tuple[str, str]:
    """Detect mime type and file extension from raw bytes.
    Returns (mime_type, extension).
    """
    if content and len(content) >= 4:
        # PDF: starts with %PDF
        if content[:4] == b"%PDF":
            return "application/pdf", ".pdf"
        # DOCX / XLSX / PPTX: ZIP format starting with PK..
        if content[:2] == b"PK":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"
    return "application/pdf", ".pdf"


def write_guide_artifact(course, content: bytes = None, mime_type: str = None) -> Artifact:
    """Write lab guide artifact to disk. Auto-detects PDF vs DOCX from content bytes."""
    slug = _slug(course.title)
    if content and not mime_type:
        mime_type, ext = _detect_guide_mime(content)
    elif mime_type:
        # Derive extension from explicit mime_type
        _mime_ext = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/msword": ".doc",
        }
        ext = _mime_ext.get(mime_type, ".pdf")
    else:
        mime_type, ext = "application/pdf", ".pdf"

    name = f"{slug}-guide{ext}"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    if content:
        (path / name).write_bytes(content)
    else:
        (path / name).write_text(json.dumps(course.guide or {}, indent=2), encoding="utf-8")
    return _upsert_artifact(course, type_="lab-guide", name=name, label="Lab guide", mime_type=mime_type, relative_path=rel, source_agent="lab_guide")

