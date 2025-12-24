from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.rag import hybrid_search
import sys
import os

# Ensure we can import from app
sys.path.append(os.getcwd())
# Fix for importing models/database if needed, but since we import from app.rag it should be fine if PYTHONPATH is set

SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/skindb"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_rag():
    db = SessionLocal()
    try:
        print("\n--- Test 1: Search for 'moisturizer' with Skin Type = OILY ---")
        results_oily = hybrid_search(db, "moisturizer", filters={"skin_type": "oily"})
        print(f"Found {len(results_oily)} products.")
        for p in results_oily:
            print(f"  - {p.name} (Metadata: {p.metadata_info})")
            if "oily" not in p.metadata_info.get("skin_type", ""):
                 print("  [FAIL] Returned non-oily product!")
            else:
                 print("  [PASS] Correct Metadata.")

        print("\n--- Test 2: Search for 'moisturizer' with Skin Type = DRY ---")
        results_dry = hybrid_search(db, "moisturizer", filters={"skin_type": "dry"})
        print(f"Found {len(results_dry)} products.")
        for p in results_dry:
            print(f"  - {p.name} (Metadata: {p.metadata_info})")
            if "dry" not in p.metadata_info.get("skin_type", ""):
                 print("  [FAIL] Returned non-dry product!")
            else:
                 print("  [PASS] Correct Metadata.")

    except Exception as e:
        print(f"Test Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_rag()
