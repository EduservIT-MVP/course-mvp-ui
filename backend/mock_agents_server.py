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
import time
import json
import socketserver
import sys
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PPT_TEMPLATE = BASE_DIR / "ppt" / "Advanced Topic- 2.Access Token Management.pptx"

# Sample guide document – PDF takes priority, then DOCX, then fallback to minimal PDF
_GUIDE_CANDIDATES = [
    BASE_DIR / "ppt" / "Lab VM walkthrough.pdf",
    BASE_DIR / "ppt" / "lab_guide_sample.pdf",
    BASE_DIR / "ppt" / "lab_guide_sample.docx",
]

MINIMAL_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Outlines 2 0 R\n/Pages 3 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Outlines\n/Count 0\n>>\nendobj\n3 0 obj\n<<\n/Type /Pages\n/Count 1\n/Kids [ 4 0 R ]\n>>\nendobj\n4 0 obj\n<<\n/Type /Page\n/Parent 3 0 R\n/MediaBox [ 0 0 612 792 ]\n/Contents 5 0 R\n/Resources <<\n/ProcSet [ /PDF /Text ]\n/Font << /F1 6 0 R >>\n>>\n>>\nendobj\n5 0 obj\n<< /Length 73 >>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Mock PDF Generated successfully) Tj\nET\nendstream\nendobj\n6 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/Name /F1\n/BaseFont /Helvetica\n/Encoding /MacRomanEncoding\n>>\nendobj\ntrailer\n<<\n/Size 7\n/Root 1 0 R\n>>\n%%EOF"


def get_mock_pptx_bytes() -> bytes:
    """Return hardcoded realistic PPTX presentation bytes."""
    if PPT_TEMPLATE.is_file():
        return PPT_TEMPLATE.read_bytes()
    # Fallback to minimal ZIP header bytes if template file not found
    return b"PK\x03\x04" + b"\x00" * 200


def get_mock_guide_bytes() -> tuple[bytes, str]:
    """Return sample guide file bytes and its mime type.
    Prefers a real PDF or DOCX from the ppt/ folder; falls back to minimal PDF.
    Returns (bytes, mime_type).
    """
    mime_map = {
        ".pdf":  "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc":  "application/msword",
    }
    for candidate in _GUIDE_CANDIDATES:
        if candidate.is_file():
            suffix = candidate.suffix.lower()
            mime = mime_map.get(suffix, "text/javascript")
            print(f"  [Guide Mock] Serving '{candidate.name}' ({mime})", flush=True)
            return candidate.read_bytes(), mime
    # Fallback to in-memory minimal PDF
    return MINIMAL_PDF_BYTES, "application/pdf"


def get_mock_lab_plan_data(course: dict) -> dict:
    """Return realistic lab plan structure without artifacts."""
    course_title = course.get("title") or "Modern Architecture"
    audience = course.get("audience") or "Learner"
    lab_plan = course.get("labPlan") or {}
    env = lab_plan.get("environment") or course.get("environment") or "Standard Browser Workspace"
    scenario = lab_plan.get("scenario") or "Implement the core concepts"
    duration = course.get("duration") or "50 minutes"
    
    # Try to extract just the number if duration is a string like "45 minutes"
    est_time = 50
    if isinstance(duration, str):
        nums = [int(s) for s in duration.split() if s.isdigit()]
        if nums:
            est_time = nums[0]

    sample_readme = (
        f"# {course_title} Lab\n\n"
        f"**Summary:** This lab provides a hands-on exercise for {course_title}.\n\n"
        f"**Trainee persona / decision:** {audience}\n\n"
        "## Steps\n"
        f"1. Start the {env} environment\n"
        f"2. {scenario}\n"
        "3. Validate against the success criteria\n"
    )

    return {
        "lab": {
            "raw": sample_readme,
            "estimated_time": est_time,
            "environment": env,
            "scenario": scenario,
        }
    }


def get_mock_lab_data(course: dict) -> dict:
    """Return realistic lab exercise structure with artifacts."""
    course_title = course.get("title") or "Modern Architecture"
    plan_data = get_mock_lab_plan_data(course)
    
    # Overwrite the short plan raw text with the fully fleshed-out lab manual content
    plan_data["lab"]["raw"] = (
        f"# {course_title} Lab - Full Instructions\n\n"
        "## 1. Setup Phase\n"
        f"Initialize the {plan_data['lab']['environment']} environment and install all necessary dependencies by running `setup.sh`.\n\n"
        "## 2. Execution Phase\n"
        "Implement the core logic in `index.js`. You will need to write functions to handle the primary requirements of this exercise.\n\n"
        "## 3. Validation\n"
        "Run the automated test suite to ensure your implementation meets all the success criteria. If tests fail, review the error logs and debug your code."
    )
    
    # Add artifacts to the plan data for the actual lab generation step
    plan_data["lab"]["artifacts"] = [
        {
            "name": "setup.sh",
            "content": "#!/bin/bash\necho \"Setting up workspace for " + course_title + "\"\n"
        },
        {
            "name": "index.js",
            "content": "console.log('Welcome to " + course_title + " lab');\n"
        }
    ]
    return plan_data




