import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base

# DB Path verification
DB_PATH = "skincare_app.db"
if not os.path.exists(DB_PATH) and not os.path.exists(os.path.join("backend", DB_PATH)):
    print(f"Warning: {DB_PATH} not found in current directory. Creating it.")

# Use the real file database
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_db_connection():
    try:
        # 1. Connect and SELECT 1
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            assert result.fetchone()[0] == 1
            print("✅ Database connection successful.")
        
        # 2. Check if tables exist
        # This relies on metadata reflecting actual tables. 
        # Ideally we check sqlite_master
        with engine.connect() as connection:
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result.fetchall()]
            print(f"✅ Found tables: {tables}")
            
            expected_tables = ["users", "routines", "history"] # Basic check
            for t in expected_tables:
                if t in tables:
                     print(f"   - {t} exists")
                else:
                     print(f"   ⚠️ {t} NOT found (might be okay if empty schema)")

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_db_connection()
