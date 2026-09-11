"""
CourseForge API — single-file Flask backend.

Run:
  python app.py              # serve on :8080
  python app.py seed         # demo users + sample courses
  python app.py smoke        # end-to-end HTTP smoke test

Docs:
  http://127.0.0.1:8080/docs           # Swagger UI
  http://127.0.0.1:8080/openapi.json   # OpenAPI 3 JSON

Replace the stub functions in the AGENT HOOKS section when real agents are ready.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    verify_jwt_in_request,
)
from flask_sqlalchemy import SQLAlchemy
from flask_swagger_ui import get_swaggerui_blueprint
from sqlalchemy import JSON
from werkzeug.security import check_password_hash, generate_password_hash
import yaml

# ── Config ───────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", str(BASE_DIR / "artifacts"))).resolve()
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
# Static PPTX templates (no PPT agent yet) — copy only; never mutate files in this folder.
PPT_DIR = Path(os.getenv("PPT_TEMPLATE_DIR", str(BASE_DIR / "ppt"))).resolve()
PPT_DIR.mkdir(parents=True, exist_ok=True)
LIBREOFFICE_PATH = (os.getenv("LIBREOFFICE_PATH") or "").strip()
JOB_DELAY = float(os.getenv("JOB_STUB_DELAY_SECONDS", "2"))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if o.strip()
]

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", app.config["SECRET_KEY"])
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", f"sqlite:///{BASE_DIR / 'courseforge.db'}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(
    app,
    resources={r"/*": {"origins": CORS_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition", "Content-Type"],
)

# Swagger UI — OpenAPI spec at /openapi.json, interactive docs at /docs
OPENAPI_PATH = BASE_DIR / "openapi.yaml"
SWAGGER_URL = "/docs"
swagger_ui = get_swaggerui_blueprint(
    SWAGGER_URL,
    "/openapi.json",
    config={
        "app_name": "CourseForge API",
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "tryItOutEnabled": True,
    },
)
app.register_blueprint(swagger_ui, url_prefix=SWAGGER_URL)

# ── Roles ────────────────────────────────────────────────────────────────────

ROLE_PERMISSIONS = {
    "admin": ["*"],
    "instructor": [
        "course:create",
        "course:list",
        "course:view",
        "course:update",
        "course:delete",
        "plan:generate",
        "plan:approve",
        "plan:regenerate",
        "ppt:generate",
        "ppt:regenerate",
        "ppt:download",
        "lab:generate",
        "lab:approve",
        "lab:regenerate",
        "guide:generate",
        "artifacts:download",
    ],
    "reviewer": [
        "course:list",
        "course:view",
        "plan:approve",
        "plan:regenerate",
        "ppt:regenerate",
        "ppt:download",
        "lab:approve",
        "lab:regenerate",
        "artifacts:download",
    ],
    "learner": ["course:list", "course:view", "ppt:download", "artifacts:download"],
}

ALLOWED_TRANSITIONS = {
    "SELECT_COURSE": {"PLAN_GENERATING", "FAILED"},
    "PLAN_GENERATING": {"WAITING_FOR_APPROVAL", "PLAN_REVIEW", "FAILED"},
    "PLAN_REVIEW": {"PLAN_GENERATING", "WAITING_FOR_APPROVAL", "PPT_GENERATING", "FAILED"},
    "WAITING_FOR_APPROVAL": {"PLAN_GENERATING", "PPT_GENERATING", "FAILED"},
    "PPT_GENERATING": {"PPT_READY", "FAILED"},
    "PPT_READY": {"PPT_GENERATING", "LAB_GENERATING", "REGENERATE", "FAILED"},
    "LAB_GENERATING": {"LAB_REVIEW", "FAILED"},
    "LAB_REVIEW": {"LAB_GENERATING", "LAB_GUIDE_GENERATING", "FAILED"},
    "LAB_GUIDE_GENERATING": {"COMPLETE", "FAILED"},
    "COMPLETE": {"FAILED"},
    "REGENERATE": {"PPT_GENERATING", "PPT_READY", "FAILED"},
    "FAILED": {
        "SELECT_COURSE",
        "PLAN_GENERATING",
        "PPT_GENERATING",
        "LAB_GENERATING",
        "LAB_GUIDE_GENERATING",
    },
}


def utcnow():
    return datetime.now(timezone.utc)


def err(message, code, status=400):
    return jsonify({"message": message, "code": code}), status


def ok(payload, status=200):
    return jsonify(payload), status


# ── Models ───────────────────────────────────────────────────────────────────


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, default="")
    role = db.Column(db.String(32), nullable=False, default="instructor")
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    courses = db.relationship("Course", back_populates="owner", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def permissions(self):
        return list(ROLE_PERMISSIONS.get(self.role, []))

    def has_permission(self, permission):
        grants = self.permissions
        return "*" in grants or permission in grants

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "permissions": self.permissions,
        }


class Course(db.Model):
    __tablename__ = "courses"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status = db.Column(db.String(64), nullable=False, default="SELECT_COURSE", index=True)
    title = db.Column(db.String(255), nullable=False, default="Untitled course")
    audience = db.Column(db.Text, nullable=False, default="")
    level = db.Column(db.String(64), nullable=False, default="Intermediate")
    duration = db.Column(db.String(64), nullable=False, default="90 minutes")
    objectives = db.Column(db.Text, nullable=False, default="")
    topics = db.Column(db.Text, nullable=False, default="")
    plan = db.Column(JSON, nullable=True)
    lab = db.Column(JSON, nullable=True)
    guide = db.Column(JSON, nullable=True)
    error = db.Column(db.Text, nullable=True)
    failed_screen = db.Column(db.Integer, nullable=False, default=0)
    stage = db.Column(db.String(255), nullable=True)
    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    owner = db.relationship("User", back_populates="courses")
    artifacts = db.relationship(
        "Artifact",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="joined",
        order_by="Artifact.created_at",
    )

    def can_transition_to(self, new_status):
        if new_status == self.status:
            return True
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())

    def transition_to(self, new_status, failed_screen=None, error=None):
        if not self.can_transition_to(new_status):
            raise ValueError(f"Invalid transition {self.status} -> {new_status}")
        self.status = new_status
        if failed_screen is not None:
            self.failed_screen = failed_screen
        if error is not None:
            self.error = error
        elif new_status != "FAILED":
            self.error = None
        self.updated_at = utcnow()

    def to_dict(self):
        artifact_dicts = [a.to_dict() for a in (self.artifacts or [])]
        ppt = next(
            (
                a
                for a in artifact_dicts
                if "ppt" in str(a.get("type", "")).lower()
                or str(a.get("name", "")).lower().endswith((".pptx", ".ppt"))
            ),
            None,
        )
        return {
            "id": self.id,
            "status": self.status,
            "title": self.title,
            "audience": self.audience or "",
            "level": self.level or "Intermediate",
            "duration": self.duration or "90 minutes",
            "objectives": self.objectives or "",
            "topics": self.topics or "",
            "plan": self.plan,
            "lab": self.lab or {"scenario": "", "environment": "Browser workspace", "assets": ""},
            "guide": self.guide,
            "ppt": ppt,
            "slideImages": list_slide_images(self.id),
            "artifacts": artifact_dicts,
            "error": self.error,
            "failedScreen": self.failed_screen or 0,
            "stage": self.stage,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class Artifact(db.Model):
    __tablename__ = "artifacts"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = db.Column(db.String(36), db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    type = db.Column(db.String(64), nullable=False, default="file")
    name = db.Column(db.String(255), nullable=False)
    label = db.Column(db.String(255), nullable=False, default="Generated file")
    size_label = db.Column(db.String(64), nullable=True)
    mime_type = db.Column(db.String(255), nullable=True)
    storage_path = db.Column(db.String(1024), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    course = db.relationship("Course", back_populates="artifacts")

    def to_dict(self):
        return {
            "id": self.id,
            "fileId": self.id,
            "type": self.type,
            "name": self.name,
            "label": self.label,
            "sizeLabel": self.size_label,
            "mimeType": self.mime_type,
            "downloadUrl": None,
        }


with app.app_context():
    db.create_all()


# ── Auth helpers ─────────────────────────────────────────────────────────────


def current_user():
    return getattr(g, "current_user", None)


def require_permission(permission):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = db.session.get(User, get_jwt_identity())
            g.current_user = user
            if not user:
                return err("Your session has expired. Please sign in again.", "unauthorized", 401)
            if not user.has_permission(permission):
                return err("You do not have permission to do that.", "forbidden", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, get_jwt_identity())
        g.current_user = user
        if not user:
            return err("Your session has expired. Please sign in again.", "unauthorized", 401)
        return fn(*args, **kwargs)

    return wrapper


@jwt.unauthorized_loader
def _missing_token(reason):
    return err(reason or "Missing authorization token.", "unauthorized", 401)


@jwt.invalid_token_loader
def _invalid_token(reason):
    return err(reason or "Invalid token.", "unauthorized", 401)


@jwt.expired_token_loader
def _expired_token(_h, _p):
    return err("Token has expired.", "unauthorized", 401)


def find_user(value):
    if not value:
        return None
    user = User.query.filter(
        (User.email == value.lower())
        | (User.username == value.lower())
        | (User.email == value)
        | (User.username == value)
    ).first()
    if not user:
        user = User.query.filter(db.func.lower(User.email) == value.lower()).first()
    if not user:
        user = User.query.filter(db.func.lower(User.username) == value.lower()).first()
    return user


def session_payload(user):
    return {"token": create_access_token(identity=user.id), "user": user.to_dict()}


# ── AGENT HOOKS (replace these with real agents) ─────────────────────────────


def _split_list(text):
    if not text:
        return []
    return [p.strip() for p in str(text).replace(";", "\n").replace(",", "\n").split("\n") if p.strip()]


def _primary_topic(course: dict) -> str:
    topics = _split_list(course.get("topics"))
    if topics:
        return topics[0]
    title = (course.get("title") or "").strip()
    return title or "this topic"


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

    # Split on ** Section Title ** headers (allow spaces inside markers).
    header_re = re.compile(r"\*\*\s*(.+?)\s*\*\*", re.MULTILINE)
    parts = header_re.split(text)
    # parts: [preamble, title1, body1, title2, body2, ...]
    slides = []
    idx = 1
    start = 1 if len(parts) > 1 else 0
    if start == 0 and parts:
        # No headers — treat whole blob as one slide.
        body_lines = _body_lines_from_block(parts[0])
        slides.append(
            {
                "id": 1,
                "title": course_title,
                "kicker": f"01 · {level.upper()}",
                "heading": course_title,
                "body": "\n".join(f"- {line}" for line in body_lines) if body_lines else parts[0].strip(),
                "notes": "Generated from unstructured agent output.",
            }
        )
    else:
        for i in range(start, len(parts), 2):
            title = parts[i].strip()
            block = parts[i + 1] if i + 1 < len(parts) else ""
            if not title:
                continue
            body_lines = _body_lines_from_block(block)
            slides.append(
                {
                    "id": idx,
                    "title": title,
                    "kicker": f"{str(idx).zfill(2)} · {level.upper()}",
                    "heading": title,
                    "body": "\n".join(f"- {line}" for line in body_lines) if body_lines else block.strip(),
                    "notes": f"Facilitator note: cover “{title}” with a concrete example.",
                }
            )
            idx += 1

    return {
        "summary": f"{course_title} · {len(slides)} sections",
        "sections": len(slides),
        "slides": slides,
        "raw": raw,
    }


def _body_lines_from_block(block: str) -> list[str]:
    lines = []
    for line in str(block or "").split("\n"):
        cleaned = line.strip()
        if not cleaned:
            continue
        cleaned = re.sub(r"^[-*•]\s+", "", cleaned)
        cleaned = re.sub(r"^\d+[.)]\s+", "", cleaned)
        if cleaned:
            lines.append(cleaned)
    return lines


def _compose_course_content_agent_text(course: dict) -> str:
    """
    Course-content agent stub: emit the same ** Section ** shape a real LLM would,
    grounded in the brief — then parse_agent_plan_text turns it into plan.slides.
    """
    topic = _primary_topic(course)
    title = (course.get("title") or topic).strip() or "Course"
    audience = (course.get("audience") or "practitioners").strip()
    level = (course.get("level") or "Intermediate").strip()
    objectives = _split_list(course.get("objectives"))
    topics = _split_list(course.get("topics"))
    extra = topics[1:] if len(topics) > 1 else []

    obj_line = objectives[0] if objectives else f"Explain and apply {topic} in a real workflow"
    related = ", ".join(extra[:3]) if extra else f"related controls around {topic}"

    # Logged to the Flask/CMD console so operators can verify agent output.
    raw = f"""
