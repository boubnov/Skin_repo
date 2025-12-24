import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database configuration with testing support
# Priority: 1. DATABASE_URL env var, 2. SQLite for testing/local, 3. PostgreSQL default
TESTING = os.getenv("TESTING", "0") == "1"

if TESTING:
    # Use in-memory SQLite for tests (fast, no external deps)
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Required for SQLite
    )
else:
    # Use DATABASE_URL if set, otherwise try SQLite for local dev
    SQLALCHEMY_DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./skincare_app.db"  # Default to SQLite for easy local dev
    )
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Export flag for models.py to know whether to use PostgreSQL-specific types
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
