#!/usr/bin/env python
"""
Start the Hyperliquid API server
This server connects the Trading Farm dashboard to the ElizaHyperliquidAgent
"""

import os
import sys
import logging
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Hyperliquid API server...")
    
    # Check if the HYPERLIQUID_PRIVATE_KEY environment variable is set
    if not os.getenv("HYPERLIQUID_PRIVATE_KEY"):
        logger.warning("HYPERLIQUID_PRIVATE_KEY environment variable not set!")
        logger.warning("Please set this variable before starting the server.")
        logger.warning("Add it to your .env file or set it in your environment.")
        sys.exit(1)
    
    # Start the API server
    uvicorn.run(
        "src.api.hyperliquid_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
