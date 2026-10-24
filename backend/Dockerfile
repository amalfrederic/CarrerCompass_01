# =================================================================
# CareerCompass Backend Dockerfile (Optimized for AWS ECS Fargate)
# =================================================================
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered streaming logs for CloudWatch
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    TRANSFORMERS_CACHE=/app/.cache \
    HF_HOME=/app/.cache

WORKDIR /app

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download SentenceTransformer weights into image layer
# This prevents ECS Fargate task cold-starts from downloading weights over public internet
RUN mkdir -p /app/.cache && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application code
COPY . /app/

# Create a non-root user for least-privilege container execution
RUN useradd -u 1001 -m appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Docker Healthcheck matching AWS Application Load Balancer / ECS target
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch FastAPI via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