** Core Concept **
- {topic} is the core idea this course teaches for {audience}.
- Learners should leave able to: {obj_line}.
- Keep the definition short, precise, and free of vendor jargon.
- Anchor every later slide back to this definition.

** Comparison **
- Contrast {topic} with the default approach teams use today.
- Call out when {topic} is the better fit, and when it is not.
- Highlight one trade-off (security, UX, or operations) {audience} will feel.
- Map {topic} against {related}.

** Real-World Example **
- Walk through a concrete {level.lower()} scenario using {topic}.
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

** Remember This **
- {topic} matters because {audience} must make better decisions under pressure.
- One crisp takeaway: apply {topic} deliberately, then verify with evidence.
- Point learners to the lab for practice, not more slides.
- Revisit this slide if discussion drifts into tooling details.
""".strip()

    def _safe_print(msg: str) -> None:
        try:
            print(msg, flush=True)
        except UnicodeEncodeError:
            print(msg.encode("ascii", "replace").decode("ascii"), flush=True)

    _safe_print("\n========== COURSE-CONTENT AGENT (raw) ==========")
    _safe_print(f"course={title!r} topic={topic!r}")
    _safe_print(raw)
    _safe_print("========== END AGENT RAW ==========\n")
    return raw


def agent_generate_plan(course: dict) -> dict:
    """Return { summary, sections, slides:[{id,title,kicker,heading,body,notes}] }."""
    time.sleep(JOB_DELAY)
    level = (course.get("level") or "COURSE").strip() or "COURSE"
    title = (course.get("title") or "Course").strip() or "Course"
    raw = _compose_course_content_agent_text(course)
    plan = parse_agent_plan_text(raw, level=level, course_title=title)
    # Prefer a richer summary for the review header.
    plan["summary"] = (
        f"{title} · {course.get('duration') or 'flexible'} · {level} · {len(plan.get('slides') or [])} slides"
    )
    print(
        f"[agent_generate_plan] saved {len(plan.get('slides') or [])} slides "
        f"for course={title!r}: {[s.get('title') for s in plan.get('slides') or []]}",
        flush=True,
    )
    return plan


def agent_regenerate_slides(plan, targets, prompt="", notes="") -> dict:
    time.sleep(JOB_DELAY)
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
            # Keep bullet shape when regenerating a single slide body.
            lines = [ln.strip() for ln in str(prompt).split("\n") if ln.strip()]
            updated["body"] = "\n".join(
                ln if ln.startswith("•") or ln.startswith("-") else f"• {ln}" for ln in lines
            )
        if notes or prompt:
            updated["notes"] = notes or prompt
        slides[at] = updated
    next_plan["slides"] = slides
    return next_plan


def resolve_ppt_template() -> Path | None:
    """Pick a static .pptx from backend/ppt/ (or PPT_TEMPLATE_FILE). Never writes to it."""
    explicit = (os.getenv("PPT_TEMPLATE_FILE") or "").strip()
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
    No PPT agent yet — reuse a static template from backend/ppt/ for any topic.
    Copies bytes into the course artifact only; the source .pptx is never edited.
    """
    time.sleep(JOB_DELAY)
    template = resolve_ppt_template()
    if not template:
        raise FileNotFoundError(
            f"No PPTX template found. Place a .pptx in {PPT_DIR} "
            "or set PPT_TEMPLATE_FILE to an existing file."
        )
    app.logger.info(
        "PPT template reuse (no agent): course=%r title=%r template=%s",
        course.get("id"),
        course.get("title"),
        template.name,
    )
    return template.read_bytes()


