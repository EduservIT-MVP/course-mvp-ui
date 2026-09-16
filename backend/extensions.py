"""
Shared Flask extensions and JSON response utilities to prevent circular imports.
"""

from __future__ import annotations

from datetime import datetime, timezone
from flask import jsonify
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def utcnow() -> datetime:
    """Return timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


def err(message: str, code: str, status: int = 400):
    """Uniform error response."""
    return jsonify({"message": message, "code": code}), status


def ok(payload: dict | list, status: int = 200):
    """Uniform success response."""
    return jsonify(payload), status
