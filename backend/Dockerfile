FROM python:3.11

WORKDIR /app

# Install system dependencies (needed for psycopg2 sometimes)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage cache
COPY requirements.txt .
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 8000

# Command to run the app
# Note: We assume the docker context is the 'backend' folder or we copy appropriately.
# If built from root, paths might differ.
# Let's assume we build from the 'backend' directory context or adjust paths.
# Based on project structure: /backend/app/...
# Safest is to copy everything to /app and run uvicorn main:app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
