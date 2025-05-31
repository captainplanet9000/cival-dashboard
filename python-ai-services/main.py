"""
Enhanced AI Services with PydanticAI Integration
Complements existing Google SDK and A2A systems
"""
import asyncio
import os
import json # Added for JSON serialization/deserialization
import time # Added for request logging
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request # Added Request
from fastapi.responses import JSONResponse # Added JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
import uvicorn
from loguru import logger
import redis.asyncio as aioredis

# Import our enhanced AI services
from services.trading_coordinator import TradingCoordinator
from services.market_analyst import MarketAnalyst
from services.risk_monitor import RiskMonitor
from services.vault_manager import VaultManager
from services.strategy_optimizer import StrategyOptimizer
from utils.google_sdk_bridge import GoogleSDKBridge
from utils.a2a_protocol import A2AProtocol
from types.trading_types import * # Assuming TradingDecision is in here

# New Service Imports
from services.agent_persistence_service import AgentPersistenceService # Added
from services.agent_state_manager import AgentStateManager # Added
from crews.trading_crew_service import TradingCrewService, TradingCrewRequest # Added
from services.memory_service import MemoryService, LETTA_CLIENT_AVAILABLE # Added MemoryService

# Global services registry
services: Dict[str, Any] = {}

# Pydantic Models for API responses
class CrewBlueprint(BaseModel):
    id: str = Field(..., example="crew_bp_1")
    name: str = Field(..., example="Trading Analysis Crew")
    description: str = Field(..., example="A crew specialized in analyzing market data and proposing trades.")

class LLMParameter(BaseModel):
    temperature: Optional[float] = Field(None, example=0.7, description="Controls randomness in generation.")
    max_tokens: Optional[int] = Field(None, example=1000, description="Maximum number of tokens to generate.")
    top_p: Optional[float] = Field(None, example=0.9, description="Nucleus sampling parameter.")
    top_k: Optional[int] = Field(None, example=40, description="Top-k sampling parameter.")
    frequency_penalty: Optional[float] = Field(None, example=0.0, description="Penalizes new tokens based on their existing frequency.")
    presence_penalty: Optional[float] = Field(None, example=0.0, description="Penalizes new tokens based on whether they appear in the text so far.")

