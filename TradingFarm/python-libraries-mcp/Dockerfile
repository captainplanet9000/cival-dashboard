# Python Libraries MCP Server Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for numerical libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    g++ \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create health check endpoint directory
RUN mkdir -p /app/routes

# Expose API port
EXPOSE 8000

# Start the FastAPI server with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
