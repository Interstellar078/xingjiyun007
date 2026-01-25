FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for potential pg driver compilation, though psycopg-binary handles it)
# RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy project definition and source code
COPY pyproject.toml .
COPY src ./src

# Install dependencies (and the project itself)
RUN pip install --no-cache-dir .

# Create logs directory and non-root user
RUN mkdir -p /app/logs && adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

# Expose port (internal)
EXPOSE 8000

# Run uvicorn
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "src"]