class LLMConfig(BaseModel):
    id: str = Field(..., example="llm_cfg_1")
    model_name: str = Field(..., example="gemini-1.5-pro")
    api_key_env_var: Optional[str] = Field(None, example="GEMINI_API_KEY", description="Environment variable for the API key.")
    parameters: LLMParameter = Field(..., description="Specific parameters for the LLM.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup AI services"""
    logger.info("🚀 Starting PydanticAI Enhanced Services")
    app.state.redis_cache_client = None  # Initialize with None
    try:
        # Initialize Redis Cache Client
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        app.state.redis_cache_client = await aioredis.from_url(redis_url)
        await app.state.redis_cache_client.ping()  # Check connection
        logger.info(f"Successfully connected to Redis at {redis_url} for caching.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis for caching: {e}. Application will continue without caching.")
        app.state.redis_cache_client = None # Ensure it's None if connection failed

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

    # Initialize TradingCrewService
    try:
        trading_crew_service = TradingCrewService()
        services["trading_crew_service"] = trading_crew_service
        logger.info("TradingCrewService initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize TradingCrewService: {e}. Crew AI endpoints may not function.")

    # Initialize AgentPersistenceService
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") # Ensure this is the service_role key for backend use
    redis_url_for_persistence = os.getenv("REDIS_URL", "redis://localhost:6379") # Same Redis as cache for now

    if not supabase_url or not supabase_key:
        logger.warning("Supabase URL or Key not found in environment. AgentPersistenceService will have limited functionality.")
    
    persistence_service = AgentPersistenceService(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        redis_url=redis_url_for_persistence
    )
    await persistence_service.connect_clients() # Connect to Redis and create Supabase client
    services["agent_persistence_service"] = persistence_service
    logger.info("AgentPersistenceService initialized and clients connected (or attempted).")

    # Initialize AgentStateManager (refactored)
    try:
        redis_ttl = int(os.getenv("REDIS_REALTIME_STATE_TTL_SECONDS", "3600"))
        agent_state_manager = AgentStateManager(
            persistence_service=persistence_service,
            redis_realtime_ttl_seconds=redis_ttl
        )
        services["agent_state_manager"] = agent_state_manager
        logger.info("Refactored AgentStateManager initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize AgentStateManager: {e}. Agent state management may not function.")

    # Initialize MemoryService
    try:
        letta_server_url = os.getenv("LETTA_SERVER_URL", "http://localhost:8283")
        # AgentPersistenceService is already initialized and in 'services' dict
        agent_persistence_for_memory = services.get("agent_persistence_service")

        memory_service_instance = MemoryService(
            letta_server_url=letta_server_url,
            persistence_service=agent_persistence_for_memory
        )
        if await memory_service_instance.connect_letta_client():
            logger.info(f"MemoryService connected to Letta client at {letta_server_url} (or stub if library not found).")
        else:
            logger.warning(f"MemoryService failed to connect to Letta client at {letta_server_url}. Will operate in non-functional/stub mode if library is missing.")
        services["memory_service"] = memory_service_instance
        logger.info("MemoryService initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize MemoryService: {e}. Memory capabilities may be unavailable.")
        if "memory_service" not in services: # Ensure it's None if init fails badly
            services["memory_service"] = None


    logger.info("✅ All services initialized (or initialization attempted).")
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down PydanticAI services")
    if app.state.redis_cache_client:
        try:
            await app.state.redis_cache_client.close()
            logger.info("Redis cache client closed successfully.")
        except Exception as e:
            logger.error(f"Error closing Redis cache client: {e}")

    # Close MemoryService Letta client
    memory_service_instance_to_close = services.get("memory_service")
    if memory_service_instance_to_close and hasattr(memory_service_instance_to_close, 'close_letta_client'):
        try:
            await memory_service_instance_to_close.close_letta_client()
            logger.info("MemoryService Letta client closed (conceptual).")
        except Exception as e:
            logger.error(f"Error closing MemoryService Letta client: {e}")

    if services.get("agent_persistence_service"):
        try:
            await services["agent_persistence_service"].close_clients()
            logger.info("AgentPersistenceService clients closed.")
        except Exception as e:
            logger.error(f"Error closing AgentPersistenceService clients: {e}")

    # Generic cleanup for other services that might have a 'cleanup' method
    # Note: TradingCoordinator, MarketAnalyst etc. don't have explicit cleanup in provided code
    for service_name, service_instance in services.items():
        # Avoid double cleanup for services already handled explicitly
        if service_name not in ["agent_persistence_service", "memory_service"] and hasattr(service_instance, 'cleanup'):
            try:
                await service_instance.cleanup()
                logger.info(f"Service '{service_name}' cleaned up.")
            except Exception as e:
                logger.error(f"Error cleaning up service '{service_name}': {e}")

# Create FastAPI app with lifespan
app = FastAPI(
    title="PydanticAI Enhanced Trading Services",
    description="Advanced AI agents complementing Google SDK and A2A systems",
    version="1.0.0",
    lifespan=lifespan
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception caught by global handler for request: {request.method} {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please check server logs for details."},
    )

# Request Logging Middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()

    client_host = request.client.host if request.client else "unknown"
    logger.info(f"Incoming request: {request.method} {request.url.path} from {client_host}")

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000 # milliseconds
    logger.info(f"Response: {response.status_code} for {request.method} {request.url.path} (Processed in {process_time:.2f}ms)")

    return response

# Add CORS middleware for Next.js dashboard
# Ensure this is added after the logging middleware if you want to log CORS preflight/actual requests
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

@app.get("/health/deep")
async def deep_health_check(request: Request):
    """Performs a deep health check of critical dependencies."""
    dependencies = []
    overall_status = "healthy"
    http_status_code = 200

    # 1. Check Redis Cache Client
    redis_cache_client = request.app.state.redis_cache_client
    if redis_cache_client:
        try:
            await redis_cache_client.ping()
            dependencies.append({"name": "redis_cache", "status": "connected"})
            logger.info("Deep health check: Redis cache connected.")
        except Exception as e:
            dependencies.append({"name": "redis_cache", "status": "disconnected", "error": str(e)})
            overall_status = "unhealthy"
            http_status_code = 503
            logger.error(f"Deep health check: Redis cache disconnected - {e}")
    else:
        dependencies.append({"name": "redis_cache", "status": "not_configured"})
        logger.warning("Deep health check: Redis cache client not configured.")

    # 2. Conceptual Supabase Check (Placeholder)
    # No direct Supabase client is available in app.state for a generic check.
    # A real check would involve:
    # - Accessing a Supabase client (e.g., from app.state if initialized globally, or via a service).
    # - Performing a simple query, e.g., "SELECT 1" or checking a specific table's accessibility.
    # For now, this is a placeholder.
    dependencies.append({"name": "supabase", "status": "not_checked"})
    logger.info("Deep health check: Supabase check is a placeholder (not directly implemented in main.py).")
    # If a real check failed:
    # overall_status = "unhealthy"
    # http_status_code = 503
    # dependencies.append({"name": "supabase", "status": "disconnected", "error": "reason"})

    # 3. Check AgentPersistenceService
    persistence_svc = services.get("agent_persistence_service")
    if persistence_svc:
        supabase_status = "connected" if persistence_svc.supabase_client else "not_connected_or_configured"
        redis_persistence_status = "connected" if persistence_svc.redis_client else "not_connected_or_configured"
        dependencies.append({"name": "agent_persistence_supabase_client", "status": supabase_status})
        dependencies.append({"name": "agent_persistence_redis_client", "status": redis_persistence_status})
        if not persistence_svc.supabase_client or not persistence_svc.redis_client:
             # If either critical persistence client is down, service might be impaired
             # overall_status = "unhealthy" # Uncomment if these are hard dependencies for health
             # http_status_code = 503
             logger.warning(f"Deep health check: AgentPersistenceService clients - Supabase: {supabase_status}, Redis: {redis_persistence_status}")
        else:
            logger.info("Deep health check: AgentPersistenceService clients appear connected.")
    else:
        dependencies.append({"name": "agent_persistence_service", "status": "not_initialized"})
        overall_status = "unhealthy" # Persistence service is critical
        http_status_code = 503
        logger.error("Deep health check: AgentPersistenceService not initialized.")

    # 4. Check AgentStateManager
    if services.get("agent_state_manager"):
        dependencies.append({"name": "agent_state_manager", "status": "initialized"})
        logger.info("Deep health check: AgentStateManager is registered.")
    else:
        dependencies.append({"name": "agent_state_manager", "status": "not_initialized"})
        overall_status = "unhealthy" # State manager is critical
        http_status_code = 503
        logger.error("Deep health check: AgentStateManager not initialized.")

    # 5. Check TradingCrewService
    if services.get("trading_crew_service"):
        dependencies.append({"name": "trading_crew_service", "status": "initialized_or_not_checked"})
        logger.info("Deep health check: TradingCrewService is registered.")
    else:
        dependencies.append({"name": "trading_crew_service", "status": "not_initialized"})
        # Depending on criticality, this might set overall_status to unhealthy
        # overall_status = "unhealthy"
        # http_status_code = 503
        logger.warning("Deep health check: TradingCrewService not initialized.")

    # 6. Check MemoryService
    memory_svc = services.get("memory_service")
    if memory_svc:
        letta_client_status = "connected_stub_or_actual" if memory_svc.letta_client else "not_connected"
        if LETTA_CLIENT_AVAILABLE and not memory_svc.letta_client: # Library is there, but client failed to init/connect
            letta_client_status = "connection_failed"
            # If MemoryService is critical for deep health, uncomment these:
            # overall_status = "unhealthy"
            # http_status_code = 503

        dependencies.append({
            "name": "memory_service_letta_client",
            "status": letta_client_status,
            "letta_library_available": LETTA_CLIENT_AVAILABLE
        })
        logger.info(f"Deep health check: MemoryService Letta client status: {letta_client_status}, Letta library available: {LETTA_CLIENT_AVAILABLE}")
    else:
        dependencies.append({"name": "memory_service", "status": "not_initialized"})
        # Decide if this is critical enough to mark overall as unhealthy
        # overall_status = "unhealthy"
        # http_status_code = 503
        logger.warning("Deep health check: MemoryService not initialized.")

    return JSONResponse(
        status_code=http_status_code,
        content={"overall_status": overall_status, "dependencies": dependencies}
    )

# --- Crew AI Endpoints ---

@app.post("/api/v1/crews/trading/analyze", response_model=TradingDecision, summary="Run Trading Analysis Crew", tags=["Crew AI Workflows"])
async def run_trading_crew_analysis(request_data: TradingCrewRequest):
    """
    Initiates a trading analysis using a predefined CrewAI workflow.
    This involves multiple AI agents collaborating to produce a trading decision.

    Requires:
    - `symbol`: The financial instrument to analyze (e.g., "BTC/USD").
    - `timeframe`: The timeframe for analysis (e.g., "1h", "4h").
    - `strategy_name`: Name of the strategy to consider (used to inform tasks).
    - `llm_config_id`: Identifier for the LLM configuration to be used by the crew agents.
    """
    logger.info(f"Received request for trading crew analysis: {request_data.dict()}")
    trading_crew_service = services.get("trading_crew_service")
    if not trading_crew_service:
        logger.error("Trading Crew Service not available at endpoint call.")
        raise HTTPException(status_code=503, detail="Trading Crew Service not available.")

    try:
        # The TradingCrewService.run_analysis method is defined to take the TradingCrewRequest directly
        trade_signal = await trading_crew_service.run_analysis(request_data)

        if trade_signal is None:
            logger.error(f"Trading crew analysis for {request_data.symbol} resulted in an empty signal.")
            raise HTTPException(status_code=500, detail="Crew analysis resulted in an unexpected empty signal.")

        return trade_signal
    except ValueError as ve:
        logger.error(f"Input validation error during trading crew analysis for {request_data.symbol}: {ve}")
        raise HTTPException(status_code=400, detail=str(ve)) # Bad request for value errors
    except NotImplementedError as nie:
        logger.error(f"Feature not implemented during trading crew analysis for {request_data.symbol}: {nie}")
        raise HTTPException(status_code=501, detail=str(nie)) # Not Implemented
    except Exception as e:
        # This log provides specific context before the global handler takes over
        logger.error(f"Unexpected error during trading crew analysis for {request_data.symbol}: {e}")
        raise # Re-raise for the global exception handler to process


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
        logger.error(f"Trading analysis error: {e}") # Keep specific log for context
        raise # Re-raise for global handler to catch and provide generic response

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
        logger.error(f"Market analysis error: {e}") # Keep specific log
        raise # Re-raise for global handler

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
        logger.error(f"Risk assessment error: {e}") # Keep specific log
        raise # Re-raise for global handler

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
        logger.error(f"Vault optimization error: {e}") # Keep specific log
        raise # Re-raise for global handler

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
        logger.error(f"Strategy optimization error: {e}") # Keep specific log
        raise # Re-raise for global handler

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
        logger.error(f"A2A broadcast error: {e}") # Keep specific log
        raise # Re-raise for global handler

@app.get("/api/a2a/agents")
async def list_a2a_agents():
    """List all registered A2A agents"""
    a2a = services.get("a2a_protocol")
    if not a2a:
        raise HTTPException(status_code=503, detail="A2A protocol not available")
    
    return await a2a.list_registered_agents()

# Cache constants
CACHE_KEY_CREW_BLUEPRINTS = "crew-blueprints-cache"
CACHE_KEY_CONFIG_LLMS = "config-llms-cache" # New cache key
CACHE_EXPIRATION_SECONDS = 3600  # 1 hour (reused for both)

# Crew Blueprints Endpoint
@app.get("/crew-blueprints", response_model=List[CrewBlueprint])
async def get_crew_blueprints(request: Request):
    """Returns a list of crew blueprints, with caching."""
    redis_client = request.app.state.redis_cache_client

    if redis_client:
        try:
            cached_data = await redis_client.get(CACHE_KEY_CREW_BLUEPRINTS)
            if cached_data:
                logger.info("Cache hit for /crew-blueprints")
                return json.loads(cached_data)
            else:
                logger.info("Cache miss for /crew-blueprints")
        except aioredis.RedisError as e:
            logger.error(f"Redis error when getting cache for /crew-blueprints: {e}. Serving fresh data.")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for cached /crew-blueprints: {e}. Serving fresh data.")


    # Original data generation (cache miss or Redis error)
    fresh_data = [
        {"id": "crew_bp_1", "name": "Trading Analysis Crew", "description": "A crew specialized in analyzing market data and proposing trades."},
        {"id": "crew_bp_2", "name": "Risk Assessment Crew", "description": "A crew focused on identifying and mitigating risks."},
        {"id": "crew_bp_3", "name": "DeFi Strategy Crew", "description": "A crew for developing and managing DeFi strategies."}
    ]

    if redis_client:
        try:
            serialized_data = json.dumps(fresh_data)
            await redis_client.set(CACHE_KEY_CREW_BLUEPRINTS, serialized_data, ex=CACHE_EXPIRATION_SECONDS)
            logger.info("Successfully cached data for /crew-blueprints")
        except aioredis.RedisError as e:
            logger.error(f"Redis error when setting cache for /crew-blueprints: {e}")
        except json.JSONEncodeError as e: # Should not happen with this data structure
            logger.error(f"JSON encode error when caching /crew-blueprints: {e}")

    return fresh_data

# LLM Configurations Endpoint
@app.get("/config/llms", response_model=List[LLMConfig])
async def get_llm_configurations(request: Request):
    """Returns a list of LLM configurations, with caching."""
    redis_client = request.app.state.redis_cache_client

    if redis_client:
        try:
            cached_data = await redis_client.get(CACHE_KEY_CONFIG_LLMS)
            if cached_data:
                logger.info("Cache hit for /config/llms")
                return json.loads(cached_data)
            else:
                logger.info("Cache miss for /config/llms")
        except aioredis.RedisError as e:
            logger.error(f"Redis error when getting cache for /config/llms: {e}. Serving fresh data.")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for cached /config/llms: {e}. Serving fresh data.")

    # Original data generation (cache miss or Redis error)
    fresh_data = [
        {"id": "llm_cfg_1", "model_name": "gemini-1.5-pro", "api_key_env_var": "GEMINI_API_KEY", "parameters": {"temperature": 0.7, "max_tokens": 1000}},
        {"id": "llm_cfg_2", "model_name": "claude-3-opus", "api_key_env_var": "ANTHROPIC_API_KEY", "parameters": {"temperature": 0.8, "max_tokens": 1500}},
        {"id": "llm_cfg_3", "model_name": "gpt-4-turbo", "api_key_env_var": "OPENAI_API_KEY", "parameters": {"temperature": 0.75, "max_tokens": 1200}}
    ]

    if redis_client:
        try:
            serialized_data = json.dumps(fresh_data)
            await redis_client.set(CACHE_KEY_CONFIG_LLMS, serialized_data, ex=CACHE_EXPIRATION_SECONDS)
            logger.info("Successfully cached data for /config/llms")
        except aioredis.RedisError as e:
            logger.error(f"Redis error when setting cache for /config/llms: {e}")
        except json.JSONEncodeError as e: # Should not happen with this data structure
            logger.error(f"JSON encode error when caching /config/llms: {e}")

    return fresh_data

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
        logger.error(f"Vertex deployment error: {e}") # Keep specific log
        raise # Re-raise for global handler

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