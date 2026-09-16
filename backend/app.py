"""
CourseForge API — Modular Flask Application Entry Point.

Architecture:
  - config.py       : Centralized configuration, environment variables & paths
  - extensions.py   : Shared SQLAlchemy and JWT instances (prevents circular imports)
  - models/         : Database domain models (User, Course, Artifact)
  - auth/           : Authentication, JWT handlers & RBAC permission decorators
  - agents/         : Standalone agent microservices client & generation logic
  - services/       : File persistence, PPTX rendering & async background jobs
  - routes/         : Modular Flask Blueprints (auth, courses, artifacts, system)
  - commands.py     : Database seed and smoke test CLI commands

Run:
  python app.py              # serve on :8080 (or PORT env var)
  python app.py seed         # demo users + sample courses
  python app.py smoke        # end-to-end HTTP smoke test

Docs:
  http://127.0.0.1:8080/docs           # Swagger UI
  http://127.0.0.1:8080/openapi.json   # OpenAPI 3 JSON
"""

from __future__ import annotations

import sys
from flask import Flask
from flask_cors import CORS

from config import (
    PORT,
    SECRET_KEY,
    JWT_SECRET_KEY,
    DATABASE_URL,
    CORS_ORIGINS,
)
from extensions import db, jwt
from auth.security import setup_jwt_handlers
from routes import register_routes
from commands import seed as seed_cmd, smoke as smoke_cmd

# Re-exports for backwards compatibility with any existing imports
from models import User, Course, Artifact
from agents import (
    agent_build_pptx,
    agent_generate_lab,
    agent_generate_guide,
    agent_generate_plan,
    agent_regenerate_slides,
)


def create_app() -> Flask:
    """Application factory: initialize and wire all components."""
    app = Flask(__name__)

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    setup_jwt_handlers(jwt)

    # Configure CORS
    CORS(
        app,
        resources={r"/*": {"origins": CORS_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Content-Disposition", "Content-Type"],
    )

    # Register all modular route blueprints & docs
    register_routes(app)

    # Ensure database schema is created
    with app.app_context():
        db.create_all()

    return app


# Module-level application instance for WSGI servers (Gunicorn / Flask CLI)
app = create_app()


def seed():
    """Seed database with demo users and sample courses."""
    seed_cmd(app)


def smoke():
    """Run an end-to-end smoke test against the running API."""
    smoke_cmd()


if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv) > 1 else "run").lower()
    if cmd == "seed":
        seed()
    elif cmd == "smoke":
        smoke()
    else:
        app.run(host="127.0.0.1", port=PORT, debug=True)
