#!/usr/bin/env python3
"""
MCP Trading Platform - Consolidated Monorepo Application v2.0.0
Unified FastAPI application with centralized service management and dependency injection
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

# FastAPI and web framework imports
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn

# SSE for real-time updates
from sse_starlette.sse import EventSourceResponse

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Core system imports
from core import (
    registry, db_manager, service_initializer,
    get_service_dependency, get_connection_dependency
)

# Import models for API endpoints
from models.api_models import TradingAnalysisCrewRequest, CrewRunResponse
from models.agent_models import AgentConfigInput, AgentStatus
from models.trading_history_models import TradeRecord
from models.paper_trading_models import CreatePaperTradeOrderRequest
from models.execution_models import ExecutionRequest
from models.hyperliquid_models import HyperliquidAccountSnapshot

# Authentication
from auth.dependencies import get_current_active_user
from models.auth_models import AuthenticatedUser

# Logging configuration
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
API_PORT = int(os.getenv("PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    logger.info("🚀 Starting MCP Trading Platform (Consolidated Monorepo v2.0.0)")
    
    try:
        # Initialize database connections
        logger.info("Initializing database connections...")
        db_results = await db_manager.initialize_connections()
        logger.info(f"Database initialization results: {db_results}")
        
        # Initialize all platform services
        logger.info("Initializing platform services...")
        service_results = await service_initializer.initialize_all_services()
        logger.info(f"Service initialization results: {service_results}")
        
        # Register additional services (optional)
        try:
            logger.info("Registering Phase 2 agent trading services...")
            from core.service_registry import register_agent_trading_services
            register_agent_trading_services()
        except ImportError:
            logger.warning("Phase 2 agent trading services not available")
        
        try:
            logger.info("Registering Phase 5 advanced services...")
            from core.service_registry import register_phase5_services
            register_phase5_services()
        except ImportError:
            logger.warning("Phase 5 advanced services not available")
        
        try:
            logger.info("Registering Phase 6-8 autonomous services...")
            from core.service_registry import register_autonomous_services
            register_autonomous_services()
        except ImportError:
            logger.warning("Phase 6-8 autonomous services not available")
        
        # Verify core services are available (but don't fail if they're not)
        core_services = ["historical_data", "trading_engine", "portfolio_tracker", "order_management"]
        available_services = []
        for service_name in core_services:
            service = registry.get_service(service_name)
            if service:
                logger.info(f"✅ Core service {service_name} ready")
                available_services.append(service_name)
            else:
                logger.warning(f"⚠️  Core service {service_name} not available")
        
        # Verify AI services
        ai_services = ["ai_prediction", "technical_analysis", "sentiment_analysis", "ml_portfolio_optimizer"]
        for service_name in ai_services:
            service = registry.get_service(service_name)
            if service:
                logger.info(f"✅ AI service {service_name} ready")
                available_services.append(service_name)
            else:
                logger.warning(f"⚠️  AI service {service_name} not available")
        
        logger.info("✅ MCP Trading Platform ready for agent trading operations!")
        
        # Store startup information in registry
        registry.register_service("startup_info", {
            "version": "2.0.0",
            "startup_time": datetime.now(timezone.utc).isoformat(),
            "environment": ENVIRONMENT,
            "services_initialized": len(registry.all_services),
            "connections_active": len(registry.all_connections)
        })
        
    except Exception as e:
        logger.error(f"Failed to start platform: {e}")
        raise e
    
    yield
    
    # Cleanup on shutdown
    logger.info("🛑 Shutting down MCP Trading Platform...")
    await registry.cleanup()
    await db_manager.cleanup()
    logger.info("Platform shutdown completed")

# Create FastAPI application with consolidated lifespan
app = FastAPI(
    title="MCP Trading Platform",
    description="Consolidated AI-Powered Algorithmic Trading Platform for Agent Operations",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if DEBUG else [os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root and health endpoints
@app.get("/")
async def root():
    """Root endpoint with platform information"""
    startup_info = registry.get_service("startup_info") or {}
    
    return {
        "name": "MCP Trading Platform",
        "version": "2.0.0",
        "description": "Consolidated AI-Powered Algorithmic Trading Platform",
        "architecture": "monorepo",
        "environment": ENVIRONMENT,
        "startup_info": startup_info,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "market_data": "/api/v1/market-data/*",
            "trading": "/api/v1/trading/*",
            "agents": "/api/v1/agents/*",
            "portfolio": "/api/v1/portfolio/*",
            "risk": "/api/v1/risk/*",
            "ai_analytics": "/api/v1/ai/*",
            "agent_trading": "/api/v1/agent-trading/*",
            "autonomous_system": "/api/v1/autonomous/*",
            "dashboard": "/dashboard"
        }
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check for all services and connections"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "environment": ENVIRONMENT,
        "architecture": "consolidated_monorepo"
    }
    
    try:
        # Get detailed health from registry
        detailed_health = await registry.health_check()
        health_status.update(detailed_health)
        
        # Determine overall status
        unhealthy_services = [
            name for name, status in detailed_health.get("services", {}).items()
            if isinstance(status, str) and "error" in status.lower()
        ]
        
        unhealthy_connections = [
            name for name, status in detailed_health.get("connections", {}).items()
            if isinstance(status, str) and "error" in status.lower()
        ]
        
        if unhealthy_services or unhealthy_connections:
            health_status["status"] = "degraded"
            health_status["issues"] = {
                "unhealthy_services": unhealthy_services,
                "unhealthy_connections": unhealthy_connections
            }
        
    except Exception as e:
        health_status["status"] = "error"
        health_status["error"] = str(e)
        logger.error(f"Health check failed: {e}")
    
    return health_status

# Market Data Endpoints (Consolidated from ports 8001-8002)
@app.get("/api/v1/market-data/live/{symbol}")
async def get_live_market_data(
    symbol: str,
    market_data_service = Depends(get_service_dependency("market_data"))
):
    """Get real-time market data for a symbol"""
    try:
        data = await market_data_service.get_live_data(symbol)
        return {"symbol": symbol, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Failed to get live data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Market data error: {str(e)}")

@app.get("/api/v1/market-data/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    period: str = "1d",
    interval: str = "1h",
    historical_data_service = Depends(get_service_dependency("historical_data"))
):
    """Get historical market data"""
    try:
        data = await historical_data_service.get_historical_data(symbol, period, interval)
        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get historical data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Historical data error: {str(e)}")

# Trading Engine Endpoints (Consolidated from ports 8010-8013)
@app.post("/api/v1/trading/orders")
async def create_order(
    order_request: CreatePaperTradeOrderRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    order_management_service = Depends(get_service_dependency("order_management"))
):
    """Create a new trading order"""
    try:
        order = await order_management_service.create_order(order_request, current_user.user_id)
        return order
    except Exception as e:
        logger.error(f"Failed to create order for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Order creation error: {str(e)}")

@app.get("/api/v1/trading/orders")
async def get_orders(
    status: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    order_management_service = Depends(get_service_dependency("order_management"))
):
    """Get user's trading orders"""
    try:
        orders = await order_management_service.get_user_orders(current_user.user_id, status)
        return {"orders": orders, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to get orders for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Order retrieval error: {str(e)}")

@app.get("/api/v1/portfolio/positions")
async def get_portfolio_positions(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    portfolio_service = Depends(get_service_dependency("portfolio_tracker"))
):
    """Get user's portfolio positions"""
    try:
        positions = await portfolio_service.get_positions(current_user.user_id)
        return {"positions": positions, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to get positions for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Portfolio error: {str(e)}")

@app.get("/api/v1/portfolio/performance")
async def get_portfolio_performance(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    portfolio_service = Depends(get_service_dependency("portfolio_tracker"))
):
    """Get portfolio performance metrics"""
    try:
        performance = await portfolio_service.get_performance_metrics(current_user.user_id)
        return {"performance": performance, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to get performance for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Performance error: {str(e)}")

@app.get("/api/v1/risk/assessment")
async def get_risk_assessment(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    risk_service = Depends(get_service_dependency("risk_management"))
):
    """Get portfolio risk assessment"""
    try:
        assessment = await risk_service.assess_portfolio_risk(current_user.user_id)
        return {"risk_assessment": assessment, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to assess risk for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Risk assessment error: {str(e)}")

# Agent Management Endpoints - Core for agent trading operations
@app.post("/api/v1/agents")
async def create_agent(
    agent_request: AgentConfigInput,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Create a new trading agent"""
    try:
        agent = await agent_service.create_agent(agent_request)
        logger.info(f"Created agent {agent.agent_id} for user {current_user.user_id}")
        return agent
    except Exception as e:
        logger.error(f"Failed to create agent for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent creation error: {str(e)}")

@app.get("/api/v1/agents")
async def get_agents(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get user's trading agents"""
    try:
        agents = await agent_service.get_agents()
        return {"agents": agents, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to get agents for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent retrieval error: {str(e)}")

@app.get("/api/v1/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get specific agent details"""
    try:
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent retrieval error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/start")
async def start_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Start a trading agent for live operations"""
    try:
        status = await agent_service.start_agent(agent_id)
        logger.info(f"Started agent {agent_id} for user {current_user.user_id}")
        return status
    except Exception as e:
        logger.error(f"Failed to start agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent start error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/stop")
async def stop_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Stop a trading agent"""
    try:
        status = await agent_service.stop_agent(agent_id)
        logger.info(f"Stopped agent {agent_id} for user {current_user.user_id}")
        return status
    except Exception as e:
        logger.error(f"Failed to stop agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent stop error: {str(e)}")

@app.get("/api/v1/agents/{agent_id}/status")
async def get_agent_status(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get agent operational status"""
    try:
        status = await agent_service.get_agent_status(agent_id)
        if not status:
            raise HTTPException(status_code=404, detail="Agent status not found")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get status for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent status error: {str(e)}")

# Agent Trading Execution Bridge - Critical for operational trading
@app.post("/api/v1/agents/execute-trade")
async def execute_agent_trade(
    execution_request: ExecutionRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    execution_service = Depends(get_service_dependency("execution_specialist"))
):
    """Execute a trade request from an agent with validation"""
    try:
        logger.info(f"Agent trade execution request from {execution_request.source_agent_id}")
        
        # Process through execution specialist with safety checks
        receipt = await execution_service.process_trade_order(execution_request)
        
        logger.info(f"Trade execution completed: {receipt.execution_status}")
        return receipt
    except Exception as e:
        logger.error(f"Agent trade execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Trade execution error: {str(e)}")

# AI and Analytics Endpoints (Consolidated from ports 8050-8053)
@app.post("/api/v1/ai/predict/{symbol}")
async def get_ai_prediction(
    symbol: str,
    prediction_service = Depends(get_service_dependency("ai_prediction"))
):
    """Get AI market prediction for agent decision making"""
    try:
        prediction = await prediction_service.predict_price_movement(symbol)
        return {"symbol": symbol, "prediction": prediction}
    except Exception as e:
        logger.error(f"AI prediction failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"AI prediction error: {str(e)}")

@app.get("/api/v1/analytics/technical/{symbol}")
async def get_technical_analysis(
    symbol: str,
    technical_service = Depends(get_service_dependency("technical_analysis"))
):
    """Get technical analysis for a symbol"""
    try:
        analysis = await technical_service.analyze_symbol(symbol)
        return {"symbol": symbol, "technical_analysis": analysis}
    except Exception as e:
        logger.error(f"Technical analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Technical analysis error: {str(e)}")

@app.get("/api/v1/analytics/sentiment/{symbol}")
async def get_sentiment_analysis(
    symbol: str,
    sentiment_service = Depends(get_service_dependency("sentiment_analysis"))
):
    """Get sentiment analysis for a symbol"""
    try:
        sentiment = await sentiment_service.analyze_sentiment(symbol)
        return {"symbol": symbol, "sentiment_analysis": sentiment}
    except Exception as e:
        logger.error(f"Sentiment analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis error: {str(e)}")

# Real-time Event Streaming for Agent Coordination
@app.get("/api/v1/stream/agent-events")
async def stream_agent_events(
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Server-sent events for real-time agent updates and coordination"""
    
    async def event_generator():
        while True:
            try:
                # Generate agent status updates
                agent_service = registry.get_service("agent_management")
                if agent_service:
                    agents = await agent_service.get_agents()
                    event_data = {
                        "type": "agent_status_update",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "user_id": current_user.user_id,
                        "agent_count": len(agents),
                        "active_agents": [a.agent_id for a in agents if a.is_active]
                    }
                    
                    yield {
                        "event": "agent_update",
                        "data": json.dumps(event_data)
                    }
                
                await asyncio.sleep(30)  # Update every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in agent event stream: {e}")
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
                break
    
    return EventSourceResponse(event_generator())

# Development and debugging endpoints
if DEBUG:
    @app.get("/api/v1/debug/services")
    async def debug_services():
        """Debug endpoint to check all service statuses"""
        return {
            "services": registry.list_services(),
            "connections": registry.list_connections(),
            "registry_initialized": registry.is_initialized(),
            "database_initialized": db_manager.is_initialized()
        }
    
    @app.get("/api/v1/debug/health-detailed")
    async def debug_health():
        """Detailed health check for debugging"""
        return await registry.health_check()

# Include Phase 2 Agent Trading API endpoints
from api.phase2_endpoints import router as phase2_router
app.include_router(phase2_router)

# Include Phase 6-8 Autonomous Trading API endpoints
from api.autonomous_endpoints import router as autonomous_router
app.include_router(autonomous_router)

# Mount dashboard and static files
if os.path.exists("dashboard/static"):
    app.mount("/dashboard/static", StaticFiles(directory="dashboard/static"), name="dashboard_static")

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Dashboard endpoints
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_home(request: Request):
    """Main dashboard home page"""
    try:
        from dashboard.monorepo_dashboard import dashboard
        overview = await dashboard.get_system_overview()
        
        # Use simple template rendering since we have the HTML content
        with open("dashboard/templates/dashboard.html", "r") as f:
            template_content = f.read()
        
        # Simple template variable replacement
        html_content = template_content.replace("{{ title }}", "MCP Trading Platform Dashboard")
        html_content = html_content.replace("{{ overview.status }}", overview.get("status", "unknown"))
        html_content = html_content.replace("{{ overview.uptime_formatted or '0s' }}", overview.get("uptime_formatted", "0s"))
        html_content = html_content.replace("{{ overview.registry.services_count or 0 }}", str(overview.get("registry", {}).get("services_count", 0)))
        html_content = html_content.replace("{{ overview.registry.connections_count or 0 }}", str(overview.get("registry", {}).get("connections_count", 0)))
        html_content = html_content.replace("{{ overview.version or '2.0.0' }}", overview.get("version", "2.0.0"))
        html_content = html_content.replace("{{ overview.architecture or 'monorepo' }}", overview.get("architecture", "monorepo"))
        html_content = html_content.replace("{{ overview.environment or 'production' }}", overview.get("environment", "production"))
        
        return HTMLResponse(content=html_content)
    except Exception as e:
        return HTMLResponse(content=f"<html><body><h1>Dashboard Error</h1><p>{str(e)}</p></body></html>")

@app.get("/dashboard/api/overview")
async def dashboard_overview():
    """Dashboard overview API"""
    try:
        from dashboard.monorepo_dashboard import dashboard
        return await dashboard.get_system_overview()
    except Exception as e:
        return {"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}

# Main entry point
if __name__ == "__main__":
    print("""
    ███╗   ███╗ ██████╗██████╗     ████████╗██████╗  █████╗ ██████╗ ██╗███╗   ██╗ ██████╗ 
    ████╗ ████║██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔════╝ 
    ██╔████╔██║██║     ██████╔╝       ██║   ██████╔╝███████║██║  ██║██║██╔██╗ ██║██║  ███╗
    ██║╚██╔╝██║██║     ██╔═══╝        ██║   ██╔══██╗██╔══██║██║  ██║██║██║╚██╗██║██║   ██║
    ██║ ╚═╝ ██║╚██████╗██║            ██║   ██║  ██║██║  ██║██████╔╝██║██║ ╚████║╚██████╔╝
    ╚═╝     ╚═╝ ╚═════╝╚═╝            ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
                                                                                            
                    🚀 CONSOLIDATED MONOREPO v2.0.0 - AGENT TRADING READY 🚀
    """)
    
    logger.info(f"Starting MCP Trading Platform on port {API_PORT}")
    logger.info(f"Environment: {ENVIRONMENT}")
    logger.info(f"Debug mode: {DEBUG}")
    
    uvicorn.run(
        "main_consolidated:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=DEBUG,
        log_level="info" if not DEBUG else "debug",
        access_log=DEBUG
    )