def agent_generate_lab(course: dict, lab_input: dict | None = None) -> dict:
    time.sleep(JOB_DELAY)
    lab_input = lab_input or {}
    title = (course.get("title") or "Course").strip() or "Course"
    raw_criteria = _split_list(course.get("objectives"))
    # Use brief objectives when they look like a real list; otherwise stable defaults.
    if len(raw_criteria) >= 2 or (len(raw_criteria) == 1 and len(raw_criteria[0]) > 28):
        criteria = raw_criteria
    else:
        criteria = [
            "Learner can explain the scenario in their own words",
            "Learner completes the required lab steps",
            "Learner can identify at least one improvement",
        ]
    scenario = (lab_input.get("scenario") or "").strip() or title
    environment = (lab_input.get("environment") or "").strip() or "Browser workspace"
    assets = (lab_input.get("assets") or "").strip() or "Starter notes, template, evaluation rubric"
    return {
        "scenario": scenario,
        "environment": environment,
        "assets": assets,
        "tasks": [
            {"n": 1, "title": "Set up the workspace", "detail": "Open the starter files and confirm the environment.", "time": "10 min"},
            {"n": 2, "title": "Complete the core flow", "detail": "Follow the use-case steps and capture notes.", "time": "25 min"},
            {"n": 3, "title": "Validate outcomes", "detail": "Check your work against the success criteria.", "time": "15 min"},
        ],
        "criteria": criteria,
        "code": {
            "language": "javascript",
            "files": [
                {
                    "path": "lab/agent.js",
                    "content": f"// Lab starter for {title}\nexport const goal = {repr(course.get('objectives') or '')}\n",
                }
            ],
        },
        "useCase": (lab_input.get("scenario") or "").strip()
        or f"Apply {title} concepts in a guided hands-on exercise.",
    }


