import pytest
from app.database import Base, engine
import app.models # Register models

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after tests (optional, good for cleanup)
    # Base.metadata.drop_all(bind=engine)
