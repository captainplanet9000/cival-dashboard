# Trading Farm - Vault Banking Service Dockerfile
# Optimized for Railway deployment

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the elizaos_mcp_server directory
COPY . /app/

# Set environment variables for Flask
ENV FLASK_APP=vault/server.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Expose the port used by Vault Banking Server
EXPOSE 9387

# Run the Vault Banking server
CMD ["python", "vault/server.py"]
