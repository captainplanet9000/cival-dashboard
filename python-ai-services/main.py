"""
Enhanced AI Services with PydanticAI Integration
Complements existing Google SDK and A2A systems
"""
import asyncio
import os
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
import uvicorn
from loguru import logger

# Import our enhanced AI services
from services.trading_coordinator import TradingCoordinator
from services.market_analyst import MarketAnalyst
from services.risk_monitor import RiskMonitor
from services.vault_manager import VaultManager
from services.strategy_optimizer import StrategyOptimizer
from utils.google_sdk_bridge import GoogleSDKBridge
from utils.a2a_protocol import A2AProtocol
from types.trading_types import *

# Global services registry
services: Dict[str, Any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup AI services"""
    logger.info("🚀 Starting PydanticAI Enhanced Services")
    
    # Initialize Google SDK Bridge
    google_bridge = GoogleSDKBridge(
        project_id=os.getenv("GOOGLE_CLOUD_PROJECT_ID", "cival-dashboard-dev"),
        credentials_path=os.getenv("GOOGLE_CLOUD_CREDENTIALS"),
        region=os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
    )
    await google_bridge.initialize()
    
    # Initialize A2A Protocol Bridge
    a2a_protocol = A2AProtocol(
        google_bridge=google_bridge,
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
    )
    await a2a_protocol.initialize()
    
    # Initialize enhanced AI agents
    services.update({
        "google_bridge": google_bridge,
        "a2a_protocol": a2a_protocol,
        "trading_coordinator": TradingCoordinator(google_bridge, a2a_protocol),
        "market_analyst": MarketAnalyst(google_bridge, a2a_protocol),
        "risk_monitor": RiskMonitor(google_bridge, a2a_protocol),
        "vault_manager": VaultManager(google_bridge, a2a_protocol),
        "strategy_optimizer": StrategyOptimizer(google_bridge, a2a_protocol)
    })
    
    # Register agents with A2A protocol
    for agent_name, agent in services.items():
        if hasattr(agent, 'register_with_a2a'):
            await agent.register_with_a2a()
    
    logger.info("✅ All PydanticAI services initialized")
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down PydanticAI services")
    for service in services.values():
        if hasattr(service, 'cleanup'):
            await service.cleanup()

# Create FastAPI app with lifespan
app = FastAPI(
    title="PydanticAI Enhanced Trading Services",
    description="Advanced AI agents complementing Google SDK and A2A systems",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check for the PydanticAI services"""
    status = {}
    for name, service in services.items():
        if hasattr(service, 'health_check'):
            status[name] = await service.health_check()
        else:
            status[name] = "running"
    
    return {
        "status": "healthy",
        "services": status,
        "pydantic_ai_version": "0.0.14",
        "integration_status": "google_sdk_connected" if services.get("google_bridge") else "disconnected"
    }

# Enhanced AI Agent Endpoints
@app.post("/api/agents/trading-coordinator/analyze")
async def trading_coordinator_analyze(request: TradingAnalysisRequest):
    """Enhanced trading coordination with PydanticAI intelligence"""
    coordinator = services.get("trading_coordinator")
    if not coordinator:
        raise HTTPException(status_code=503, detail="Trading coordinator not available")
    
    try:
        result = await coordinator.analyze_trading_opportunity(request)
        return result
    except Exception as e:
        logger.error(f"Trading analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/market-analyst/deep-analysis")
async def market_deep_analysis(request: MarketAnalysisRequest):
    """Advanced market analysis with structured outputs"""
    analyst = services.get("market_analyst")
    if not analyst:
        raise HTTPException(status_code=503, detail="Market analyst not available")
    
    try:
        result = await analyst.deep_market_analysis(request)
        return result
    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/risk-monitor/assess")
async def risk_assessment(request: RiskAssessmentRequest):
    """Enhanced risk monitoring with PydanticAI validation"""
    risk_monitor = services.get("risk_monitor")
    if not risk_monitor:
        raise HTTPException(status_code=503, detail="Risk monitor not available")
    
    try:
        result = await risk_monitor.assess_portfolio_risk(request)
        return result
    except Exception as e:
        logger.error(f"Risk assessment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/vault-manager/optimize")
async def vault_optimization(request: VaultOptimizationRequest):
    """Vault management with DeFi integration"""
    vault_manager = services.get("vault_manager")
    if not vault_manager:
        raise HTTPException(status_code=503, detail="Vault manager not available")
    
    try:
        result = await vault_manager.optimize_vault_allocation(request)
        return result
    except Exception as e:
        logger.error(f"Vault optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/strategy-optimizer/enhance")
async def strategy_enhancement(request: StrategyOptimizationRequest):
    """Advanced strategy optimization with ML and backtesting"""
    optimizer = services.get("strategy_optimizer")
    if not optimizer:
        raise HTTPException(status_code=503, detail="Strategy optimizer not available")
    
    try:
        result = await optimizer.enhance_strategy(request)
        return result
    except Exception as e:
        logger.error(f"Strategy optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# A2A Communication Bridge
@app.post("/api/a2a/broadcast")
async def a2a_broadcast(request: A2ABroadcastRequest):
    """Broadcast message through A2A protocol"""
    a2a = services.get("a2a_protocol")
    if not a2a:
        raise HTTPException(status_code=503, detail="A2A protocol not available")
    
    try:
        result = await a2a.broadcast_message(request)
        return result
    except Exception as e:
        logger.error(f"A2A broadcast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/a2a/agents")
async def list_a2a_agents():
    """List all registered A2A agents"""
    a2a = services.get("a2a_protocol")
    if not a2a:
        raise HTTPException(status_code=503, detail="A2A protocol not available")
    
    return await a2a.list_registered_agents()

# Google SDK Integration
@app.get("/api/google-sdk/status")
async def google_sdk_status():
    """Get Google SDK integration status"""
    bridge = services.get("google_bridge")
    if not bridge:
        raise HTTPException(status_code=503, detail="Google SDK bridge not available")
    
    return await bridge.get_status()

@app.post("/api/google-sdk/deploy-agent")
async def deploy_agent_to_vertex(request: VertexDeploymentRequest):
    """Deploy PydanticAI agent to Vertex AI"""
    bridge = services.get("google_bridge")
    if not bridge:
        raise HTTPException(status_code=503, detail="Google SDK bridge not available")
    
    try:
        result = await bridge.deploy_pydantic_agent(request)
        return result
    except Exception as e:
        logger.error(f"Vertex deployment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time updates
@app.websocket("/ws/agent-updates")
async def websocket_agent_updates(websocket):
    """WebSocket endpoint for real-time agent updates"""
    await websocket.accept()
    try:
        # This would integrate with your existing WebSocket system
        while True:
            # Send periodic updates about agent status
            status_update = {
                "timestamp": asyncio.get_event_loop().time(),
                "agents": {name: "active" for name in services.keys()},
                "pydantic_ai_status": "running"
            }
            await websocket.send_json(status_update)
            await asyncio.sleep(5)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    # Run the enhanced AI services
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,  # Different port from your existing services
        reload=True,
        log_level="info"
    )