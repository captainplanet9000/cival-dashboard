"""
Run the ElizaOS MCP server for integrating with the Trading Farm dashboard.
"""
import os
import sys
import argparse
import logging
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import ElizaOS MCP server modules
from elizaos_mcp_server.server import app
from elizaos_mcp_server.neon_store import NeonStrategyStore
from elizaos_mcp_server.config import get_mcp_port

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("elizaos_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("run_elizaos_server")

def main():
    """Main entry point for running the ElizaOS MCP server."""
    parser = argparse.ArgumentParser(description="Run the ElizaOS MCP server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    parser.add_argument("--port", type=int, default=3001, help="Port to run the server on")
    parser.add_argument("--chain", type=str, default="hyperliquid", help="Chain to run the server for")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    
    args = parser.parse_args()
    
    # Calculate the port based on the chain if not explicitly provided
    if args.port == 3001 and args.chain != "hyperliquid":
        args.port = get_mcp_port(args.chain)
    
    logger.info(f"Starting ElizaOS MCP server for {args.chain} on {args.host}:{args.port}")
    
    # Initialize database tables if needed
    try:
        strategy_store = NeonStrategyStore()
        if strategy_store.test_connection():
            logger.info("Successfully connected to Neon database")
            strategy_store.initialize_tables()
        else:
            logger.warning("Could not connect to Neon database. Check your environment variables.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    
    # Run the server with uvicorn
    import uvicorn
    logger.info(f"Using host: {args.host}, port: {args.port}, debug: {args.debug}")
    
    # Run the FastAPI server
    uvicorn.run(app, host=args.host, port=args.port, log_level="debug" if args.debug else "info")

if __name__ == "__main__":
    main()