def agent_generate_guide(course: dict, lab: dict | None = None) -> dict:
    time.sleep(JOB_DELAY)
    lab = lab or {}
    outcomes = _split_list(course.get("objectives"))[:3] or ["Understand the scenario", "Know the success criteria"]
    pages = [
        {"id": "overview", "label": "Overview", "kicker": "GETTING STARTED", "title": "Lab overview", "lede": "What you will build and why it matters."},
        {"id": "setup", "label": "Setup", "kicker": "ENVIRONMENT", "title": "Environment setup", "lede": "Prepare the workspace before you begin."},
        {"id": "walkthrough", "label": "Walkthrough", "kicker": "STEPS", "title": "Guided walkthrough", "lede": "Follow each step and capture evidence."},
    ]
    sections = []
    for p in pages:
        sections.append(
            {
                **p,
                "lede": f"{p['lede']} Scenario: {lab.get('scenario') or course.get('title') or 'this lab'}.",
            }
        )
    return {
        "title": course.get("title") or "Lab guide",
        "outcomes": outcomes,
        "pages": sections,
        "sections": sections,
    }


# ── Artifacts + background jobs ──────────────────────────────────────────────


def _slug(title):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in (title or "course"))
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "course"


def _size_label(path: Path):
    size = path.stat().st_size
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def _upsert_artifact(course, *, type_, name, label, mime_type, relative_path):
    existing = next((a for a in (course.artifacts or []) if a.type == type_), None)
    abs_path = ARTIFACTS_DIR / relative_path
    size = _size_label(abs_path)
    if existing:
        existing.name = name
        existing.label = label
        existing.mime_type = mime_type
        existing.storage_path = relative_path
        existing.size_label = size
        return existing
    artifact = Artifact(
        course_id=course.id,
        type=type_,
        name=name,
        label=label,
        mime_type=mime_type,
        storage_path=relative_path,
        size_label=size,
    )
    db.session.add(artifact)
    return artifact


