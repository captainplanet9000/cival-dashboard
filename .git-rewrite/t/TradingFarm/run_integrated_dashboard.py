"""
Run the integrated Trading Farm dashboard with Hyperliquid panel and ElizaOS MCP integration.
"""
import os
import sys
import argparse
import logging
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import dashboard modules
from integrated_dashboard import create_integrated_dashboard

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("integrated_dashboard.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("run_integrated_dashboard")

def main():
    """Main entry point for running the integrated dashboard."""
    parser = argparse.ArgumentParser(description="Run the integrated Trading Farm dashboard")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    parser.add_argument("--port", type=int, default=9386, help="Port to run the server on")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    
    args = parser.parse_args()
    
    logger.info(f"Starting integrated dashboard on {args.host}:{args.port}")
    
    # Create and run the integrated dashboard
    dashboard = create_integrated_dashboard()
    
    # Log configuration
    logger.info(f"Using host: {args.host}, port: {args.port}, debug: {args.debug}")
    
    # Run the dashboard
    dashboard.run_dashboard(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()
