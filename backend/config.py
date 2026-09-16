"""
Application configuration and environment variable loading.
"""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ── Filesystem Directories ───────────────────────────────────────────────────
ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", str(BASE_DIR / "artifacts"))).resolve()
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

PPT_DIR = Path(os.getenv("PPT_TEMPLATE_DIR", str(BASE_DIR / "ppt"))).resolve()
PPT_DIR.mkdir(parents=True, exist_ok=True)

PPT_TEMPLATE_FILE = (os.getenv("PPT_TEMPLATE_FILE") or "").strip()
LIBREOFFICE_PATH = (os.getenv("LIBREOFFICE_PATH") or "").strip()
JOB_DELAY = float(os.getenv("JOB_STUB_DELAY_SECONDS", "2"))

# ── Networking & Security ────────────────────────────────────────────────────
PORT = int(os.getenv("PORT", "8080"))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if o.strip()
]

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'courseforge.db'}")

OPENAPI_PATH = BASE_DIR / "openapi.yaml"
SWAGGER_URL = "/docs"

# ── Agent Microservice Endpoints (3 external agents) ──────────────────────────
AGENT_PPTX_URL = (os.getenv("AGENT_PPTX_URL") or os.getenv("AGENT_PPT_URL") or "").strip()
AGENT_LAB_URL = (os.getenv("AGENT_LAB_URL") or "").strip()
AGENT_LAB_GUIDE_URL = (os.getenv("AGENT_LAB_GUIDE_URL") or os.getenv("AGENT_GUIDE_URL") or "").strip()
AGENT_TIMEOUT_SECONDS = float(os.getenv("AGENT_TIMEOUT_SECONDS", "30"))
REQUIRE_AGENT_ENDPOINTS = os.getenv("REQUIRE_AGENT_ENDPOINTS", "false").lower() in ("1", "true", "yes")

if REQUIRE_AGENT_ENDPOINTS:
    missing_agents = [
        var
        for var, val in (
            ("AGENT_PPTX_URL", AGENT_PPTX_URL),
            ("AGENT_LAB_URL", AGENT_LAB_URL),
            ("AGENT_LAB_GUIDE_URL", AGENT_LAB_GUIDE_URL),
        )
        if not val
    ]
    if missing_agents:
        raise RuntimeError(
            f"Missing required agent endpoint environment variable(s): {', '.join(missing_agents)}. "
            "Set them in backend/.env or set REQUIRE_AGENT_ENDPOINTS=false for local dev."
        )
