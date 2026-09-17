"""
Routes blueprint registration and Swagger UI setup.
"""

from __future__ import annotations

from flask import Flask
from flask_swagger_ui import get_swaggerui_blueprint
from extensions import err
from config import SWAGGER_URL
from routes.auth_routes import auth_bp
from routes.course_routes import courses_bp
from routes.artifact_routes import artifacts_bp
from routes.system_routes import system_bp
from routes.category_routes import bp as category_bp


def register_routes(app: Flask) -> None:
    """Register all modular route blueprints and Swagger UI docs."""
    app.register_blueprint(system_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(artifacts_bp)
    app.register_blueprint(category_bp)

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

    @app.errorhandler(404)
    def not_found(_e):
        return err("Not found.", "not_found", 404)

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return err("Method not allowed.", "method_not_allowed", 405)
