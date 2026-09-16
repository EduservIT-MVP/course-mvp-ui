"""
System, health check, and OpenAPI documentation routes.
"""

from __future__ import annotations

import os
from flask import Blueprint, jsonify, request, send_file
import yaml
from extensions import ok, err
from config import (
    OPENAPI_PATH,
    PORT,
    AGENT_PPTX_URL,
    AGENT_LAB_URL,
    AGENT_LAB_GUIDE_URL,
)

system_bp = Blueprint("system", __name__)


@system_bp.get("/openapi.json")
def openapi_json():
    """Machine-readable OpenAPI 3 spec (also powers /docs)."""
    if not OPENAPI_PATH.is_file():
        return err("OpenAPI spec missing.", "not_found", 404)
    spec = yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))
    port = os.getenv("PORT", str(PORT))
    host = request.host_url.rstrip("/")
    spec["servers"] = [{"url": host, "description": "This server"}]
    if "127.0.0.1" not in host and "localhost" not in host:
        spec["servers"].append({"url": f"http://127.0.0.1:{port}", "description": "Local fallback"})
    return jsonify(spec)


@system_bp.get("/openapi.yaml")
def openapi_yaml():
    if not OPENAPI_PATH.is_file():
        return err("OpenAPI spec missing.", "not_found", 404)
    return send_file(OPENAPI_PATH, mimetype="application/yaml", as_attachment=False, download_name="openapi.yaml")


@system_bp.get("/health")
def health():
    return ok({
        "ok": True,
        "service": "courseforge-api",
        "agents": "configured" if any([AGENT_PPTX_URL, AGENT_LAB_URL, AGENT_LAB_GUIDE_URL]) else "stub",
        "agent_endpoints": {
            "pptx": AGENT_PPTX_URL or "local-stub",
            "lab": AGENT_LAB_URL or "local-stub",
            "lab_guide": AGENT_LAB_GUIDE_URL or "local-stub",
        },
        "docs": "/docs",
    })
