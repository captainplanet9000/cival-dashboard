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

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, WebSocket, WebSocketDisconnect # Added WebSocket, WebSocketDisconnect
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
from types.trading_types import *

# Added for monitoring API
from fastapi import Query # Query for pagination params
from uuid import UUID, uuid4 # For MemoryService dummy IDs
from datetime import datetime, timezone # Ensure these are imported

# Import monitoring models
from models.monitoring_models import AgentTaskSummary, TaskListResponse, DependencyStatus, SystemHealthSummary

# Import services
from services.agent_task_service import AgentTaskService
from services.memory_service import MemoryService, MemoryInitializationError
from services.event_service import EventService, EventServiceError

# Supabase client (will be initialized in lifespan or per-request)
from supabase import create_client, Client as SupabaseClient

# Models and crew for new endpoint
from models.api_models import TradingAnalysisCrewRequest, CrewRunResponse
from agents.crew_setup import trading_analysis_crew
from models.event_models import CrewLifecycleEvent

# For SSE
from sse_starlette.sse import EventSourceResponse


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
    app.state.redis_cache_client = None
    app.state.supabase_client = None # Initialize with None

    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        app.state.redis_cache_client = await aioredis.from_url(redis_url)
        await app.state.redis_cache_client.ping()
        logger.info(f"Successfully connected to Redis at {redis_url} for caching.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis for caching: {e}. Application will continue without caching.")
        app.state.redis_cache_client = None

    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            logger.warning("SUPABASE_URL or SUPABASE_KEY environment variables not set. Supabase dependent services may fail.")
        else:
            app.state.supabase_client = create_client(supabase_url, supabase_key)
            logger.info(f"Supabase client initialized for URL: {supabase_url[:20]}...") # Log only part of the URL
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}. Supabase dependent services may fail.")
        app.state.supabase_client = None

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
    # Renamed agent to agent_instance to avoid potential conflicts
    for agent_name, agent_instance in services.items():
        if hasattr(agent_instance, 'register_with_a2a'):
            await agent_instance.register_with_a2a()

    # Initialize EventService after redis_cache_client is available
    app.state.event_service = None # Initialize with None
    if app.state.redis_cache_client:
        try:
            app.state.event_service = EventService(redis_client=app.state.redis_cache_client)
            logger.info("EventService initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize EventService: {e}", exc_info=True)
            app.state.event_service = None # Ensure it's None if init fails
    else:
        logger.warning("Redis client not available, EventService not initialized. SSE endpoint may not function correctly.")
    
    logger.info("✅ All PydanticAI services initialized")
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down PydanticAI services")
    if app.state.redis_cache_client:
        try:
            await app.state.redis_cache_client.close()
            logger.info("Redis cache client closed successfully.")
        except Exception as e:
            logger.error(f"Error closing Redis cache client: {e}")

    # No explicit Supabase client close method in supabase-py, it uses httpx internally.
    # If create_client gives a client that needs closing, it should be done here.
    # For now, assuming no explicit close needed for the client from create_client.

    # Renamed service to service_instance to avoid potential conflicts
    for service_instance in services.values():
        if hasattr(service_instance, 'cleanup'):
            await service_instance.cleanup()

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


    return JSONResponse(
        status_code=http_status_code,
        content={"overall_status": overall_status, "dependencies": dependencies}
    )

# Dependency Injection for Services

async def get_supabase_client(request: Request) -> Optional[SupabaseClient]:
    if not hasattr(request.app.state, 'supabase_client') or request.app.state.supabase_client is None:
        logger.warning("Supabase client not found in app.state or not initialized.")
        return None
    return request.app.state.supabase_client

async def get_agent_task_service(
    supabase_client: Optional[SupabaseClient] = Depends(get_supabase_client)
) -> AgentTaskService:
    if not supabase_client:
        # This exception will be caught by FastAPI's default error handling
        # and return a 500 error. For more specific client-facing errors (like 503),
        # this could be raised from the endpoint itself or via a custom exception handler.
        raise HTTPException(status_code=503, detail="Supabase client not available. Task service cannot operate.")
    return AgentTaskService(supabase=supabase_client)

async def get_memory_service_for_monitoring() -> MemoryService:
    try:
        # Using dummy IDs for monitoring purposes as actual user/agent context might not be relevant
        dummy_user_id = uuid4()
        dummy_agent_id = uuid4()
        # Ensure MemoryService is correctly imported and its __init__ is compatible
        return MemoryService(user_id=dummy_user_id, agent_id_context=dummy_agent_id)
    except MemoryInitializationError as e:
        logger.error(f"MemoryService initialization failed for monitoring: {e}")
        raise HTTPException(status_code=503, detail=f"MemoryService not available for monitoring: {str(e)}")
    except Exception as e: # Catch any other unexpected errors during initialization
        logger.error(f"Unexpected error initializing MemoryService for monitoring: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unexpected error initializing MemoryService.")