def write_ppt_artifact(course, content=None):
    name = f"{_slug(course.title)}-theory.pptx"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    file_path = path / name
    if content is None:
        # Prefer static template copy; seed/smoke paths often omit content.
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
    """
    Faithful preview: LibreOffice PPTX→PDF, then PyMuPDF PDF→PNG per page.
    Does not mutate the source .pptx.
    """
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
        app.logger.info("Rendered %s slide image(s) from %s", len(paths), pptx_path.name)
        return paths
    finally:
        shutil.rmtree(work, ignore_errors=True)


def write_ppt_slide_images(course, pptx_path: Path | None = None) -> list[dict]:
    """Render slide PNGs next to the course pptx artifact. Required before PPT_READY."""
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
            raise FileNotFoundError("No PPT artifact to render.")
        pptx_path = ARTIFACTS_DIR / ppt.storage_path
    slides_dir = ARTIFACTS_DIR / course.id / "slides"
    render_pptx_to_slide_images(pptx_path, slides_dir)
    return list_slide_images(course.id)


def write_lab_artifact(course):
    name = f"{_slug(course.title)}-lab.js"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    files = ((course.lab or {}).get("code") or {}).get("files") or []
    content = "\n".join(f"// {f.get('path')}\n{f.get('content', '')}" for f in files) or f"// Lab for {course.title}\n"
    (path / name).write_text(content, encoding="utf-8")
    return _upsert_artifact(course, type_="lab-code", name=name, label="Lab code", mime_type="text/javascript", relative_path=rel)


def write_guide_artifact(course):
    name = f"{_slug(course.title)}-guide.json"
    rel = f"{course.id}/{name}"
    path = ARTIFACTS_DIR / course.id
    path.mkdir(parents=True, exist_ok=True)
    (path / name).write_text(json.dumps(course.guide or {}, indent=2), encoding="utf-8")
    return _upsert_artifact(course, type_="lab-guide", name=name, label="Lab guide", mime_type="application/json", relative_path=rel)


def run_bg(fn, *args, **kwargs):
    def runner():
        with app.app_context():
            try:
                fn(*args, **kwargs)
            except Exception:
                app.logger.exception("Background job failed")

    threading.Thread(target=runner, daemon=True).start()


def _fail(course_id, failed_screen, message):
    course = db.session.get(Course, course_id)
    if not course:
        return
    course.status = "FAILED"
    course.failed_screen = failed_screen
    course.error = message
    course.updated_at = utcnow()
    db.session.commit()


def job_generate_plan(course_id):
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


def job_generate_ppt(course_id):
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

        course.stage = "Rendering slide previews…"
        course.updated_at = utcnow()
        db.session.commit()

        write_ppt_slide_images(course, ARTIFACTS_DIR / artifact.storage_path)
        if not list_slide_images(course.id):
            raise RuntimeError("Slide preview images were not created.")
        course.status = "PPT_READY"
        course.stage = "Presentation ready"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "PPT generation failed.")


def job_regenerate_slides(course_id, slides, prompt, notes):
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        course.plan = agent_regenerate_slides(course.plan, slides, prompt=prompt, notes=notes)
        artifact = write_ppt_artifact(course, content=agent_build_pptx(course.to_dict()))
        write_ppt_slide_images(course, ARTIFACTS_DIR / artifact.storage_path)
        course.status = "PPT_READY"
        course.stage = "Slides updated"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 1, str(exc) or "Slide regeneration failed.")


def job_generate_lab(course_id, lab_input=None):
    course = db.session.get(Course, course_id)
    if not course:
        return
    try:
        merged = {**(course.lab or {}), **(lab_input or {})}
        course.lab = agent_generate_lab(course.to_dict(), merged)
        course.status = "LAB_REVIEW"
        course.stage = "Lab ready for approval"
        course.error = None
        course.updated_at = utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        _fail(course_id, 2, str(exc) or "Lab generation failed.")


