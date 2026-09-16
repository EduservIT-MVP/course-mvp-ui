"""
Mock Agent Servers for End-to-End Backend Testing.

Runs lightweight standalone HTTP servers serving hardcoded agent responses:
  - Port 8001: PPTX Agent (serves PowerPoint .pptx binaries)
  - Port 8002: Lab Agent (serves practical lab exercise structures)
  - Port 8003: Lab Guide Agent (serves structured lab documentation/guides)

Usage:
  python mock_agents_server.py
"""

from __future__ import annotations

import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PPT_TEMPLATE = BASE_DIR / "ppt" / "Advanced Topic- 2.Access Token Management.pptx"


def get_mock_pptx_bytes() -> bytes:
    """Return hardcoded realistic PPTX presentation bytes."""
    if PPT_TEMPLATE.is_file():
        return PPT_TEMPLATE.read_bytes()
    # Fallback to minimal ZIP header bytes if template file not found
    return b"PK\x03\x04" + b"\x00" * 200


def get_mock_lab_data(course_title: str = "Modern Architecture") -> dict:
    """Return hardcoded realistic lab exercise structure."""
    return {
        "lab": {
            "scenario": f"Production Implementation Lab: {course_title}",
            "environment": "Docker, Node.js 20, Python 3.11, Local Development Container",
            "assets": "Lab repository starter files, environment variables template, automated test suite",
            "tasks": [
                {
                    "n": 1,
                    "title": "Configure Runtime Environment & Dependencies",
                    "detail": "Clone the starter repository, inspect environment configuration, and install dependencies.",
                    "time": "15 min",
                },
                {
                    "n": 2,
                    "title": "Implement the Core Agent Workflow",
                    "detail": "Wire the request handler to parse incoming telemetry, execute policy verification, and log structured metrics.",
                    "time": "30 min",
                },
                {
                    "n": 3,
                    "title": "Execute Verification Suite & Benchmark Latency",
                    "detail": "Run integration tests and confirm all evaluation criteria and assertions pass.",
                    "time": "15 min",
                },
            ],
            "criteria": [
                "Service successfully starts and passes automated health check assertions",
                "Core workflow correctly handles edge cases without unhandled exceptions",
                "Telemetry output conforms to the structured JSON schema",
            ],
            "code": {
                "language": "javascript",
                "files": [
                    {
                        "path": "lab/starter.js",
                        "content": (
                            "// Hardcoded Mock Agent Starter\n"
                            "export async function runExercise(context) {\n"
                            "  console.log('Running hands-on lab exercise for:', context);\n"
                            "  return { success: true, timestamp: Date.now() };\n"
                            "}\n"
                        ),
                    }
                ],
            },
            "useCase": f"Apply {course_title} concepts to implement and validate production workflows.",
        }
    }


def get_mock_guide_data(course_title: str = "Modern Architecture") -> dict:
    """Return hardcoded realistic lab guide documentation structure."""
    pages = [
        {
            "id": "overview",
            "label": "Overview",
            "kicker": "GETTING STARTED",
            "title": f"Lab Overview: {course_title}",
            "lede": "Welcome to the hands-on lab. In this exercise, you will put theoretical concepts into practice by completing a guided implementation.",
        },
        {
            "id": "setup",
            "label": "Setup",
            "kicker": "ENVIRONMENT",
            "title": "Workspace & Tooling Configuration",
            "lede": "Confirm your containerized workspace is online and environment variables are properly initialized before starting the tasks.",
        },
        {
            "id": "walkthrough",
            "label": "Walkthrough",
            "kicker": "EXECUTION",
            "title": "Step-by-Step Exercise Execution",
            "lede": "Follow each milestone in sequential order, validating intermediate state and capturing debugging logs as you proceed.",
        },
        {
            "id": "verification",
            "label": "Verification",
            "kicker": "EVALUATION",
            "title": "Assessment & Success Verification",
            "lede": "Verify your finished implementation against the success rubric, run the automated validation script, and review outcomes.",
        },
    ]
    return {
        "guide": {
            "title": f"{course_title} Lab Guide",
            "outcomes": [
                "Understand the system architecture and runtime constraints",
                "Complete the guided hands-on implementation steps",
                "Validate outcomes against defined evaluation rubrics",
            ],
            "pages": pages,
            "sections": pages,
        }
    }


class AgentHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    agent_type: str = "generic"

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        resp = {
            "status": "ok",
            "agent": self.agent_type,
            "port": self.server.server_address[1],
            "endpoints": ["/build-pptx", "/generate-lab", "/generate-guide"],
        }
        self.wfile.write(json.dumps(resp, indent=2).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            payload = {}

        course = payload.get("course") or {}
        title = course.get("title") or "Cloud Computing"

        # Determine route based on agent_type or URL path
        path = self.path.lower()
        is_pptx = "pptx" in self.agent_type or "pptx" in path or "ppt" in path
        is_lab = "lab" in self.agent_type and "guide" not in self.agent_type or "generate-lab" in path
        is_guide = "guide" in self.agent_type or "generate-guide" in path

        if is_pptx:
            pptx_bytes = get_mock_pptx_bytes()
            self.send_response(200)
            self.send_header(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
            self.send_header("Content-Length", str(len(pptx_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(pptx_bytes)
            print(
                f"  [PPTX Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned {len(pptx_bytes)} bytes",
                flush=True,
            )
            return

        if is_lab:
            data = get_mock_lab_data(title)
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            print(
                f"  [Lab Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned 3 tasks",
                flush=True,
            )
            return

        if is_guide:
            data = get_mock_guide_data(title)
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            print(
                f"  [Lab Guide Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned 4 pages",
                flush=True,
            )
            return

        # Default fallback: 404
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": f"Unknown endpoint: {self.path}"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Suppress default noisy access logs to keep terminal readable
        pass


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def start_agent_server(port: int, agent_type: str) -> ThreadedTCPServer:
    handler = type(
        f"{agent_type.capitalize()}Handler",
        (AgentHTTPRequestHandler,),
        {"agent_type": agent_type},
    )
    server = ThreadedTCPServer(("0.0.0.0", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def main():
    print("=" * 70)
    print(" Starting Standalone Mock Agent Servers for End-to-End Backend Testing")
    print("=" * 70)

    # Start the 3 distinct agent servers on ports 8001, 8002, 8003
    server_pptx = start_agent_server(8001, "pptx")
    print("  ✓ PPTX Agent Server running on       http://localhost:8001/build-pptx")

    server_lab = start_agent_server(8002, "lab")
    print("  ✓ Lab Agent Server running on        http://localhost:8002/generate-lab")

    server_guide = start_agent_server(8003, "lab_guide")
    print("  ✓ Lab Guide Agent Server running on  http://localhost:8003/generate-guide")

    print("\nConfigure your backend (.env):")
    print("  AGENT_PPTX_URL=http://localhost:8001/build-pptx")
    print("  AGENT_LAB_URL=http://localhost:8002/generate-lab")
    print("  AGENT_LAB_GUIDE_URL=http://localhost:8003/generate-guide")
    print("\nPress Ctrl+C to stop.\n" + "=" * 70)

    try:
        threading.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        print("\nStopping mock agent servers...")
        server_pptx.shutdown()
        server_lab.shutdown()
        server_guide.shutdown()
        print("Done.")


if __name__ == "__main__":
    main()