# Dependency for EventService
async def get_event_service(request: Request) -> Optional[EventService]:
    if not hasattr(request.app.state, 'event_service') or request.app.state.event_service is None:
        logger.warning("EventService not found in app.state or not initialized.")
        # Depending on how critical EventService is for an endpoint,
        # you might raise HTTPException here or let the endpoint handle None.
        return None
    return request.app.state.event_service


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

# --- Monitoring API Endpoints ---
MONITORING_API_PREFIX = "/api/v1/monitoring"

@app.get(
    f"{MONITORING_API_PREFIX}/tasks",
    response_model=TaskListResponse,
    summary="Get Paginated List of Agent Tasks",
    tags=["Monitoring"]
)
async def get_tasks_summary(
    page: int = Query(1, ge=1, description="Page number, starting from 1."),
    page_size: int = Query(20, ge=1, le=100, description="Number of tasks per page."),
    task_service: AgentTaskService = Depends(get_agent_task_service)
):
    try:
        # Run the synchronous Supabase call in a thread pool
        loop = asyncio.get_event_loop()
        task_list_response = await loop.run_in_executor(
            None,  # Uses the default thread pool executor
            task_service.get_task_summaries,
            page,
            page_size,
            None  # status_filter is None for now, can be added as a Query param later
        )
        return task_list_response
    except Exception as e:
        logger.error(f"Error fetching task summaries: {e}", exc_info=True)
        # Check if the exception is already an HTTPException (e.g. from get_agent_task_service)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to fetch task summaries: {str(e)}")

@app.get(
    f"{MONITORING_API_PREFIX}/health/dependencies",
    response_model=List[DependencyStatus],
    summary="Get Status of External Dependencies",
    tags=["Monitoring", "Health"]
)
async def get_dependencies_health(request: Request):
    dependencies: List[DependencyStatus] = []

    # Check Supabase client
    supabase_client = await get_supabase_client(request) # Use the dependency
    if supabase_client:
        # This is a basic check. A real check might involve a light query.
        # For now, if client object exists from lifespan, assume 'configured'.
        # Actual operational status would need a ping/query.
        dependencies.append(DependencyStatus(
            name="Supabase (PostgreSQL)",
            status="operational", # Simplified status based on client configuration
            details="Supabase client is configured. Actual DB connection health not deeply checked by this endpoint.",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))
    else:
         dependencies.append(DependencyStatus(
            name="Supabase (PostgreSQL)",
            status="misconfigured", # Or "unavailable" if init failed
            details="Supabase client not initialized or connection details missing.",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))

    # Check Redis client
    redis_client = request.app.state.redis_cache_client if hasattr(request.app.state, 'redis_cache_client') else None
    if redis_client:
        try:
            await redis_client.ping()
            dependencies.append(DependencyStatus(
                name="Redis", status="operational",
                details="Connection to Redis is active.",
                last_checked=datetime.now(timezone.utc).isoformat()
            ))
        except Exception as e:
            dependencies.append(DependencyStatus(
                name="Redis", status="unavailable",
                details=f"Failed to connect to Redis: {str(e)}",
                last_checked=datetime.now(timezone.utc).isoformat()
            ))
    else:
        dependencies.append(DependencyStatus(
            name="Redis", status="misconfigured",
            details="Redis client not configured or not initialized.",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))

    # Check MemoryService (MemGPT)
    try:
        # Attempt to get (and thus initialize) the MemoryService
        await get_memory_service_for_monitoring()
        dependencies.append(DependencyStatus(
            name="MemGPT (via MemoryService)", status="operational",
            details="MemoryService initialized (configuration seems ok). Runtime health of MemGPT itself not deeply checked.",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))
    except HTTPException as http_exc: # Catch HTTPException from get_memory_service_for_monitoring
         dependencies.append(DependencyStatus(
            name="MemGPT (via MemoryService)", status="unavailable", # Or "error" depending on http_exc.status_code
            details=f"MemoryService initialization failed: {http_exc.detail}",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))
    except Exception as e: # Catch any other unexpected errors
        dependencies.append(DependencyStatus(
            name="MemGPT (via MemoryService)", status="error",
            details=f"MemoryService encountered an unexpected error during initialization check: {str(e)}",
            last_checked=datetime.now(timezone.utc).isoformat()
        ))

    return dependencies

