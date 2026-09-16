"""
Course Artifact database model.
"""

from __future__ import annotations

import uuid
from extensions import db, utcnow


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

    def to_dict(self) -> dict:
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
