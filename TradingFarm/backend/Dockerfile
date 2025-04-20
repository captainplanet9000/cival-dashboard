# FastAPI Backend Dockerfile for Trading Farm
FROM python:3.11-slim

# Install dependencies and curl for health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy test files first to debug
COPY test.py /app/
RUN ls -la /app

# Copy requirements and install
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory to /app
COPY . /app/

# Create directory for logs
RUN mkdir -p /app/logs

# Debug: List directory contents after all copying
RUN echo "Contents of /app directory:" && ls -la /app

# Expose port
EXPOSE 8000

# Start with our FastAPI server
CMD ["python", "/app/simple_api.py"]