@app.get(
    f"{MONITORING_API_PREFIX}/health/system",
    response_model=SystemHealthSummary,
    summary="Get Overall System Health Summary",
    tags=["Monitoring", "Health"]
)
async def get_system_health(request: Request):
    dependency_statuses = await get_dependencies_health(request)

    overall_status = "healthy"
    # Determine overall status based on dependencies
    for dep_status in dependency_statuses:
        if dep_status.status not in ["operational", "not_checked"]: # "not_checked" can be debated
            overall_status = "warning" # If any dependency is not fully operational
            if dep_status.status in ["unavailable", "error", "misconfigured"]:
                overall_status = "critical" # If any critical dependency is down/misconfigured
                break

    # Mock system metrics (replace with actual metrics if available)
    mock_system_metrics = {
        "cpu_load_percentage": 0.0, # Example: psutil.cpu_percent()
        "memory_usage_mb": 0.0,     # Example: psutil.virtual_memory().used / (1024 * 1024)
        "active_tasks": 0 # Example: Could query AgentTaskService for active tasks
    }

    return SystemHealthSummary(
        overall_status=overall_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        dependencies=dependency_statuses,
        system_metrics=mock_system_metrics
    )

@app.get(
    f"{MONITORING_API_PREFIX}/memory/stats",
    # response_model=Optional[Dict[str,Any]], # Return type is Dict[str, Any] from service
    summary="Get Agent Memory Statistics (Stubbed)",
    tags=["Monitoring", "Memory"]
)
async def get_memory_stats(
    memory_service: MemoryService = Depends(get_memory_service_for_monitoring)
):
    try:
        stats_response = await memory_service.get_agent_memory_stats()
        # Check the 'status' field within the response from the service
        if stats_response.get("status") == "error":
            # Use the message from the service response for the HTTPException detail
            raise HTTPException(status_code=503, detail=stats_response.get("message", "MemoryService error"))
        return stats_response # FastAPI will serialize this dict to JSON
    except MemoryInitializationError as e: # Raised by MemoryService.__init__ if it fails
        raise HTTPException(status_code=503, detail=f"MemoryService not available: {str(e)}")
    except HTTPException: # Re-raise if it's already an HTTPException (e.g. from dependency)
        raise
    except Exception as e: # Catch-all for other unexpected errors
        logger.error(f"Error fetching memory stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching memory stats: {str(e)}")

# --- Interactive WebSocket Endpoint ---

@app.websocket("/ws/interactive/{agent_id}")
async def websocket_interactive_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connection established for agent_id: {agent_id} from {websocket.client.host if websocket.client else 'Unknown Client'}")

    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message for agent {agent_id}: {data}")

            # Placeholder for processing and agent interaction
            response_message = f"Agent {agent_id} received your message: '{data}'"
            await websocket.send_text(response_message)
            logger.info(f"Sent response to client for agent {agent_id}: {response_message}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for agent_id: {agent_id} from {websocket.client.host if websocket.client else 'Unknown Client'}")
    except Exception as e:
        # Attempt to inform client of error before closing, if possible.
        error_message_to_client = f"An error occurred: {str(e)}"
        logger.error(f"Error in WebSocket for agent_id {agent_id}: {e}", exc_info=True)
        try:
            await websocket.send_text(error_message_to_client)
        except Exception as send_error: # If sending error also fails (e.g. connection already broken)
            logger.error(f"Failed to send error to client for agent {agent_id} during exception handling: {send_error}", exc_info=True)
        # Depending on the error, you might want to close with a specific code
        # await websocket.close(code=status.WS_1011_INTERNAL_ERROR) # Example: from fastapi import status
    finally:
        # Ensure cleanup or logging associated with the end of this specific connection handler
        logger.info(f"WebSocket connection handler for agent_id: {agent_id} finished.")

# --- SSE Endpoint for Agent Updates ---

