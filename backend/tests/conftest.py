import pytest
import sys 
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import Base, engine, SessionLocal
import app.models # Register models

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after tests (optional, good for cleanup)
    # Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Creates a new database session for a test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture(scope="module")
def client():
    # Import app inside fixture to ensure sys.path is set
    from main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def module_client():
    """Module-scoped test client"""
    from main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
