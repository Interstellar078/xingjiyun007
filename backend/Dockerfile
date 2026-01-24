FROM python:3.13-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for potential pg driver compilation, though psycopg-binary handles it)
# RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy project definition
COPY pyproject.toml .

# Install dependencies
# We use pip to install directly from pyproject.toml
RUN pip install --no-cache-dir .

# Copy application code
COPY src ./src
# Logs directory
RUN mkdir -p logs

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

# Expose port (internal)
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