def get_mock_guide_plan_data(course: dict, lab: dict) -> dict:
    """Return realistic lab guide plan."""
    course_title = course.get("title") or "Modern Architecture"
    audience = course.get("audience") or "Learner"
    duration = course.get("duration") or "50 minutes"
    env = lab.get("environment") or "Local Environment"
    scenario = lab.get("scenario") or "Implementation task"
    
    return {
        "plan": f"# Lab Guide Plan\n\nThis plan outlines the structure of the final learner guide. The guide will consist of 4 main sections:\n\n1. **Overview**: High-level summary of the lab goals and prerequisites.\n2. **Setup**: Instructions for preparing the {env} environment and dependencies.\n3. **Walkthrough**: Step-by-step execution tasks for the learner to follow for the scenario: {scenario}.\n4. **Verification**: Automated and manual checks to ensure the learner successfully completed the lab.\n\n**Target Audience:** {audience}\n**Estimated Duration:** {duration}."
    }

def get_mock_guide_data(course: dict, lab: dict) -> dict:
    """Return hardcoded realistic lab guide documentation structure."""
    course_title = course.get("title") or "Modern Architecture"
    env = lab.get("environment") or "Local Environment"
    scenario = lab.get("scenario") or "Implementation task"
    
    pages = [
        {
            "id": "overview",
            "label": "Overview",
            "kicker": "GETTING STARTED",
            "title": f"Lab Overview: {course_title}",
            "lede": f"Welcome to the hands-on lab. In this exercise, you will put theoretical concepts into practice by completing a guided implementation for: {scenario}.",
            "content": "### Welcome to the Lab\n\nThis lab is designed to give you practical experience with the concepts covered in this course.\n\n**Prerequisites**\n- Basic understanding of the architecture\n- Access to the lab environment\n\n**Expected Time**\n- 45 minutes",
        },
        {
            "id": "setup",
            "label": "Setup",
            "kicker": "ENVIRONMENT",
            "title": "Workspace & Tooling Configuration",
            "lede": f"Confirm your {env} workspace is online and environment variables are properly initialized before starting the tasks.",
            "content": f"### Environment Setup\n\n1. Open your terminal.\n2. Ensure your {env} is ready.\n3. Verify that all dependencies are running successfully.\n4. Initialize the database by running `npm run db:setup`.",
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
        lab = payload.get("lab") or {}
        title = course.get("title") or "Cloud Computing"

        # Determine route based on agent_type or URL path
        path = self.path.lower()
        is_pptx = "pptx" in self.agent_type or "pptx" in path or "ppt" in path
        is_lab_plan = "generate-lab/plan" in path
        is_lab = ("lab" in self.agent_type and "guide" not in self.agent_type and not is_lab_plan) or ("generate-lab" in path and not is_lab_plan)
        
        is_guide_plan = "generate-guide/plan" in path
        is_guide = ("guide" in self.agent_type and not is_guide_plan) or ("generate-guide" in path and not is_guide_plan)
        
        # Intentional delay to simulate real LLM generation time and allow UI loaders to be visible
        time.sleep(2)

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

        if is_lab_plan:
            data = get_mock_lab_plan_data(course)
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            print(
                f"  [Lab Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned lab plan",
                flush=True,
            )
            return

        if is_lab:
            data = get_mock_lab_data(course)
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            print(
                f"  [Lab Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned lab artifacts",
                flush=True,
            )
            return

        if is_guide_plan:
            data = get_mock_guide_plan_data(course, lab)
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            print(
                f"  [Lab Guide Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned guide plan",
                flush=True,
            )
            return

        if is_guide:
            # We don't generate a binary guide for testing locally via mock here, but normally get_mock_guide_bytes is returned.
            # Using lab parameters is enough for plan step
            guide_bytes, guide_mime = get_mock_guide_bytes()
            self.send_response(200)
            self.send_header("Content-Type", guide_mime)
            self.send_header("Content-Length", str(len(guide_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(guide_bytes)
            print(
                f"  [Lab Guide Agent :{self.server.server_address[1]}] Handled POST {self.path} "
                f"for '{title}' -> returned {guide_mime} guide ({len(guide_bytes)} bytes)",
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
