from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
import os
from datetime import datetime, timedelta
import logging
from .db import get_supabase_client, get_db_connection
from .routers import agents, positions, trades, strategies, farms, wallets, bridge, tools, commands, elizaos, trading
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/api.log"),
    ],
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Trading Farm API",
    description="Backend API for Trading Farm dashboard with LangChain tools and LayerZero bridging",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(positions.router, prefix="/positions", tags=["positions"])
app.include_router(trades.router, prefix="/trades", tags=["trades"])
app.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
app.include_router(farms.router, prefix="/farms", tags=["farms"])
app.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
app.include_router(bridge.router, prefix="/bridge", tags=["bridge"])
app.include_router(tools.router, prefix="/tools", tags=["tools"])
app.include_router(commands.router, prefix="/commands", tags=["commands"])
app.include_router(elizaos.router, prefix="/elizaos", tags=["elizaos"])
app.include_router(trading.router, tags=["trading"])

@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for monitoring and Docker healthchecks
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint with API information
    """
    return {
        "name": "Trading Farm API",
        "version": settings.API_VERSION,
        "docs_url": "/docs",
        "environment": settings.ENVIRONMENT
    }

@app.on_event("startup")
async def startup_event():
    """
    Actions to perform on application startup
    """
    logger.info("Starting Trading Farm API")
    # Test database connection
    try:
        db = get_db_connection()
        supabase = get_supabase_client()
        logger.info("Successfully connected to database")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """
    Actions to perform on application shutdown
    """
    logger.info("Shutting down Trading Farm API")
