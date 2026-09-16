"""
User database model and role-based permissions.
"""

from __future__ import annotations

import uuid
from werkzeug.security import check_password_hash, generate_password_hash
from extensions import db, utcnow

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

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def permissions(self) -> list[str]:
        return list(ROLE_PERMISSIONS.get(self.role, []))

    def has_permission(self, permission: str) -> bool:
        grants = self.permissions
        return "*" in grants or permission in grants

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "permissions": self.permissions,
        }
