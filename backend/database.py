import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

logger = logging.getLogger("careercompass.database")

# Read DATABASE_URL from environment variable (supports local PostgreSQL or Amazon RDS)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://amalfrederict@localhost/resume_db")

# Production-grade engine settings with pool_pre_ping (essential for RDS idle disconnects)
engine_kwargs = {
    "pool_pre_ping": True,
}
if "sqlite" not in DATABASE_URL:
    engine_kwargs.update({
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Initializes database schema. Raises connection errors explicitly if DB is unreachable."""
    from sqlalchemy.exc import OperationalError, SQLAlchemyError
    require_db = os.getenv("REQUIRE_DB", "true").lower() in ("true", "1", "yes")
    try:
        # Test connection before creating metadata
        with engine.connect() as conn:
            logger.info("Database connection established successfully.")
        # Ensure models are imported so Base.metadata contains tables
        import models
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
    except (OperationalError, SQLAlchemyError) as e:
        safe_endpoint = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'configured database'
        logger.error(f"CRITICAL: Failed to connect to database at {safe_endpoint}. Error: {e}")
        if require_db:
            raise RuntimeError(
                f"Database initialization failed: Unable to connect to database at {safe_endpoint}. "
                f"Please verify DATABASE_URL and ensure PostgreSQL / Amazon RDS is running. "
                f"Original error: {e}"
            ) from e
        else:
            logger.warning(
                f"REQUIRE_DB is set to false. Running in degraded mode without database connectivity. "
                f"Auth endpoints (/register, /login) will fail if invoked. Error: {e}"
            )


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()