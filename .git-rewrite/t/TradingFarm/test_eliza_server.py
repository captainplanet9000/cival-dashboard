#!/usr/bin/env python
"""
Test server for ElizaOS integration with minimal dependencies.
"""
import os
import uvicorn
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.eliza_api import router as eliza_router, initialize_eliza_api
from src.agents.eliza_bridge import ElizaAgentBridge
from src.agents.eliza_wallet import ElizaWalletManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create data directories if they don't exist
os.makedirs("data", exist_ok=True)
os.makedirs("data/eliza", exist_ok=True)
os.makedirs("data/eliza_wallets", exist_ok=True)

# Create FastAPI app
app = FastAPI(
    title="ElizaOS Test API",
    description="Test API for ElizaOS integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ElizaOS components directly
wallet_manager = ElizaWalletManager(wallet_dir="data/eliza_wallets")
eliza_bridge = ElizaAgentBridge(
    agents_dir="data/eliza",
    wallet_manager=wallet_manager
)

# Initialize ElizaOS API 
initialize_eliza_api(
    agent_manager=None,  # No Hyperliquid dependency
    db_path="data/trading_farm.db"
)

# Include ElizaOS router
app.include_router(eliza_router)

# Root endpoint
@app.get("/")
async def read_root():
    return {
        "name": "ElizaOS Test API",
        "version": "1.0.0",
        "endpoints": [
            "/eliza - ElizaOS integration endpoints",
            "/eliza/dashboard - ElizaOS Trading Farm Dashboard",
            "/docs - API documentation"
        ]
    }

if __name__ == "__main__":
    logger.info("Starting ElizaOS Test API server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
