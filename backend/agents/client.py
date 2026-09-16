"""
HTTP dispatch helpers for calling external standalone agent microservices.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from config import AGENT_TIMEOUT_SECONDS


def _call_agent_json(agent_name: str, url: str, payload: dict) -> dict:
    """POST JSON payload to an external agent endpoint and return parsed JSON response dict."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=AGENT_TIMEOUT_SECONDS) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        err_msg = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Agent [{agent_name}] at {url} failed with HTTP {exc.code}: {err_msg}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Failed to connect to agent [{agent_name}] at {url}: {exc.reason}"
        ) from exc


def _call_agent_binary(agent_name: str, url: str, payload: dict) -> bytes:
    """POST JSON payload to an external agent endpoint and return raw binary response (e.g. PPTX bytes)."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation, application/octet-stream, */*",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=AGENT_TIMEOUT_SECONDS) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        err_msg = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Agent [{agent_name}] at {url} failed with HTTP {exc.code}: {err_msg}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Failed to connect to agent [{agent_name}] at {url}: {exc.reason}"
        ) from exc
