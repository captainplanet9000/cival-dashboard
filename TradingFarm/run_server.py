#!/usr/bin/env python
"""
Script to run the TradingFarm API server with ElizaOS integration.
"""
import os
import uvicorn
import logging
from fastapi import FastAPI
from src.api.eliza_api import router as eliza_router, initialize_eliza_api
from src.agents.hyperliquid_agent_manager import HyperliquidAgentManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="TradingFarm API",
    description="API for TradingFarm with ElizaOS integration",
    version="1.0.0"
)

# Create data directory if not exists
os.makedirs("data", exist_ok=True)

# Initialize agent manager
agent_manager = HyperliquidAgentManager(
    testnet=True,
    db_path="data/trading_farm.db"
)

# Initialize ElizaOS API
initialize_eliza_api(agent_manager=agent_manager, db_path="data/trading_farm.db")

# Include ElizaOS router
app.include_router(eliza_router)

# Redirect root to dashboard
@app.get("/")
async def read_root():
    return {
        "name": "TradingFarm API",
        "version": "1.0.0",
        "endpoints": [
            "/eliza - ElizaOS integration endpoints",
            "/eliza/dashboard - ElizaOS Trading Farm Dashboard"
        ]
    }

if __name__ == "__main__":
    logger.info("Starting TradingFarm API server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
