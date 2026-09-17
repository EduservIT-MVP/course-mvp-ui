"""
Category database model.
"""

from __future__ import annotations

import uuid
from extensions import db, utcnow

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    
    # We could add an owner_id here later if we want tenant isolation, but for MVP global is fine
    # owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
