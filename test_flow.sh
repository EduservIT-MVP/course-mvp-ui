#!/bin/bash
echo "1. Getting token..."
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@eduservit.local","password":"CourseForge123!"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "2. Creating course..."
COURSE_ID=$(curl -s -X POST http://localhost:8080/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lab Flow", "audience":"Engineers", "duration":"1 hour"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Course ID: $COURSE_ID"

echo "3. Triggering Lab Plan Generation with custom environment..."
curl -s -X POST http://localhost:8080/courses/$COURSE_ID/lab-plan/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environment": "My Super Custom Python Environment!"}' > /dev/null

echo "Waiting for background task to finish..."
sleep 5

echo "4. Verifying Lab Plan..."
curl -s -X GET http://localhost:8080/courses/$COURSE_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('labPlan', {}), indent=2))"
