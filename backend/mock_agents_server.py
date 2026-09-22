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
    """Return realistic lab exercise structure with dynamic course title."""
    sample_readme = (
        f"# {course_title} Lab\n\n"
        f"**Summary:** This lab provides a hands-on exercise for {course_title}.\n\n"
        "**Trainee persona / decision:** Learner\n\n"
        "## Steps\n"
        "1. Start the workspace environment\n"
        "2. Implement the core concepts\n"
        "3. Validate against the success criteria\n"
    )

    import random
    reg_id = random.randint(1000, 9999)
    return {
        "lab": {
            "raw": sample_readme + f"\n\n*(ID: {reg_id})*",
            "estimated_time": 50,
            "environment": "Standard Browser Workspace",
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
            "content": "### Welcome to the Lab\n\nThis lab is designed to give you practical experience with the concepts covered in this course.\n\n**Prerequisites**\n- Basic understanding of the architecture\n- Access to the lab environment\n\n**Expected Time**\n- 45 minutes",
        },
        {
            "id": "setup",
            "label": "Setup",
            "kicker": "ENVIRONMENT",
            "title": "Workspace & Tooling Configuration",
            "lede": "Confirm your containerized workspace is online and environment variables are properly initialized before starting the tasks.",
            "content": "### Environment Setup\n\n1. Open your terminal.\n2. Run `docker-compose up -d` to start the required services.\n3. Verify that all containers are running successfully using `docker ps`.\n4. Initialize the database by running `npm run db:setup`.",
        },
        {
            "id": "walkthrough",
            "label": "Walkthrough",
            "kicker": "EXECUTION",
            "title": "Step-by-Step Exercise Execution",
            "lede": "Follow each milestone in sequential order, validating intermediate state and capturing debugging logs as you proceed.",
            "content": "### Step 1: Initialize the Project\nRun the initial scaffolding command to create the base structure.\n\n### Step 2: Implement the Core Logic\nOpen `src/main.js` and add the authentication middleware.\n\n### Step 3: Test the Integration\nUse the provided Postman collection to trigger the endpoint and observe the logs.",
        },
        {
            "id": "verification",
            "label": "Verification",
            "kicker": "EVALUATION",
            "title": "Assessment & Success Verification",
            "lede": "Verify your finished implementation against the success rubric, run the automated validation script, and review outcomes.",
            "content": "### Success Verification\n\nRun the automated test suite:\n```bash\nnpm run test:e2e\n```\n\n**Expected Output:**\nAll 14 integration tests should pass. If any fail, review the error logs and ensure the authentication headers are being passed correctly.",
        },
    ]
    import random
    reg_id = random.randint(1000, 9999)
    return {
        "guide": {
            "title": f"{course_title} Lab Guide (ID: {reg_id})",
            "outcomes": [
                "Understand the system architecture and runtime constraints",
                "Complete the guided hands-on implementation steps",
                "Validate outcomes against defined evaluation rubrics",
            ],
            "pages": pages,
            "sections": pages,
            "plan": "# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide. The guide will consist of 4 main sections:\n\n1. **Overview**: High-level summary of the lab goals and prerequisites.\n2. **Setup**: Instructions for preparing the local environment and dependencies.\n3. **Walkthrough**: Step-by-step execution tasks for the learner to follow.\n4. **Verification**: Automated and manual checks to ensure the learner successfully completed the lab.\n\n**Target Audience:** Intermediate learners who have completed the prerequisites.\n**Estimated Duration:** 45 minutes.\n\n*(Approve this plan to generate the full guide content)*",
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
        
        # Removed intentional delay to allow fast frontend testing

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
