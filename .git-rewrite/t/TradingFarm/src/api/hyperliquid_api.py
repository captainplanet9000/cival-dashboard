#!/usr/bin/env python
"""
Hyperliquid API Server
Provides REST endpoints for the UI to communicate with the ElizaHyperliquidAgent
"""

import os
import sys
import json
import time
import random
import logging
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add the parent directory to the path to import the project modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from blockchain.hyperliquid_agent import ElizaHyperliquidAgent
from models.order import Order, OrderSide, OrderStatus
from utils.retry import RetryStrategy, exponential_backoff

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hyperliquid API Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent = None
agent_status = {
    "status": "disconnected",
    "last_checked": None,
    "latency": None,
    "error_rate": 0.0,
    "errors": [],
    "last_orders": []
}

# Get the agent ID from the environment or use a default
AGENT_ID = os.getenv("ELIZA_AGENT_ID", "eliza_trading_agent_1")

# Health check metrics
request_times = []
error_count = 0
total_requests = 0

class TradeRequest(BaseModel):
    """Model for trade request"""
    symbol: str
    side: str
    size: float
    retryAttempts: int = 3


class RiskParameters(BaseModel):
    """Model for risk parameters"""
    maxOrderSize: Optional[float] = None
    maxDailyDrawdown: Optional[float] = None
    stopLossPercent: Optional[float] = None
    retryAttempts: Optional[int] = None


@app.on_event("startup")
async def startup_event():
    """Initialize the Hyperliquid agent on startup"""
    global agent, agent_status
    
    try:
        # Get the private key from environment variable
        private_key = os.getenv("HYPERLIQUID_PRIVATE_KEY")
        if not private_key:
            logger.error("HYPERLIQUID_PRIVATE_KEY environment variable not set")
            agent_status["status"] = "error"
            agent_status["errors"].append("Missing private key")
            return
            
        # Initialize the agent
        logger.info(f"Initializing ElizaHyperliquidAgent with ID: {AGENT_ID}")
        agent = ElizaHyperliquidAgent(private_key=private_key, agent_id=AGENT_ID, testnet=True)
        
        # Check connection
        await test_connection()
        
        # Start background health checks
        asyncio.create_task(periodic_health_check())
        
    except Exception as e:
        logger.error(f"Error initializing agent: {e}")
        agent_status["status"] = "error"
        agent_status["errors"].append(str(e))


async def test_connection():
    """Test the connection to Hyperliquid"""
    global agent, agent_status
    
    if not agent:
        logger.error("Agent not initialized")
        agent_status["status"] = "error"
        agent_status["errors"].append("Agent not initialized")
        return False
        
    try:
        # Record start time
        start_time = time.time()
        
        # Simple test: get assets
        await agent.get_available_assets()
        
        # Calculate latency
        latency = int((time.time() - start_time) * 1000)  # Convert to ms
        
        # Update status
        agent_status["status"] = "connected"
        agent_status["latency"] = latency
        agent_status["last_checked"] = time.time()
        logger.info(f"Connection test successful. Latency: {latency}ms")
        
        return True
        
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        agent_status["status"] = "error"
        agent_status["errors"].append(str(e))
        agent_status["last_checked"] = time.time()
        return False