def job_generate_guide(course_id):
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


# ── Routes: health + auth ────────────────────────────────────────────────────


@app.get("/openapi.json")
def openapi_json():
    """Machine-readable OpenAPI 3 spec (also powers /docs)."""
    if not OPENAPI_PATH.is_file():
        return err("OpenAPI spec missing.", "not_found", 404)
    spec = yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))
    # Point Try-it-out at the running server.
    port = os.getenv("PORT", "8080")
    host = request.host_url.rstrip("/")
    spec["servers"] = [{"url": host, "description": "This server"}]
    # Keep a localhost fallback when behind proxies during local dev.
    if "127.0.0.1" not in host and "localhost" not in host:
        spec["servers"].append({"url": f"http://127.0.0.1:{port}", "description": "Local fallback"})
    return jsonify(spec)


@app.get("/openapi.yaml")
def openapi_yaml():
    if not OPENAPI_PATH.is_file():
        return err("OpenAPI spec missing.", "not_found", 404)
    return send_file(OPENAPI_PATH, mimetype="application/yaml", as_attachment=False, download_name="openapi.yaml")


@app.get("/health")
def health():
    return ok({"ok": True, "service": "courseforge-api", "agents": "stub", "docs": "/docs"})


@app.post("/auth/signup")
def signup():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip()
    if not name:
        local = email.split("@")[0] if email else "User"
        name = local.replace(".", " ").replace("_", " ").title()
    if not email or not password:
        return err("Email and password are required.", "validation", 400)
    if len(password) < 8:
        return err("Password must be at least 8 characters.", "validation", 400)
    if find_user(email):
        return err("An account with this email already exists.", "conflict", 409)
    user = User(email=email, username=email, name=name, role="instructor")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return ok(session_payload(user), 201)


@app.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or body.get("username") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        return err("Email and password are required.", "validation", 400)
    user = find_user(email)
    if not user or not user.check_password(password):
        return err("Invalid email or password.", "invalid_credentials", 401)
    return ok(session_payload(user))


@app.post("/auth/logout")
@require_auth
def logout():
    return ok({"ok": True})


@app.get("/auth/me")
@require_auth
def me():
    return ok({"user": current_user().to_dict()})


# ── Routes: courses ──────────────────────────────────────────────────────────


def get_course(course_id):
    return db.session.get(Course, course_id)


def apply_brief(course, body):
    for key in ("title", "audience", "level", "duration", "objectives", "topics"):
        if key in body:
            setattr(course, key, body.get(key) or (getattr(course, key) if key in ("title", "level", "duration") else ""))
    if isinstance(body.get("lab"), dict):
        course.lab = {**(course.lab or {}), **body["lab"]}


@app.get("/courses")
@require_permission("course:list")
def list_courses():
    items = Course.query.order_by(Course.updated_at.desc()).all()
    return ok({"courses": [c.to_dict() for c in items]})


