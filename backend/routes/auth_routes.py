"""
Authentication API routes: signup, login, logout, and current user profile.
"""

from __future__ import annotations

from flask import Blueprint, request
from extensions import db, ok, err
from models.user import User
from auth.security import require_auth, current_user, find_user, session_payload

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/signup")
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


@auth_bp.post("/login")
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


@auth_bp.post("/logout")
@require_auth
def logout():
    return ok({"ok": True})


@auth_bp.get("/me")
@require_auth
def me():
    return ok({"user": current_user().to_dict()})
