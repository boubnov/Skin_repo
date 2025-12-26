import sys
import os

print("Current Dir:", os.getcwd())
print("PYTHONPATH:", os.environ.get("PYTHONPATH"))
print("sys.path:", sys.path)

try:
    from main import app
    print("SUCCESS: Imported app from main")
except ImportError as e:
    print("ERROR: Could not import app.main")
    print(e)