@app.post("/courses")
@require_permission("course:create")
def create_course():
    body = request.get_json(silent=True) or {}
    lab = body.get("lab") if isinstance(body.get("lab"), dict) else {}
    course = Course(
        title=body.get("title") or "Untitled course",
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


@app.get("/courses/<course_id>")
@require_permission("course:view")
def get_course_route(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    return ok(course.to_dict())


@app.patch("/courses/<course_id>")
@require_permission("course:update")
def update_course(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    apply_brief(course, request.get_json(silent=True) or {})
    course.updated_at = utcnow()
    db.session.commit()
    return ok(course.to_dict())


@app.delete("/courses/<course_id>")
@require_permission("course:delete")
def delete_course(course_id):
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


@app.post("/courses/<course_id>/plan/generate")
@require_permission("plan:generate")
def plan_generate(course_id):
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
    run_bg(job_generate_plan, course.id)
    return ok(course.to_dict())


@app.post("/courses/<course_id>/plan/regenerate")
@require_permission("plan:regenerate")
def plan_regenerate(course_id):
    return plan_generate(course_id)


@app.post("/courses/<course_id>/plan/approve")
@require_permission("plan:approve")
def plan_approve(course_id):
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
    run_bg(job_generate_ppt, course.id)
    return ok(course.to_dict())


@app.post("/courses/<course_id>/ppt/generate")
@require_permission("ppt:generate")
def ppt_generate(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    try:
        course.transition_to("PPT_GENERATING", failed_screen=1)
    except ValueError as exc:
        return err(str(exc), "invalid_transition", 409)
    course.stage = "Generating presentation"
    db.session.commit()
    run_bg(job_generate_ppt, course.id)
    return ok(course.to_dict())


@app.post("/courses/<course_id>/ppt/regenerate")
@require_permission("ppt:regenerate")
def ppt_regenerate(course_id):
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
    run_bg(job_generate_ppt, course.id)
    return ok(course.to_dict())


@app.post("/courses/<course_id>/ppt/slides/regenerate")
@require_permission("ppt:regenerate")
def ppt_slides_regenerate(course_id):
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
    run_bg(job_regenerate_slides, course.id, body.get("slides") or [], body.get("prompt") or "", body.get("notes") or body.get("prompt") or "")
    return ok(course.to_dict())


@app.post("/courses/<course_id>/lab/generate")
@require_permission("lab:generate")
def lab_generate(course_id):
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
    run_bg(job_generate_lab, course.id, body if isinstance(body, dict) else {})
    return ok(course.to_dict())


@app.post("/courses/<course_id>/lab/regenerate")
@require_permission("lab:regenerate")
def lab_regenerate(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    course.status = "LAB_GENERATING"
    course.failed_screen = 2
    course.error = None
    course.stage = "Regenerating lab"
    course.updated_at = utcnow()
    db.session.commit()
    run_bg(job_generate_lab, course.id, course.lab or {})
    return ok(course.to_dict())


@app.post("/courses/<course_id>/lab/approve")
@require_permission("lab:approve")
def lab_approve(course_id):
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
    run_bg(job_generate_guide, course.id)
    return ok(course.to_dict())


@app.post("/courses/<course_id>/lab-guide/generate")
@require_permission("guide:generate")
def lab_guide_generate(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    course.status = "LAB_GUIDE_GENERATING"
    course.failed_screen = 3
    course.error = None
    course.stage = "Generating lab guide"
    course.updated_at = utcnow()
    db.session.commit()
    run_bg(job_generate_guide, course.id)
    return ok(course.to_dict())


@app.get("/courses/<course_id>/artifacts")
@require_permission("artifacts:download")
def list_artifacts(course_id):
    course = get_course(course_id)
    if not course:
        return err("Course not found.", "not_found", 404)
    return ok({"artifacts": [a.to_dict() for a in (course.artifacts or [])]})


@app.get("/courses/<course_id>/artifacts/<artifact_id>/download")
@require_permission("artifacts:download")
def download_artifact(course_id, artifact_id):
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


@app.get("/courses/<course_id>/slides/<filename>")
@require_permission("course:view")
def get_slide_image(course_id, filename):
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


@app.errorhandler(404)
def not_found(_e):
    return err("Not found.", "not_found", 404)


@app.errorhandler(405)
def method_not_allowed(_e):
    return err("Method not allowed.", "method_not_allowed", 405)


# ── CLI: seed / smoke ────────────────────────────────────────────────────────

DEMO_PASSWORD = "CourseForge123!"
DEMO_USERS = [
    {"email": "instructor@eduservit.local", "name": "Maya Chen", "role": "instructor"},
    {"email": "admin@eduservit.local", "name": "Admin", "role": "admin"},
    {"email": "reviewer@eduservit.local", "name": "Reviewer", "role": "reviewer"},
    {"email": "learner@eduservit.local", "name": "Learner", "role": "learner"},
]


def seed():
    global JOB_DELAY
    prev = JOB_DELAY
    JOB_DELAY = 0
    with app.app_context():
        for item in DEMO_USERS:
            user = User.query.filter_by(email=item["email"]).first()
            if not user:
                user = User(email=item["email"], username=item["email"], name=item["name"], role=item["role"])
                db.session.add(user)
            else:
                user.name = item["name"]
                user.role = item["role"]
                user.username = item["email"]
            user.set_password(DEMO_PASSWORD)
        db.session.commit()
        instructor = User.query.filter_by(email="instructor@eduservit.local").first()
        Course.query.delete()
        db.session.commit()

        draft = Course(
            title="IAM Fundamentals",
            audience="Career switchers",
            level="Beginner",
            duration="90 minutes",
            objectives="Explain IAM; Compare SSO vs MFA; Apply least privilege",
            topics="Identity basics; SSO; MFA; Access reviews",
            status="SELECT_COURSE",
            owner_id=instructor.id,
            lab={"scenario": "", "environment": "Browser workspace", "assets": ""},
        )
        db.session.add(draft)
        db.session.flush()

        waiting = Course(
            title="Zero Trust for IAM",
            audience="IT professionals",
            level="Intermediate",
            duration="2 hours",
            objectives="Define zero trust; Map identity signals; Design a policy",
            topics="Zero trust; Signals; Policy design",
            status="WAITING_FOR_APPROVAL",
            owner_id=instructor.id,
            stage="Plan ready for approval",
            lab={"scenario": "Zero trust workshop", "environment": "Browser workspace", "assets": ""},
        )
        waiting.plan = agent_generate_plan(waiting.to_dict())
        db.session.add(waiting)
        db.session.flush()

        ppt_ready = Course(
            title="MFA Deep Dive",
            audience="Security analysts",
            level="Advanced",
            duration="3 hours",
            objectives="Choose MFA methods; Implement step-up auth",
            topics="MFA factors; Step-up; Risk signals",
            status="PPT_READY",
            owner_id=instructor.id,
            stage="Presentation ready",
            lab={"scenario": "MFA workshop", "environment": "Browser workspace", "assets": "Policy template"},
        )
        ppt_ready.plan = agent_generate_plan(ppt_ready.to_dict())
        db.session.add(ppt_ready)
        db.session.flush()
        write_ppt_artifact(ppt_ready)
        write_ppt_slide_images(ppt_ready)

        lab_review = Course(
            title="SSO Lab Course",
            audience="Engineers",
            level="Intermediate",
            duration="2 hours",
            objectives="Configure SSO; Troubleshoot claims",
            topics="SAML; OIDC; Claims",
            status="LAB_REVIEW",
            owner_id=instructor.id,
            stage="Lab ready for approval",
        )
        lab_review.plan = agent_generate_plan(lab_review.to_dict())
        lab_review.lab = agent_generate_lab(lab_review.to_dict())
        db.session.add(lab_review)
        db.session.flush()
        write_ppt_artifact(lab_review)
        write_ppt_slide_images(lab_review)

        complete = Course(
            title="Access Reviews Package",
            audience="Governance teams",
            level="Intermediate",
            duration="90 minutes",
            objectives="Run an access review; Document evidence",
            topics="Reviews; Evidence; Remediations",
            status="COMPLETE",
            owner_id=instructor.id,
            stage="Course package complete",
        )
        complete.plan = agent_generate_plan(complete.to_dict())
        complete.lab = agent_generate_lab(complete.to_dict())
        complete.guide = agent_generate_guide(complete.to_dict(), complete.lab)
        db.session.add(complete)
        db.session.flush()
        write_ppt_artifact(complete)
        write_ppt_slide_images(complete)
        write_lab_artifact(complete)
        write_guide_artifact(complete)
        db.session.commit()
        print("Seeded users (password: CourseForge123!):")
        for u in DEMO_USERS:
            print(f"  - {u['email']} ({u['role']})")
        print("Seeded courses: draft, waiting, ppt ready, lab review, complete.")
    JOB_DELAY = prev


def smoke():
    import json as _json
    import urllib.error
    import urllib.request

    base = "http://127.0.0.1:8080"

    def req(method, path, token=None, body=None, raw=False):
        data = None if body is None else _json.dumps(body).encode()
        headers = {"Content-Type": "application/json"} if body is not None else {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        r = urllib.request.Request(f"{base}{path}", data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(r, timeout=30) as res:
                payload = res.read()
                if raw:
                    return res.status, payload
                return res.status, _json.loads(payload.decode() or "null")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path} -> {e.code} {e.read().decode()}") from e

    def poll(cid, token, until, timeout=45):
        end = time.time() + timeout
        while time.time() < end:
            _, course = req("GET", f"/courses/{cid}", token)
            print("  poll", course.get("status"))
            if course.get("status") in until or course.get("status") == "FAILED":
                return course
            time.sleep(1)
        raise TimeoutError(until)

    _, login_data = req("POST", "/auth/login", body={"email": "instructor@eduservit.local", "password": DEMO_PASSWORD})
    token = login_data["token"]
    _, course = req("POST", "/courses", token, {"title": "Smoke Course", "topics": "A; B", "objectives": "Pass smoke"})
    cid = course["id"]
    req("POST", f"/courses/{cid}/plan/generate", token, {})
    poll(cid, token, {"WAITING_FOR_APPROVAL", "PLAN_REVIEW"})
    req("POST", f"/courses/{cid}/plan/approve", token, {})
    poll(cid, token, {"PPT_READY"})
    req("POST", f"/courses/{cid}/lab/generate", token, {"scenario": "Smoke"})
    poll(cid, token, {"LAB_REVIEW"})
    req("POST", f"/courses/{cid}/lab/approve", token, {})
    poll(cid, token, {"COMPLETE"})
    _, listing = req("GET", f"/courses/{cid}/artifacts", token)
    for art in listing.get("artifacts") or []:
        status, blob = req("GET", f"/courses/{cid}/artifacts/{art['id']}/download", token, raw=True)
        print(f"  {art['name']}: {len(blob)} bytes")
    print("SMOKE OK")


if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv) > 1 else "run").lower()
    if cmd == "seed":
        seed()
    elif cmd == "smoke":
        smoke()
    else:
        app.run(host="127.0.0.1", port=int(os.getenv("PORT", "8080")), debug=True)