async def agent_updates_event_generator(request: Request):
    client_host = request.client.host if request.client else "unknown_sse_client"
    logger.info(f"SSE connection established for agent updates from {client_host}")

    redis_client = getattr(request.app.state, 'redis_cache_client', None)
    event_service = getattr(request.app.state, 'event_service', None)

    if not redis_client or not event_service:
        logger.error(f"SSE stream for {client_host} cannot start: Redis client or EventService not available.")
        yield {
            "event": "error",
            "data": json.dumps({
                "message": "SSE service not properly configured due to missing Redis/EventService.",
                "details": "Redis client missing" if not redis_client else "EventService missing"
            })
        }
        return

    pubsub = redis_client.pubsub()
    event_channel = event_service.default_channel # Or a specific channel name like "agent_events"

    try:
        await pubsub.subscribe(event_channel)
        logger.info(f"SSE client {client_host} subscribed to Redis channel: {event_channel}")

        while True:
            if await request.is_disconnected():
                logger.info(f"SSE client {client_host} disconnected.")
                break

            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                event_data_json = message["data"]
                if isinstance(event_data_json, bytes):
                    event_data_json = event_data_json.decode('utf-8')

                try:
                    event_dict = json.loads(event_data_json)
                    sse_event_id = event_dict.get("event_id", str(uuid4()))
                    sse_event_type = event_dict.get("event_type", "agent_update")
                except json.JSONDecodeError:
                    sse_event_id = str(uuid4())
                    sse_event_type = "raw_agent_event"

                yield {
                    "id": sse_event_id,
                    "event": sse_event_type,
                    "data": event_data_json
                }
                logger.debug(f"SSE: Sent event from channel '{event_channel}' to client {client_host}")

    except asyncio.CancelledError:
        logger.info(f"SSE event generator for {client_host} was cancelled (e.g. server shutdown).")
    except aioredis.RedisError as e:
        logger.error(f"SSE: RedisError for client {client_host} on channel '{event_channel}': {e}", exc_info=True)
        yield {"event": "error", "data": json.dumps({"message": "SSE stream failed due to Redis connection error."})}
    except Exception as e:
        logger.error(f"Error in SSE event generator for {client_host}: {e}", exc_info=True)
        try:
            yield {"event": "error", "data": json.dumps({"message": f"An unexpected error occurred in the SSE stream: {str(e)}."})}
        except Exception:
            pass
    finally:
        logger.info(f"SSE event generator for {client_host} stopping. Unsubscribing from {event_channel}.")
        if pubsub and pubsub.subscribed: # Check if pubsub is not None and still subscribed
            try:
                await pubsub.unsubscribe(event_channel)
                # For redis.asyncio, close() is not typically called on pubsub object directly unless it's a connection pool.
                # If pubsub is from a connection (e.g. redis_client.pubsub()), closing the main client handles connection cleanup.
                # However, if pubsub itself manages a connection, it might need closing.
                # The new redis (v4+) pubsub objects are often auto-cleaned or tied to the client lifetime.
                # Let's assume direct close is not needed for the pubsub object from redis.pubsub()
                # but ensure unsubscribe happens.
                # await pubsub.close() # Re-evaluate if this is needed based on redis client library version/behavior
                logger.info(f"SSE: Unsubscribed from channel '{event_channel}' for client {client_host}")
            except Exception as e:
                logger.error(f"SSE: Error during pubsub unsubscribe for {client_host} on channel '{event_channel}': {e}", exc_info=True)


@app.get("/api/agent-updates/sse")
async def sse_agent_updates(request: Request):
    """
    Server-Sent Events endpoint to stream agent updates.
    Clients can connect to this endpoint to receive real-time updates.
    """
    return EventSourceResponse(agent_updates_event_generator(request))

# --- Crew Execution Endpoints ---

