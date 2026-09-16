"""
Course database model and status transition state machine.
"""

from __future__ import annotations

import uuid
from sqlalchemy import JSON
from extensions import db, utcnow
from config import ARTIFACTS_DIR

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


def _list_slide_images(course_id: str) -> list[dict]:
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

    def can_transition_to(self, new_status: str) -> bool:
        if new_status == self.status:
            return True
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())

    def transition_to(self, new_status: str, failed_screen: int | None = None, error: str | None = None) -> None:
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

    def to_dict(self) -> dict:
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
        if ppt and self.id:
            ppt["url"] = f"/courses/{self.id}/ppt"
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
            "slideImages": _list_slide_images(self.id),
            "artifacts": artifact_dicts,
            "error": self.error,
            "failedScreen": self.failed_screen or 0,
            "stage": self.stage,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
