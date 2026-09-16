"""
CLI database seeding and end-to-end smoke test routines.
"""

from __future__ import annotations

import json as _json
import time
import urllib.error
import urllib.request
from extensions import db
from models.user import User
from models.course import Course
from agents.plan_agent import agent_generate_plan
from agents.lab_agent import agent_generate_lab
from agents.guide_agent import agent_generate_guide
from services.artifact_service import (
    write_ppt_artifact,
    write_ppt_slide_images,
    write_lab_artifact,
    write_guide_artifact,
)

DEMO_PASSWORD = "CourseForge123!"
DEMO_USERS = [
    {"email": "instructor@eduservit.local", "name": "Maya Chen", "role": "instructor"},
    {"email": "admin@eduservit.local", "name": "Admin", "role": "admin"},
    {"email": "reviewer@eduservit.local", "name": "Reviewer", "role": "reviewer"},
    {"email": "learner@eduservit.local", "name": "Learner", "role": "learner"},
]


def seed(app):
    """Seed database with demo users and sample courses."""
    import config
    prev = config.JOB_DELAY
    config.JOB_DELAY = 0
    with app.app_context():
        for item in DEMO_USERS:
            user = User.query.filter_by(email=item["email"]).first()
            if not user:
                user = User(email=item["email"], username=item["email"], name=item["name"], role=item["role"])
                db.session.add(user)
            else:
                user.name = item["name"]
                user.role = item["role"]
                user.username = item["email"]
            user.set_password(DEMO_PASSWORD)
        db.session.commit()
        instructor = User.query.filter_by(email="instructor@eduservit.local").first()
        Course.query.delete()
        db.session.commit()

        draft = Course(
            title="IAM Fundamentals",
            audience="Career switchers",
            level="Beginner",
            duration="90 minutes",
            objectives="Explain IAM; Compare SSO vs MFA; Apply least privilege",
            topics="Identity basics; SSO; MFA; Access reviews",
            status="SELECT_COURSE",
            owner_id=instructor.id,
            lab={"scenario": "", "environment": "Browser workspace", "assets": ""},
        )
        db.session.add(draft)
        db.session.flush()

        waiting = Course(
            title="Zero Trust for IAM",
            audience="IT professionals",
            level="Intermediate",
            duration="2 hours",
            objectives="Define zero trust; Map identity signals; Design a policy",
            topics="Zero trust; Signals; Policy design",
            status="WAITING_FOR_APPROVAL",
            owner_id=instructor.id,
            stage="Plan ready for approval",
            lab={"scenario": "Zero trust workshop", "environment": "Browser workspace", "assets": ""},
        )
        waiting.plan = agent_generate_plan(waiting.to_dict())
        db.session.add(waiting)
        db.session.flush()

        ppt_ready = Course(
            title="MFA Deep Dive",
            audience="Security analysts",
            level="Advanced",
            duration="3 hours",
            objectives="Choose MFA methods; Implement step-up auth",
            topics="MFA factors; Step-up; Risk signals",
            status="PPT_READY",
            owner_id=instructor.id,
            stage="Presentation ready",
            lab={"scenario": "MFA workshop", "environment": "Browser workspace", "assets": "Policy template"},
        )
        ppt_ready.plan = agent_generate_plan(ppt_ready.to_dict())
        db.session.add(ppt_ready)
        db.session.flush()
        write_ppt_artifact(ppt_ready)
        write_ppt_slide_images(ppt_ready)

        lab_review = Course(
            title="SSO Lab Course",
            audience="Engineers",
            level="Intermediate",
            duration="2 hours",
            objectives="Configure SSO; Troubleshoot claims",
            topics="SAML; OIDC; Claims",
            status="LAB_REVIEW",
            owner_id=instructor.id,
            stage="Lab ready for approval",
        )
        lab_review.plan = agent_generate_plan(lab_review.to_dict())
        lab_review.lab = agent_generate_lab(lab_review.to_dict())
        db.session.add(lab_review)
        db.session.flush()
        write_ppt_artifact(lab_review)
        write_ppt_slide_images(lab_review)

        complete = Course(
            title="Access Reviews Package",
            audience="Governance teams",
            level="Intermediate",
            duration="90 minutes",
            objectives="Run an access review; Document evidence",
            topics="Reviews; Evidence; Remediations",
            status="COMPLETE",
            owner_id=instructor.id,
            stage="Course package complete",
        )
        complete.plan = agent_generate_plan(complete.to_dict())
        complete.lab = agent_generate_lab(complete.to_dict())
        complete.guide = agent_generate_guide(complete.to_dict(), complete.lab)
        db.session.add(complete)
        db.session.flush()
        write_ppt_artifact(complete)
        write_ppt_slide_images(complete)
        write_lab_artifact(complete)
        write_guide_artifact(complete)
        db.session.commit()
        print("Seeded users (password: CourseForge123!):")
        for u in DEMO_USERS:
            print(f"  - {u['email']} ({u['role']})")
        print("Seeded courses: draft, waiting, ppt ready, lab review, complete.")
    config.JOB_DELAY = prev


def smoke():
    """Run an end-to-end smoke test against the running API."""
    base = "http://127.0.0.1:8080"

    def req(method, path, token=None, body=None, raw=False):
        data = None if body is None else _json.dumps(body).encode()
        headers = {"Content-Type": "application/json"} if body is not None else {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        r = urllib.request.Request(f"{base}{path}", data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(r, timeout=30) as res:
                payload = res.read()
                if raw:
                    return res.status, payload
                return res.status, _json.loads(payload.decode() or "null")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path} -> {e.code} {e.read().decode()}") from e

    def poll(cid, token, until, timeout=45):
        end = time.time() + timeout
        while time.time() < end:
            _, course = req("GET", f"/courses/{cid}", token)
            print("  poll", course.get("status"))
            if course.get("status") in until or course.get("status") == "FAILED":
                return course
            time.sleep(1)
        raise TimeoutError(until)

    _, login_data = req("POST", "/auth/login", body={"email": "instructor@eduservit.local", "password": DEMO_PASSWORD})
    token = login_data["token"]
    _, course = req("POST", "/courses", token, {"title": "Smoke Course", "topics": "A; B", "objectives": "Pass smoke"})
    cid = course["id"]
    req("POST", f"/courses/{cid}/plan/generate", token, {})
    poll(cid, token, {"WAITING_FOR_APPROVAL", "PLAN_REVIEW"})
    req("POST", f"/courses/{cid}/plan/approve", token, {})
    poll(cid, token, {"PPT_READY"})
    req("POST", f"/courses/{cid}/lab/generate", token, {"scenario": "Smoke"})
    poll(cid, token, {"LAB_REVIEW"})
    req("POST", f"/courses/{cid}/lab/approve", token, {})
    poll(cid, token, {"COMPLETE"})
    _, listing = req("GET", f"/courses/{cid}/artifacts", token)
    for art in listing.get("artifacts") or []:
        status, blob = req("GET", f"/courses/{cid}/artifacts/{art['id']}/download", token, raw=True)
        print(f"  {art['name']}: {len(blob)} bytes")
    print("SMOKE OK")
