"""
Script to run the Grafana dashboard and API service.
"""
import os
import sys
import subprocess
import threading
import logging
import time
from pathlib import Path

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.grafana_api import run_api_server

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Run the Grafana dashboard and API service."""
    # Get the project root directory
    root_dir = Path(__file__).parent.parent.absolute()
    
    # Create data directory if it doesn't exist
    data_dir = root_dir / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Start the API server in a separate thread
    api_thread = threading.Thread(target=run_api_server, daemon=True)
    api_thread.start()
    
    logger.info("API server started at http://localhost:8051")
    logger.info("To start Grafana dashboard, use Docker or the provided docker-compose.yml")
    logger.info("Once Grafana is running, access it at http://localhost:3000 (admin/tradingfarm)")
    
    # Keep the script running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")

if __name__ == "__main__":
    main()