def run_trading_analysis_crew_background(
    task_id: UUID, # Consistent with CrewRunResponse, changed from uuid.UUID to UUID
    user_id: str,
    inputs: Dict[str, Any],
    task_service: AgentTaskService,
    event_service: Optional[EventService] # Event service can be None if not initialized
):
    logger.info(f"Background task started for trading_analysis_crew. Task ID (Crew Run ID): {task_id}")

    user_id_as_uuid: Optional[UUID] = None
    try:
        user_id_as_uuid = UUID(user_id)
    except ValueError:
        logger.error(f"Invalid user_id format: '{user_id}'. Cannot convert to UUID for AgentTask. Using a placeholder random UUID.")
        user_id_as_uuid = uuid4() # Fallback, not ideal for production.

    agent_task = None
    try:
        task_name = f"Trading Analysis for {inputs.get('symbol', 'N/A')}"
        # Create AgentTask to track this crew run
        agent_task = task_service.create_task(
            user_id=user_id_as_uuid,
            task_name=task_name,
            input_parameters=inputs
        )
        # Align the task_id of the agent_task with our crew_run_task_id if they are different.
        # For now, we assume the task_id passed to this function is the definitive one.
        # If agent_task.task_id is generated by DB and differs, it's an internal reference.
        # The external reference is `task_id`.
        logger.info(f"AgentTask DB ID: {agent_task.task_id} created for Crew Run Task ID: {task_id}")

        task_service.update_task_status(task_id=task_id, status="RUNNING") # Use the main task_id

        if event_service and event_service.redis_client:
            crew_started_event = CrewLifecycleEvent(
                source_id=str(task_id),
                crew_run_id=task_id,
                status="STARTED",
                inputs=inputs
            )
            # This is a sync function (BackgroundTasks run in a thread pool).
            # To call async event_service.publish_event, we need to handle the event loop.
            # A simple way for now, if the underlying publish can handle it or if it's quick.
            # Proper way: use `asyncio.run_coroutine_threadsafe` with the main loop.
            try:
                asyncio.run(event_service.publish_event(crew_started_event))
                logger.info(f"CREW_STARTED event published for Task ID: {task_id}")
            except RuntimeError as e:
                 logger.warning(f"Could not publish CREW_STARTED event via asyncio.run for Task ID {task_id} (RuntimeError: {e}). This is common if an event loop is already running in the thread.")
                 logger.debug(f"[EventService Direct Log] Event: {crew_started_event.model_dump_json()}")

        logger.info(f"Running trading_analysis_crew with inputs: {inputs} for Task ID: {task_id}")
        result = trading_analysis_crew.kickoff(inputs=inputs)
        logger.info(f"Trading analysis crew finished for Task ID: {task_id}. Result: {str(result)[:500]}")

        task_service.update_task_status(task_id=task_id, status="COMPLETED", results={"output": str(result)})

        if event_service and event_service.redis_client:
            crew_completed_event = CrewLifecycleEvent(
                source_id=str(task_id),
                crew_run_id=task_id,
                status="COMPLETED",
                result=str(result)
            )
            try:
                asyncio.run(event_service.publish_event(crew_completed_event))
                logger.info(f"CREW_COMPLETED event published for Task ID: {task_id}")
            except RuntimeError as e:
                logger.warning(f"Could not publish CREW_COMPLETED event via asyncio.run for Task ID {task_id} (RuntimeError: {e}).")
                logger.debug(f"[EventService Direct Log] Event: {crew_completed_event.model_dump_json()}")

    except Exception as e:
        logger.error(f"Error running trading_analysis_crew in background for Task ID {task_id}: {e}", exc_info=True)
        if task_id: # Ensure task_id was set (it should be, as it's an arg)
            task_service.update_task_status(task_id=task_id, status="FAILED", error_message=str(e))

        if event_service and event_service.redis_client:
            crew_failed_event = CrewLifecycleEvent(
                source_id=str(task_id) if task_id else "unknown_task",
                crew_run_id=task_id if task_id else None,
                status="FAILED",
                error_message=str(e)
            )
            try:
                asyncio.run(event_service.publish_event(crew_failed_event))
                logger.info(f"CREW_FAILED event published for Task ID: {task_id if task_id else 'unknown_task'}")
            except RuntimeError as re:
                logger.warning(f"Could not publish CREW_FAILED event via asyncio.run for Task ID {task_id if task_id else 'unknown_task'} (RuntimeError: {re}).")
                logger.debug(f"[EventService Direct Log] Event: {crew_failed_event.model_dump_json()}")


@app.post("/api/v1/crews/trading/analyze", response_model=CrewRunResponse, status_code=202)
async def analyze_trading_strategy_with_crew(
    request_data: TradingAnalysisCrewRequest, # Renamed request to request_data to avoid conflict
    background_tasks: BackgroundTasks,
    task_service: AgentTaskService = Depends(get_agent_task_service),
    event_service: Optional[EventService] = Depends(get_event_service)
):
    """
    Triggers the Trading Analysis Crew to analyze a symbol based on provided context.
    This is an asynchronous operation; the API returns immediately with a task ID.
    """
    crew_run_task_id = uuid4() # Use uuid4() which is already imported

    inputs_for_crew = {
        "symbol": request_data.symbol,
        "market_event_description": request_data.market_event_description,
        "additional_context": request_data.additional_context,
        "user_id": request_data.user_id,
        "crew_run_id": str(crew_run_task_id)
    }

    background_tasks.add_task(
        run_trading_analysis_crew_background,
        task_id=crew_run_task_id,
        user_id=request_data.user_id,
        inputs=inputs_for_crew,
        task_service=task_service,
        event_service=event_service # Pass the (potentially None) event_service
    )

    logger.info(f"Trading analysis crew task enqueued. Task ID (Crew Run ID): {crew_run_task_id}")

    return CrewRunResponse(
        task_id=crew_run_task_id,
        status="ACCEPTED",
        message="Trading analysis crew task accepted and initiated."
    )

if __name__ == "__main__":
    # Run the enhanced AI services
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,  # Different port from your existing services
        reload=True,
        log_level="info"
    )