async def periodic_health_check():
    """Perform periodic health checks"""
    global agent_status
    
    while True:
        try:
            await test_connection()
            
            # Calculate error rate (from the last 100 requests)
            global request_times, error_count, total_requests
            if total_requests > 0:
                agent_status["error_rate"] = min(1.0, max(0.0, error_count / max(1, total_requests)))
            
            # Keep only the last 100 request times
            if len(request_times) > 100:
                request_times = request_times[-100:]
                
            # Reset counters periodically
            if total_requests > 1000:
                total_requests = max(100, total_requests // 2)
                error_count = max(0, error_count // 2)
                
        except Exception as e:
            logger.error(f"Health check error: {e}")
            agent_status["status"] = "error"
            agent_status["errors"].append(str(e))
            agent_status["last_checked"] = time.time()
            
        # Wait for next check (30 seconds)
        await asyncio.sleep(30)


def record_api_call(success: bool, latency: int):
    """Record API call for metrics"""
    global request_times, error_count, total_requests
    
    request_times.append(latency)
    total_requests += 1
    if not success:
        error_count += 1


@app.get("/api/hyperliquid/status")
async def get_status():
    """Get the current agent status"""
    global agent, agent_status
    
    if not agent:
        return {
            "status": "disconnected",
            "error": "Agent not initialized"
        }
        
    return {
        "status": agent_status["status"],
        "address": agent.wallet_address if agent else None,
        "agent_id": AGENT_ID,
        "last_checked": agent_status["last_checked"],
        "testnet": True
    }


@app.get("/api/hyperliquid/health")
async def get_health():
    """Get the health metrics of the agent"""
    global agent_status
    
    # If last check was more than 2 minutes ago, run a new check
    if not agent_status["last_checked"] or (time.time() - agent_status["last_checked"]) > 120:
        await test_connection()
        
    return {
        "status": agent_status["status"],
        "latency": agent_status["latency"],
        "error_rate": agent_status["error_rate"],
        "last_checked": agent_status["last_checked"],
        "errors": agent_status["errors"][-5:] if agent_status["errors"] else []
    }


@app.post("/api/hyperliquid/trade")
async def execute_trade(trade_request: TradeRequest, background_tasks: BackgroundTasks):
    """Execute a trade on Hyperliquid"""
    global agent, agent_status
    
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")
        
    if agent_status["status"] != "connected":
        raise HTTPException(status_code=503, detail="Agent not connected")
        
    try:
        start_time = time.time()
        
        # Create an order
        side = OrderSide.BUY if trade_request.side.upper() in ["BUY", "B"] else OrderSide.SELL
        
        order = Order(
            symbol=trade_request.symbol,
            side=side,
            quantity=trade_request.size,
            price=None  # Market order
        )
        
        # Execute the order with retry
        retry_strategy = RetryStrategy(
            max_attempts=trade_request.retryAttempts,
            backoff_fn=exponential_backoff,
            base_delay=1
        )
        
        order_result = await agent.create_abstracted_order(order, retry_strategy=retry_strategy)
        
        # Record latency
        latency = int((time.time() - start_time) * 1000)
        record_api_call(True, latency)
        
        # Track the order
        if "order_id" in order_result:
            order_data = {
                "id": order_result["order_id"],
                "symbol": trade_request.symbol,
                "side": trade_request.side,
                "size": trade_request.size,
                "status": "open",
                "timestamp": time.time()
            }
            agent_status["last_orders"].insert(0, order_data)
            if len(agent_status["last_orders"]) > 10:
                agent_status["last_orders"].pop()
                
            # Schedule a background task to check the order status
            background_tasks.add_task(check_order_status, order_result["order_id"])
        
        return {
            "success": True,
            "order": order_result,
            "latency": latency
        }
        
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        
        # Record error
        latency = int((time.time() - start_time) * 1000)
        record_api_call(False, latency)
        agent_status["errors"].append(str(e))
        
        raise HTTPException(status_code=500, detail=str(e))


async def check_order_status(order_id: str):
    """Background task to check order status"""
    global agent, agent_status
    
    try:
        # Wait a bit before checking
        await asyncio.sleep(2)
        
        # Check status
        status = await agent.get_order_status(order_id)
        
        # Update the order in our tracking
        for order in agent_status["last_orders"]:
            if order["id"] == order_id:
                order["status"] = status.get("status", "unknown")
                order["filled_amount"] = status.get("filled_amount", 0)
                order["last_checked"] = time.time()
                break
                
    except Exception as e:
        logger.error(f"Error checking order status: {e}")


@app.get("/api/hyperliquid/order-status/{order_id}")
async def get_order_status(order_id: str):
    """Get the status of an order"""
    global agent
    
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")
        
    try:
        start_time = time.time()
        
        status = await agent.get_order_status(order_id)
        
        # Record latency
        latency = int((time.time() - start_time) * 1000)
        record_api_call(True, latency)
        
        return {
            "success": True,
            "status": status,
            "latency": latency
        }
        
    except Exception as e:
        logger.error(f"Error getting order status: {e}")
        
        # Record error
        latency = int((time.time() - start_time) * 1000)
        record_api_call(False, latency)
        agent_status["errors"].append(str(e))
        
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hyperliquid/orderbook")
async def get_orderbook(symbol: str):
    """Get the order book for a symbol"""
    global agent
    
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")
        
    try:
        start_time = time.time()
        
        orderbook = await agent.get_order_book(symbol)
        
        # Record latency
        latency = int((time.time() - start_time) * 1000)
        record_api_call(True, latency)
        
        return {
            "success": True,
            "orderbook": orderbook,
            "latency": latency
        }
        
    except Exception as e:
        logger.error(f"Error getting orderbook: {e}")
        
        # Record error
        latency = int((time.time() - start_time) * 1000)
        record_api_call(False, latency)
        agent_status["errors"].append(str(e))
        
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hyperliquid/assets")
async def get_assets():
    """Get available assets"""
    global agent
    
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")
        
    try:
        start_time = time.time()
        
        assets = await agent.get_available_assets()
        
        # Record latency
        latency = int((time.time() - start_time) * 1000)
        record_api_call(True, latency)
        
        return {
            "success": True,
            "assets": assets,
            "latency": latency
        }
        
    except Exception as e:
        logger.error(f"Error getting assets: {e}")
        
        # Record error
        latency = int((time.time() - start_time) * 1000)
        record_api_call(False, latency)
        agent_status["errors"].append(str(e))
        
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/hyperliquid/risk-parameters")
async def update_risk_parameters(parameters: RiskParameters):
    """Update risk parameters"""
    global agent
    
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")
        
    # Update the agent's risk parameters
    updated = {}
    
    if parameters.maxOrderSize is not None:
        agent.max_order_size = parameters.maxOrderSize
        updated["maxOrderSize"] = parameters.maxOrderSize
        
    if parameters.maxDailyDrawdown is not None:
        agent.max_daily_drawdown = parameters.maxDailyDrawdown
        updated["maxDailyDrawdown"] = parameters.maxDailyDrawdown
        
    if parameters.stopLossPercent is not None:
        agent.stop_loss_percent = parameters.stopLossPercent
        updated["stopLossPercent"] = parameters.stopLossPercent
        
    if parameters.retryAttempts is not None:
        agent.default_retry_attempts = parameters.retryAttempts
        updated["retryAttempts"] = parameters.retryAttempts
        
    return {
        "success": True,
        "updated": updated,
        "current": {
            "maxOrderSize": agent.max_order_size,
            "maxDailyDrawdown": agent.max_daily_drawdown,
            "stopLossPercent": agent.stop_loss_percent,
            "retryAttempts": agent.default_retry_attempts
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
