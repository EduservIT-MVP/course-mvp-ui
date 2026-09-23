import json
import time
import sys
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8080"
TOKEN = None

def get_token():
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=json.dumps({
        "email": "instructor@eduservit.local",
        "password": "CourseForge123!"
    }).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())["token"]

try:
    TOKEN = get_token()
except Exception as e:
    print(f"Login failed: {e}")
    sys.exit(1)

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

def make_request(method, path, data=None):
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode('utf-8') if data is not None else b"{}" if method == "POST" else None
    req = urllib.request.Request(url, data=req_data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error on {method} {url}: {e.code} - {e.read().decode()}")
        sys.exit(1)

def print_step(msg):
    print(f"\n\033[94m==> {msg}\033[0m")

def wait_for_status(course_id, target_status, timeout=40):
    start = time.time()
    while time.time() - start < timeout:
        res = make_request("GET", f"/courses/{course_id}")
        course = res if "id" in res else res.get("course", {})
        status = course.get("status")
        print(f"  [Polling] Current status: {status}")
        if status == target_status:
            return course
        time.sleep(2)
    print(f"\033[91mTimeout waiting for {target_status}\033[0m")
    sys.exit(1)

# 1. Create Course
print_step("Creating new course...")
res = make_request("POST", "/courses", {
    "title": "E2E Test Course",
    "audience": "Engineers",
    "level": "Advanced",
    "duration": "1 hour",
    "objectives": "E2E Testing",
    "topics": "Testing, E2E"
})
course_id = res.get("id") or res.get("course", {}).get("id")
print(f"  Created course: {course_id}")

# 2. Generate PPT Plan
print_step("Generating PPT Plan...")
make_request("POST", f"/courses/{course_id}/plan/generate")
wait_for_status(course_id, "PPT_PLAN_REVIEW")

# 3. Generate PPT (Approve Plan)
print_step("Approving PPT Plan & Generating PPTX...")
make_request("POST", f"/courses/{course_id}/ppt/generate", {"plan": {}})
wait_for_status(course_id, "PPT_READY")

# 4. Generate Lab Plan
print_step("Generating Lab Plan...")
make_request("POST", f"/courses/{course_id}/lab-plan/generate", {})
wait_for_status(course_id, "LAB_PLAN_REVIEW")

# 4b. Generate Lab (Approve Plan)
print_step("Generating Lab Artifacts...")
make_request("POST", f"/courses/{course_id}/lab-plan/approve", {})
make_request("POST", f"/courses/{course_id}/lab/generate", {})
wait_for_status(course_id, "LAB_REVIEW")

# 5. Approve Lab
print_step("Approving Lab...")
make_request("POST", f"/courses/{course_id}/lab/approve", {})
wait_for_status(course_id, "LAB_APPROVED")

# 6. Generate Guide Plan
print_step("Generating Lab Guide Plan...")
make_request("POST", f"/courses/{course_id}/lab-guide/generate")
wait_for_status(course_id, "LAB_GUIDE_PLAN_REVIEW")

# 7. Generate Guide
print_step("Generating Full Lab Guide...")
make_request("POST", f"/courses/{course_id}/lab-guide/plan/approve", {"plan": {}})
course = wait_for_status(course_id, "COMPLETE")

print_step("E2E Test Completed Successfully! 🎉")
print(f"Final Course Status: {course['status']}")
