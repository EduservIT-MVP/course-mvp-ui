# CourseForge Backend & Mock Agents Dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

# Install system dependencies (curl for container health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source tree
COPY . .

# Create persistent storage directories
RUN mkdir -p /app/artifacts /app/data /app/ppt

EXPOSE 8080 8001 8002 8003

# Default entrypoint runs the Flask API server
CMD ["python", "app.py"]
