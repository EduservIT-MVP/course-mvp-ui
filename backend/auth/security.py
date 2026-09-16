"""
Authentication and authorization security helpers and decorators.
"""

from __future__ import annotations

from functools import wraps
from flask import g
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request
from extensions import db, err
from models.user import User


def current_user() -> User | None:
    """Return the currently authenticated user from Flask thread-local request context."""
    return getattr(g, "current_user", None)


def require_permission(permission: str):
    """Decorator to enforce that the authenticated user possesses the specified role permission."""
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
    """Decorator to enforce that a valid JWT token is present."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, get_jwt_identity())
        g.current_user = user
        if not user:
            return err("Your session has expired. Please sign in again.", "unauthorized", 401)
        return fn(*args, **kwargs)

    return wrapper


def find_user(value: str | None) -> User | None:
    """Find user by email or username (case-insensitive fallback)."""
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


def session_payload(user: User) -> dict:
    """Generate session dictionary containing JWT token and serialized user data."""
    return {"token": create_access_token(identity=user.id), "user": user.to_dict()}


def setup_jwt_handlers(jwt_manager) -> None:
    """Register custom JSON error handlers for JWT authorization failures."""
    @jwt_manager.unauthorized_loader
    def _missing_token(reason):
        return err(reason or "Missing authorization token.", "unauthorized", 401)

    @jwt_manager.invalid_token_loader
    def _invalid_token(reason):
        return err(reason or "Invalid token.", "unauthorized", 401)

    @jwt_manager.expired_token_loader
    def _expired_token(_h, _p):
        return err("Token has expired.", "unauthorized", 401)
