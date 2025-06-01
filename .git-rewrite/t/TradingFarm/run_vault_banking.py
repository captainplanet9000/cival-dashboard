"""
Run the Vault Banking System Server
"""
import os
import sys
import argparse
import logging
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import vault banking server
from elizaos_mcp_server.vault.server import start_vault_banking_server

# Import configuration
from integrated_dashboard_config import DASHBOARD_CONFIG

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("vault_banking.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("run_vault_banking")

def main():
    """Main entry point for running the vault banking server."""
    parser = argparse.ArgumentParser(description="Run the Vault Banking System Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    parser.add_argument("--port", type=int, default=9387, help="Port to run the server on")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    
    args = parser.parse_args()
    
    logger.info(f"Starting vault banking server on {args.host}:{args.port}")
    
    # Create vault banking configuration
    config = DASHBOARD_CONFIG.get("vault_banking", {})
    
    # Run the vault banking server
    start_vault_banking_server(
        config=config,
        host=args.host,
        port=args.port,
        debug=args.debug
    )

if __name__ == "__main__":
    main()
