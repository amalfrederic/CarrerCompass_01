import os
import sys
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, get_db, init_db
import models
import schemas
from security import hash_password, verify_password
from auth import create_access_token, verify_token
from analyser import analyze_resume_against_job
from career_analyzer import analyze_career
from llm_provider import get_active_provider, get_provider_info

# =================================================================
# 1. CloudWatch-Compatible Structured Logging Configuration
# =================================================================
log_level = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("careercompass.main")


# =================================================================
# 2. Application Lifespan & Database Startup
# =================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CareerCompass Backend...")
    logger.info(f"Active LLM Provider: {get_active_provider()}")
    # Initialize database tables and test connectivity
    try:
        init_db()
    except Exception as e:
        logger.critical(f"Database initialization failed during startup: {e}")
        if os.getenv("REQUIRE_DB", "true").lower() in ("true", "1", "yes"):
            raise
    yield
    logger.info("Shutting down CareerCompass Backend...")


app = FastAPI(
    title="CareerCompass — AI Career Readiness Platform API",
    version="1.0.0",
    lifespan=lifespan,
)


# =================================================================
# 3. Request Timing & Logging Middleware
# =================================================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response: Response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} returned {response.status_code} in {duration_ms}ms")
    return response


# =================================================================
# 4. Secure CORS Configuration (Local Dev & Future CloudFront CDN)
# =================================================================
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    allowed_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    allowed_origins = default_origins

# If wildcard is explicitly used, credentials must be disabled per CORS specification
allow_credentials = "*" not in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# =================================================================
# 5. Request Schemas
# =================================================================
class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str


class CareerRequest(BaseModel):
    resume_text: str
    target_role: str


# =================================================================
# 6. Core Routes & Health Check Endpoints
# =================================================================
@app.get("/")
def home():
    return {
        "service": "CareerCompass API",
        "status": "online",
        "message": "Welcome to CareerCompass — AI Career Readiness Platform",
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint for AWS ECS / ALB Target Group / CloudWatch.
    Verifies service status, active LLM provider, and database connectivity.
    """
    db_status = "unknown"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "disconnected"

    status = "healthy" if db_status == "connected" or os.getenv("REQUIRE_DB", "true").lower() not in ("true", "1", "yes") else "degraded"

    return {
        "status": status,
        "service": "careercompass-backend",
        "version": "1.0.0",
        "database": db_status,
        "llm_provider": get_provider_info(),
    }


# =================================================================
# 7. User Authentication Routes (PostgreSQL / RDS)
# =================================================================
@app.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = hash_password(user.password)

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_pwd,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/me")
def get_current_user(email: str = Depends(verify_token)):
    return {"message": f"Hello {email}, you are authenticated"}


# =================================================================
# 8. AI / Semantic Career Readiness Routes
# =================================================================
@app.post("/analyze-resume")
def analyze(data: AnalyzeRequest):
    return analyze_resume_against_job(data.resume_text, data.job_description)


@app.post("/career-analyzer")
def career_analyzer(data: CareerRequest):
    return analyze_career(data.resume_text, data.target_role)