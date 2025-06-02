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
from services.simulated_trade_executor import SimulatedTradeExecutor
from services.strategy_config_service import ( # Added
    StrategyConfigService,
    StrategyConfigNotFoundError,
    StrategyConfigCreationError,
    StrategyConfigUpdateError,
    StrategyConfigDeletionError,
    StrategyConfigServiceError
)
from services.strategy_visualization_service import StrategyVisualizationService, StrategyVisualizationServiceError
from models.visualization_models import StrategyVisualizationRequest, StrategyVisualizationDataResponse


# Supabase client (will be initialized in lifespan or per-request)
from supabase import create_client, Client as SupabaseClient

# Strategy Config Models
from models.strategy_models import StrategyConfig, BaseStrategyConfig, PerformanceMetrics, StrategyTimeframe, StrategyPerformanceTeaser
from models.trading_history_models import TradeRecord, OrderStatus as TradingHistoryOrderStatus
from models.paper_trading_models import PaperTradeOrder, PaperTradeFill, CreatePaperTradeOrderRequest, PaperOrderStatus
from models.watchlist_models import ( # Watchlist models
    Watchlist, WatchlistCreate, WatchlistItem, WatchlistItemCreate, WatchlistWithItems,
    AddWatchlistItemsRequest,
    BatchQuotesRequest, BatchQuotesResponse # BatchQuotesResponseItem not directly used in endpoint response model
)

# Services
# ... (other service imports)
from services.watchlist_service import ( # Watchlist service and exceptions
    WatchlistService,
    WatchlistNotFoundError,
    WatchlistItemNotFoundError,
    WatchlistOperationForbiddenError,
    WatchlistServiceError
)


# Models and crew for new endpoint
from models.api_models import TradingAnalysisCrewRequest, CrewRunResponse
from agents.crew_setup import trading_analysis_crew
from models.event_models import CrewLifecycleEvent, AlertEvent, AlertLevel # Added AlertEvent, AlertLevel

# For SSE
from sse_starlette.sse import EventSourceResponse

# Auth
from auth.dependencies import get_current_active_user
from models.auth_models import AuthenticatedUser

# User Preferences
from models.user_models import UserPreferences
from services.user_preference_service import UserPreferenceService, UserPreferenceServiceError


# Global services registry
services: Dict[str, Any] = {}

# Pydantic Models for API responses and utility endpoints
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

class StrategyFormMetadataResponse(BaseModel):
    available_strategy_types: List[str]
    available_timeframes: List[str]

class SubmitPaperOrderResponse(BaseModel):
    updated_order: PaperTradeOrder
    fills: List[PaperTradeFill]
    message: str

class StrategyVisualizationQueryParams(BaseModel): # For the refactored visualization endpoint
    strategy_config_id: uuid.UUID
    start_date: date # Ensure date is imported from datetime
    end_date: date


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
    
    
    # Initialize SimulatedTradeExecutor
    app.state.simulated_trade_executor = None
    supabase_url_env = os.getenv("SUPABASE_URL") # Store env vars locally
    supabase_key_env = os.getenv("SUPABASE_KEY")
    event_service_instance = getattr(app.state, 'event_service', None) # Get EventService instance

    if supabase_url_env and supabase_key_env: # Check if Supabase creds are set
        if app.state.supabase_client: # Check if Supabase client itself was initialized
            try:
                app.state.simulated_trade_executor = SimulatedTradeExecutor(
                    supabase_url=supabase_url_env,
                    supabase_key=supabase_key_env,
                    event_service=event_service_instance # Pass the EventService instance
                )
                logger.info("SimulatedTradeExecutor initialized successfully" + (" with EventService." if event_service_instance else " without EventService (alert events may be disabled)."))
            except Exception as e:
                logger.error(f"Failed to initialize SimulatedTradeExecutor: {e}", exc_info=True)
                # app.state.simulated_trade_executor remains None
        else:
            logger.warning("Supabase client failed to initialize earlier. SimulatedTradeExecutor not initialized.")
    else:
        logger.warning("SUPABASE_URL or SUPABASE_KEY not set in environment. SimulatedTradeExecutor not initialized.")

    # Initialize enhanced AI agents/services dictionary
    # Clear any existing services to ensure fresh init with all dependencies
    services.clear()
    services["google_bridge"] = google_bridge
    services["a2a_protocol"] = a2a_protocol

    # Initialize services that depend on google_bridge and a2a_protocol
    services["market_analyst"] = MarketAnalyst(google_bridge, a2a_protocol)
    services["risk_monitor"] = RiskMonitor(google_bridge, a2a_protocol) # Assuming RiskMonitor takes these two
    services["vault_manager"] = VaultManager(google_bridge, a2a_protocol) # Assuming VaultManager takes these two
    services["strategy_optimizer"] = StrategyOptimizer(google_bridge, a2a_protocol) # Assuming StrategyOptimizer takes these two

    # Initialize TradingCoordinator with SimulatedTradeExecutor
    if app.state.simulated_trade_executor:
        services["trading_coordinator"] = TradingCoordinator(
            google_bridge=google_bridge,
            a2a_protocol=a2a_protocol,
            simulated_trade_executor=app.state.simulated_trade_executor
        )
    else:
        logger.error("SimulatedTradeExecutor not available. TradingCoordinator will not have paper trading capabilities.")
        # Optionally, initialize TradingCoordinator without simulated_trade_executor or handle this state
        # For now, if STE is missing, TC that uses it for paper trading won't be fully functional.
        # One might decide to not add it to services dict, or add a version with limited functionality.
        # To keep it simple, we'll assume if STE fails, TC that needs it might not be added or will error on use.
        # However, the prompt implies TC is always there, so let's log a severe warning.
        # services["trading_coordinator"] = TradingCoordinator(google_bridge, a2a_protocol, None) # If TC can handle None STE
    elif services.get("google_bridge") and services.get("a2a_protocol"): # If STE is None, but other deps are there
        logger.error("SimulatedTradeExecutor not available. Initializing TradingCoordinator without paper trading capabilities or it might fail if STE is mandatory.")
        # Decide if TradingCoordinator should be initialized at all if STE is critical for its core functions.
        # For now, assuming TradingCoordinator might still have other roles or can handle a None STE.
        # If TradingCoordinator's __init__ was updated to make simulated_trade_executor non-optional, this would fail.
        # The current __init__ for TradingCoordinator makes it non-optional.
        # So, if app.state.simulated_trade_executor is None, TC init will fail here unless TC is updated.
        # This part of the logic needs to be robust based on whether TC *requires* STE.
        # Given the prompt, TC does require it in its __init__.
        # So, if STE is None, TC will not be correctly initialized with it.
        # The `else` block for TC initialization needs to reflect this.
        # The current code for TC init is *inside* the `if app.state.simulated_trade_executor:` block
        # which is correct: TC is only initialized with STE if STE is available.
        # If TC *must* be in services dict, then it needs to handle STE being None.
        # For now, if STE is None, TC that *requires* it won't be in services dict.
        pass # trading_coordinator will not be (re)set in services if STE is None.

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

async def get_user_preference_service(
    # request: Request, # Not strictly needed if supabase_client comes from its own injector
    supabase_client: Optional[SupabaseClient] = Depends(get_supabase_client) # Ensure SupabaseClient is imported
) -> UserPreferenceService:
    if not supabase_client:
        logger.error("Supabase client not available for UserPreferenceService.")
        raise HTTPException(status_code=503, detail="Database client not available.")
    return UserPreferenceService(supabase_client=supabase_client)

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

async def get_simulated_trade_executor(request: Request) -> Optional[SimulatedTradeExecutor]:
    if not hasattr(request.app.state, 'simulated_trade_executor') or request.app.state.simulated_trade_executor is None:
        logger.warning("SimulatedTradeExecutor not found in app.state or not initialized.")
        return None
    return request.app.state.simulated_trade_executor

async def get_strategy_config_service(
    # request: Request, # Not strictly needed if only depending on supabase_client
    supabase_client: Optional[SupabaseClient] = Depends(get_supabase_client)
) -> StrategyConfigService:
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database client not available. Cannot manage strategy configurations.")
    return StrategyConfigService(supabase_client=supabase_client)

async def get_strategy_visualization_service(
    supabase_client: Optional[SupabaseClient] = Depends(get_supabase_client),
    strategy_config_service: StrategyConfigService = Depends(get_strategy_config_service)
) -> StrategyVisualizationService:
    if not supabase_client:
        logger.error("Supabase client not available for StrategyVisualizationService.")
        raise HTTPException(status_code=503, detail="Database client not available.")
    if not strategy_config_service:
        logger.error("StrategyConfigService not available for StrategyVisualizationService.")
        raise HTTPException(status_code=503, detail="StrategyConfigService not available.")

    return StrategyVisualizationService(
        supabase_client=supabase_client,
        strategy_config_service=strategy_config_service
    )

async def get_watchlist_service(
    supabase_client: Optional[SupabaseClient] = Depends(get_supabase_client)
) -> WatchlistService:
    if not supabase_client:
        logger.error("Supabase client not available for WatchlistService.")
        raise HTTPException(status_code=503, detail="Database client not available.")
    return WatchlistService(supabase_client=supabase_client)

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
CACHE_KEY_PERFORMANCE_TEASERS_USER_PREFIX = "performance_teasers_user_"
CACHE_PERFORMANCE_TEASERS_EXPIRATION_SECONDS = 300  # 5 minutes, adjust as needed
CACHE_KEY_STRATEGY_VIZ_PREFIX = "strategy_viz_"
CACHE_STRATEGY_VIZ_EXPIRATION_SECONDS = 600  # 10 minutes, adjust as needed

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

# --- SSE Endpoint for Alert Events ---
async def alert_event_stream_generator(request: Request):
    client_host = request.client.host if request.client else "unknown_alert_sse_client"
    logger.info(f"SSE connection established for alerts from {client_host}")

    redis_client = getattr(request.app.state, 'redis_cache_client', None)
    # EventService isn't strictly needed here if we know the channel name
    # event_service = getattr(request.app.state, 'event_service', None)

    alert_channel = "alert_events"

    if not redis_client:
        logger.error(f"SSE alert stream for {client_host} cannot start: Redis client not available.")
        yield {
            "event": "error", "id": str(uuid4()), # Ensure uuid4 is available (imported as from uuid import UUID, uuid4)
            "data": json.dumps({"message": "SSE service not properly configured due to missing Redis client."})
        }
        return

    pubsub = redis_client.pubsub()
    try:
        await pubsub.subscribe(alert_channel)
        logger.info(f"SSE client {client_host} subscribed to Redis alert channel: {alert_channel}")

        while True:
            if await request.is_disconnected():
                logger.info(f"SSE alert client {client_host} disconnected.")
                break

            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                alert_data_json = message["data"]
                if isinstance(alert_data_json, bytes):
                    alert_data_json = alert_data_json.decode('utf-8')

                try:
                    alert_dict = json.loads(alert_data_json)
                    sse_event_id = alert_dict.get("event_id", str(uuid4()))
                    sse_event_type = alert_dict.get("event_type", "alert_notification")
                except json.JSONDecodeError:
                    sse_event_id = str(uuid4())
                    sse_event_type = "raw_alert_event" # Fallback event type

                yield {
                    "id": sse_event_id,
                    "event": sse_event_type,
                    "data": alert_data_json
                }
                logger.debug(f"SSE: Sent alert from channel '{alert_channel}' to client {client_host}")

    except asyncio.CancelledError:
        logger.info(f"SSE alert event generator for {client_host} was cancelled.")
    except aioredis.RedisError as e: # Ensure aioredis is imported
        logger.error(f"SSE: RedisError for alert client {client_host} on channel '{alert_channel}': {e}", exc_info=True)
        yield {"event": "error", "id": str(uuid4()), "data": json.dumps({"message": "SSE alert stream failed due to Redis connection error."})}
    except Exception as e:
        logger.error(f"Error in SSE alert event generator for {client_host}: {e}", exc_info=True)
        try:
            yield {"event": "error", "id": str(uuid4()), "data": json.dumps({"message": f"An error occurred in the SSE alert stream: {str(e)}."})}
        except Exception: pass # Avoid error in error reporting
    finally:
        logger.info(f"SSE alert event generator for {client_host} stopping. Unsubscribing from {alert_channel}.")
        if pubsub and pubsub.subscribed:
            try:
                await pubsub.unsubscribe(alert_channel)
                # await pubsub.close() # See previous notes on closing pubsub object
                logger.info(f"SSE: Unsubscribed from alert channel '{alert_channel}' for client {client_host}")
            except Exception as e:
                logger.error(f"SSE: Error during pubsub cleanup for alerts on channel '{alert_channel}': {e}", exc_info=True)

@app.get(
    "/api/alerts/sse",
    summary="Server-Sent Events endpoint to stream alert notifications",
    tags=["Alerts", "SSE"]
)
async def sse_alert_notifications(request: Request):
    """
    Provides a stream of alert events (e.g., trade signals, system warnings)
    published by backend services.
    """
    return EventSourceResponse(alert_event_stream_generator(request))

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
            try:
                asyncio.run(event_service.publish_event(crew_started_event)) # Placeholder for sync context
                logger.info(f"CREW_STARTED event published for Task ID: {task_id}")
            except RuntimeError as e:
                 logger.warning(f"Could not publish CREW_STARTED event via asyncio.run for Task ID {task_id}: {e}. Logging locally.")
                 logger.debug(f"[EventService Direct Log] Event: {crew_started_event.model_dump_json()}")

        logger.info(f"Running trading_analysis_crew with inputs: {inputs} for Task ID: {task_id}")
        result = trading_analysis_crew.kickoff(inputs=inputs) # This is a string result
        logger.info(f"Trading analysis crew finished for Task ID: {task_id}. Result: {str(result)[:500]}")

        # Attempt to parse result and potentially publish actionable signal alert
        try:
            crew_result_dict = json.loads(result if isinstance(result, str) else "{}")
            opportunity_details = crew_result_dict.get("opportunity_details")
            if opportunity_details and isinstance(opportunity_details, dict):
                action_type = opportunity_details.get("type", "").upper()
                confidence = float(opportunity_details.get("confidence", 0.0))
                CONFIDENCE_THRESHOLD = 0.6 # Example
                if action_type in ["BUY", "SELL"] and confidence >= CONFIDENCE_THRESHOLD:
                    if event_service and event_service.redis_client:
                        actionable_signal_alert = AlertEvent(
                            source_id=f"TradingCoordinator_CrewRun_{task_id}",
                            crew_run_id=task_id,
                            alert_level=AlertLevel.INFO,
                            message=f"Actionable trade signal by crew for {inputs.get('symbol')}: {action_type}",
                            details={
                                "symbol": inputs.get('symbol'), "action": action_type, "confidence": confidence,
                                "opportunity_details": opportunity_details
                            }
                        )
                        try:
                            asyncio.run(event_service.publish_event(actionable_signal_alert, channel="alert_events"))
                            logger.info(f"Published actionable signal alert for crew run {task_id}")
                        except RuntimeError as re:
                            logger.warning(f"Could not publish actionable signal alert via asyncio.run for Task ID {task_id}: {re}. Logging locally.")
                            logger.debug(f"[EventService Direct Log] Event: {actionable_signal_alert.model_dump_json()}")
        except json.JSONDecodeError:
            logger.warning(f"Crew result for task {task_id} was not valid JSON, cannot check for actionable signal alert. Result: {result}")
        except Exception as e_alert:
            logger.error(f"Error processing crew result for actionable signal alert (task {task_id}): {e_alert}", exc_info=True)


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
                logger.warning(f"Could not publish CREW_COMPLETED event via asyncio.run for Task ID {task_id}: {e}. Logging locally.")
                logger.debug(f"[EventService Direct Log] Event: {crew_completed_event.model_dump_json()}")

    except Exception as e:
        logger.error(f"Error running trading_analysis_crew in background for Task ID {task_id}: {e}", exc_info=True)
        if task_id:
            task_service.update_task_status(task_id=task_id, status="FAILED", error_message=str(e))

        if event_service and event_service.redis_client:
            # Publish CrewLifecycleEvent for FAILED
            crew_lifecycle_failed_event = CrewLifecycleEvent( # Renamed to avoid conflict with AlertEvent
                source_id=str(task_id) if task_id else "unknown_task_lc", # Distinguish source for lifecycle
                crew_run_id=task_id if task_id else None,
                status="FAILED",
                error_message=str(e)
            )
            try:
                asyncio.run(event_service.publish_event(crew_lifecycle_failed_event)) # Default channel from EventService
                logger.info(f"CREW_LIFECYCLE_FAILED event published for Task ID: {task_id if task_id else 'unknown_task_lc'}")
            except RuntimeError as re:
                logger.warning(f"Could not publish CREW_LIFECYCLE_FAILED event via asyncio.run for Task ID {task_id if task_id else 'unknown_task_lc'}: {re}. Logging locally.")
                logger.debug(f"[EventService Direct Log] Event: {crew_lifecycle_failed_event.model_dump_json()}")

            # Publish AlertEvent for FAILED crew execution
            crew_failure_alert = AlertEvent(
                source_id=f"TradingCoordinator_CrewRun_{task_id}",
                crew_run_id=task_id,
                alert_level=AlertLevel.ERROR,
                message=f"Trading analysis crew execution FAILED for symbol {inputs.get('symbol', 'N/A')}.",
                details={"error": str(e), "inputs": inputs}
            )
            try:
                asyncio.run(event_service.publish_event(crew_failure_alert, channel="alert_events"))
                logger.info(f"Published crew FAILED alert for Task ID: {task_id}")
            except RuntimeError as re:
                logger.warning(f"Could not publish crew FAILED alert via asyncio.run for Task ID {task_id}: {re}. Logging locally.")
                logger.debug(f"[EventService Direct Log] Event: {crew_failure_alert.model_dump_json()}")


@app.post("/api/v1/crews/trading/analyze", response_model=CrewRunResponse, status_code=202)
async def analyze_trading_strategy_with_crew(
    request_data: TradingAnalysisCrewRequest, # Request model no longer has user_id
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    task_service: AgentTaskService = Depends(get_agent_task_service),
    event_service: Optional[EventService] = Depends(get_event_service)
):
    """
    Triggers the Trading Analysis Crew to analyze a symbol based on provided context for the authenticated user.
    This is an asynchronous operation; the API returns immediately with a task ID.
    """
    crew_run_task_id = uuid4()

    inputs_for_crew = {
        "symbol": request_data.symbol,
        "market_event_description": request_data.market_event_description,
        "additional_context": request_data.additional_context,
        "user_id": str(current_user.id), # Use authenticated user's ID as string
        "crew_run_id": str(crew_run_task_id)
    }

    background_tasks.add_task(
        run_trading_analysis_crew_background,
        task_id=crew_run_task_id,
        user_id=str(current_user.id), # Pass user_id as string
        inputs=inputs_for_crew,
        task_service=task_service,
        event_service=event_service
    )

    logger.info(f"Trading analysis crew task for user {current_user.id} enqueued. Task ID (Crew Run ID): {crew_run_task_id}")

    return CrewRunResponse(
        task_id=crew_run_task_id,
        status="ACCEPTED",
        message="Trading analysis crew task accepted and initiated."
    )

# --- Strategy Configuration Endpoints ---
STRATEGY_CONFIG_API_PREFIX = "/api/v1/strategies"

@app.post(
    f"{STRATEGY_CONFIG_API_PREFIX}/",
    response_model=StrategyConfig,
    status_code=201,
    summary="Create a new strategy configuration for the authenticated user",
    tags=["Strategy Configurations"]
)
async def create_strategy_config_for_current_user(
    config_payload: StrategyConfig,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        created_config = await service.create_strategy_config(user_id=current_user.id, config_data=config_payload)
        return created_config
    except StrategyConfigCreationError as e:
        logger.error(f"Failed to create strategy config for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating strategy config for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating the strategy configuration.")

@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/",
    response_model=List[StrategyConfig],
    summary="Get all strategy configurations for the authenticated user",
    tags=["Strategy Configurations"]
)
async def get_all_strategy_configs_for_current_user(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        return await service.get_strategy_configs_by_user(user_id=current_user.id)
    except Exception as e:
        logger.error(f"Unexpected error fetching strategy configs for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/{{strategy_id}}",
    response_model=StrategyConfig,
    summary="Get a specific strategy configuration for the authenticated user",
    tags=["Strategy Configurations"]
)
async def get_single_strategy_config_for_current_user(
    strategy_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        config = await service.get_strategy_config(strategy_id=strategy_id, user_id=current_user.id)
        if not config:
            # Service method already checks ownership by user_id, so if not found, it's either truly not there or not owned.
            raise HTTPException(status_code=404, detail="Strategy configuration not found or not accessible by user.")
        return config
    except StrategyConfigNotFoundError: # This might be redundant if service's get_strategy_config doesn't raise it but returns None
        raise HTTPException(status_code=404, detail="Strategy configuration not found.")
    except Exception as e:
        logger.error(f"Unexpected error fetching strategy config {strategy_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Define a Pydantic model for partial updates. All fields should be optional.
# This can be generated dynamically or defined explicitly.
# For now, using Dict[str, Any] as per prompt, but noting this is less safe.
# class StrategyConfigUpdatePayload(BaseModel):
#     strategy_name: Optional[str] = None
#     description: Optional[str] = None
#     symbols: Optional[List[str]] = Field(default=None, min_items=1)
#     timeframe: Optional[str] = None # Ideally StrategyTimeframe, but needs to be importable here
#     parameters: Optional[Dict[str, Any]] = None
#     is_active: Optional[bool] = None
#     # strategy_type typically should not be updatable once set, or requires careful handling
#     # of parameters field if it is.

@app.put(
    f"{STRATEGY_CONFIG_API_PREFIX}/{{strategy_id}}",
    response_model=StrategyConfig,
    summary="Update an existing strategy configuration for the authenticated user",
    tags=["Strategy Configurations"]
)
async def update_strategy_config_for_current_user(
    strategy_id: UUID,
    update_payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    if not update_payload:
        raise HTTPException(status_code=400, detail="Update payload cannot be empty.")
    try:
        updated_config = await service.update_strategy_config(
            strategy_id=strategy_id, user_id=current_user.id, update_payload=update_payload
        )
        return updated_config
    except StrategyConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Strategy configuration not found or not owned by user.")
    except (StrategyConfigUpdateError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating strategy config {strategy_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.delete(
    f"{STRATEGY_CONFIG_API_PREFIX}/{{strategy_id}}",
    status_code=204,
    summary="Delete a strategy configuration for the authenticated user",
    tags=["Strategy Configurations"]
)
async def delete_strategy_config_for_current_user(
    strategy_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        await service.delete_strategy_config(strategy_id=strategy_id, user_id=current_user.id)
        return
    except StrategyConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Strategy configuration not found or not owned by user.")
    except StrategyConfigDeletionError as e:
        logger.error(f"Failed to delete strategy config {strategy_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting strategy config {strategy_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/{{strategy_id}}/performance/latest",
    response_model=Optional[PerformanceMetrics],
    summary="Get the latest performance metrics for a specific strategy (authenticated user)",
    tags=["Strategy Configurations", "Performance Analytics"]
)
async def get_latest_strategy_performance_for_current_user( # Renamed function
    strategy_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Added auth
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        # Service method get_latest_performance_metrics already includes user_id for ownership check
        metrics = await service.get_latest_performance_metrics(strategy_id=strategy_id, user_id=current_user.id)
        if not metrics:
            raise HTTPException(status_code=404, detail="Performance metrics not found for this strategy, or strategy does not exist/belong to user.")
        return metrics
    except StrategyConfigServiceError as e:
        logger.error(f"Service error fetching performance for strategy {strategy_id} (user {current_user.id}): {e}", exc_info=True)
        if "not found for user" in str(e).lower():
            raise HTTPException(status_code=404, detail="Strategy configuration not found or not owned by user.")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching performance for strategy {strategy_id} (user {current_user.id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/{{strategy_id}}/trade_history",
    response_model=List[TradeRecord],
    summary="Get trade history for a specific strategy (authenticated user)",
    tags=["Strategy Configurations", "Performance Analytics"]
)
async def get_strategy_trade_history_for_current_user( # Renamed function
    strategy_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Added auth
    limit: int = Query(100, ge=1, le=1000, description="Number of trades to return."),
    offset: int = Query(0, ge=0, description="Offset for pagination."),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    try:
        trades = await service.get_trade_history_for_strategy(
            strategy_id=strategy_id, user_id=current_user.id, limit=limit, offset=offset
        )
        return trades
    except StrategyConfigServiceError as e:
        logger.error(f"Service error fetching trade history for strategy {strategy_id} (user {current_user.id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching trade history for strategy {strategy_id} (user {current_user.id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/performance-teasers",  # Path changed
    response_model=List[StrategyPerformanceTeaser],
    summary="Get a summary list of all strategies for the authenticated user with performance teasers", # Updated summary
    tags=["Strategy Configurations", "Performance Analytics"]
)
async def get_user_strategies_performance_teasers(
    request: Request, # Added Request to access app.state.redis_cache_client
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: StrategyConfigService = Depends(get_strategy_config_service)
):
    """
    Retrieves a list of all strategy configurations for the authenticated user,
    each augmented with key performance indicators from their latest metrics record.
    Results are cached for a short period.
    """
    redis_client = getattr(request.app.state, 'redis_cache_client', None)
    cache_key = f"{CACHE_KEY_PERFORMANCE_TEASERS_USER_PREFIX}{current_user.id}"

    if redis_client:
        try:
            cached_data_json = await redis_client.get(cache_key)
            if cached_data_json:
                logger.info(f"Cache hit for performance teasers: User {current_user.id}, Key: {cache_key}")
                # Deserialize JSON string to list of dicts, then parse with Pydantic model
                cached_list_of_dicts = json.loads(cached_data_json)
                return [StrategyPerformanceTeaser(**data) for data in cached_list_of_dicts]
            else:
                logger.info(f"Cache miss for performance teasers: User {current_user.id}, Key: {cache_key}")
        except aioredis.RedisError as e:
            logger.error(f"Redis error getting cache for performance teasers (User {current_user.id}): {e}. Serving fresh data.", exc_info=True)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for cached performance teasers (User {current_user.id}): {e}. Serving fresh data.", exc_info=True)
        # Fall through to fetch fresh data on Redis error or JSON decode error

    # Cache miss or Redis error, fetch fresh data
    try:
        fresh_data = await service.get_all_user_strategies_with_performance_teasers(user_id=current_user.id)

        if redis_client and fresh_data is not None: # fresh_data can be []
            try:
                # Serialize list of Pydantic models to JSON string for caching
                # Each item in fresh_data is already a StrategyPerformanceTeaser instance
                list_of_dicts_to_cache = [item.model_dump(mode='json') for item in fresh_data]
                serialized_data_to_cache = json.dumps(list_of_dicts_to_cache)

                await redis_client.set(
                    cache_key,
                    serialized_data_to_cache,
                    ex=CACHE_PERFORMANCE_TEASERS_EXPIRATION_SECONDS
                )
                logger.info(f"Successfully cached performance teasers for User {current_user.id}, Key: {cache_key}")
            except aioredis.RedisError as e:
                logger.error(f"Redis error setting cache for performance teasers (User {current_user.id}): {e}", exc_info=True)
            except json.JSONEncodeError as e: # Should not happen with .model_dump()
                logger.error(f"JSON encode error caching performance teasers (User {current_user.id}): {e}", exc_info=True)

        return fresh_data

    except StrategyConfigServiceError as e:
        logger.error(f"Service error fetching strategy performance teasers for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e: # Catch-all for other unexpected errors
        logger.error(f"Unexpected error fetching strategy performance teasers for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching performance teasers.")

# --- Strategy Configuration Form Metadata Endpoint ---
SUPPORTED_STRATEGY_TYPES_FOR_FORMS = [
    "DarvasBox", "WilliamsAlligator", "HeikinAshi", "Renko", "SMACrossover", "ElliottWave"
]

@app.get(
    f"{STRATEGY_CONFIG_API_PREFIX}/form-metadata",
    response_model=StrategyFormMetadataResponse,
    summary="Get metadata for building strategy configuration forms",
    tags=["Strategy Configurations", "Metadata"]
)
async def get_strategy_form_metadata():
    """
    Provides lists of available strategy types and timeframes to help populate
    selection fields in strategy configuration forms on the frontend.
    """
    # StrategyTimeframe is a Literal, get its literal values
    timeframe_values = list(StrategyTimeframe.__args__)

    return StrategyFormMetadataResponse(
        available_strategy_types=SUPPORTED_STRATEGY_TYPES_FOR_FORMS,
        available_timeframes=timeframe_values
    )

# --- Strategy Visualization Endpoints ---
VISUALIZATION_API_PREFIX = "/api/v1/visualizations"

@app.get(
    f"{VISUALIZATION_API_PREFIX}/strategy",
    response_model=StrategyVisualizationDataResponse,
    summary="Get data for strategy visualization charts (with Caching)", # Updated summary
    tags=["Visualizations", "Strategies"]
)
async def get_strategy_chart_data(
    request_http: Request, # Changed name to avoid clash with service_request
    query_params: StrategyVisualizationQueryParams = Depends(),
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    viz_service: StrategyVisualizationService = Depends(get_strategy_visualization_service)
):
    """
    Provides aggregated data for strategy visualization charts. Results are cached.
    Query parameters: strategy_config_id, start_date, end_date.
    User ID is from authentication token.
    """
    redis_client = getattr(request_http.app.state, 'redis_cache_client', None)
    # Cache key needs to be unique for the combination of user and request parameters
    cache_key = (
        f"{CACHE_KEY_STRATEGY_VIZ_PREFIX}"
        f"user_{current_user.id}_"
        f"cfg_{query_params.strategy_config_id}_"
        f"sd_{query_params.start_date.isoformat()}_"
        f"ed_{query_params.end_date.isoformat()}"
    )

    if redis_client:
        try:
            cached_data_json = await redis_client.get(cache_key)
            if cached_data_json:
                logger.info(f"Cache hit for strategy visualization: Key {cache_key}")
                # Deserialize JSON string to Pydantic model
                return StrategyVisualizationDataResponse(**json.loads(cached_data_json))
            else:
                logger.info(f"Cache miss for strategy visualization: Key {cache_key}")
        except aioredis.RedisError as e:
            logger.error(f"Redis error getting cache for strategy viz (Key {cache_key}): {e}. Serving fresh data.", exc_info=True)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for cached strategy viz (Key {cache_key}): {e}. Serving fresh data.", exc_info=True)

    # Cache miss or Redis error, construct service request and fetch fresh data
    service_request = StrategyVisualizationRequest(
        strategy_config_id=query_params.strategy_config_id,
        user_id=current_user.id,
        start_date=query_params.start_date,
        end_date=query_params.end_date
    )

    try:
        fresh_data: StrategyVisualizationDataResponse = await viz_service.get_strategy_visualization_data(request=service_request)

        if redis_client and fresh_data: # fresh_data is a Pydantic model instance
            try:
                serialized_data_to_cache = fresh_data.model_dump_json() # Pydantic v2
                await redis_client.set(
                    cache_key,
                    serialized_data_to_cache,
                    ex=CACHE_STRATEGY_VIZ_EXPIRATION_SECONDS
                )
                logger.info(f"Successfully cached strategy visualization data: Key {cache_key}")
            except aioredis.RedisError as e:
                logger.error(f"Redis error setting cache for strategy viz (Key {cache_key}): {e}", exc_info=True)
            except Exception as e: # Catch potential Pydantic model_dump_json errors
                logger.error(f"Serialization error caching strategy viz (Key {cache_key}): {e}", exc_info=True)

        return fresh_data

    except StrategyConfigNotFoundError as e:
        logger.warning(f"Strategy config not found for viz request: {service_request.strategy_config_id}, User: {current_user.id}. Error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except StrategyVisualizationServiceError as e:
        logger.error(f"Visualization service error for strat_cfg_id {service_request.strategy_config_id}, User: {current_user.id}: {e}", exc_info=True)
        if "not found" in str(e).lower() or "Could not fetch price data" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching viz data for strat_cfg_id {service_request.strategy_config_id}, User: {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching visualization data.")

# --- Paper Trading Endpoints ---
# Already refactored in previous step, this is just for context if needed.
PAPER_TRADING_API_PREFIX = "/api/v1/paper-trading"

@app.get(
    f"{PAPER_TRADING_API_PREFIX}/orders/open",
    response_model=List[TradeRecord],
    summary="Get all open paper trading orders for the authenticated user",
    tags=["Paper Trading", "Orders"]
)
async def list_open_paper_orders_for_current_user(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    executor: SimulatedTradeExecutor = Depends(get_simulated_trade_executor)
):
    """
    Retrieves a list of all paper trading orders for the authenticated user
    that are in an open state (e.g., NEW, PARTIALLY_FILLED).
    """
    if not executor:
        logger.error("SimulatedTradeExecutor service not available for list_open_paper_orders_for_current_user.")
        raise HTTPException(status_code=503, detail="SimulatedTradeExecutor service not available.")
    try:
        open_orders = await executor.get_open_paper_orders(user_id=current_user.id)
        return open_orders
    except Exception as e:
        logger.error(f"API error fetching open paper orders for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch open paper orders: {str(e)}")

@app.post(
    f"{PAPER_TRADING_API_PREFIX}/orders",
    response_model=SubmitPaperOrderResponse,
    status_code=202,
    summary="Submit a new paper trading order for the authenticated user",
    tags=["Paper Trading", "Orders"]
)
async def submit_new_paper_order_for_current_user(
    order_request: CreatePaperTradeOrderRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    executor: SimulatedTradeExecutor = Depends(get_simulated_trade_executor)
):
    """
    Submits a new paper trading order to the simulator for the authenticated user.
    The simulator will attempt to fill it based on market conditions.
    """
    if not executor:
        raise HTTPException(status_code=503, detail="SimulatedTradeExecutor service not available.")

    paper_order_to_submit = PaperTradeOrder(
        user_id=current_user.id,
        symbol=order_request.symbol,
        side=order_request.side,
        order_type=order_request.order_type,
        quantity=order_request.quantity,
        limit_price=order_request.limit_price,
        stop_price=order_request.stop_price,
        time_in_force=order_request.time_in_force,
        notes=order_request.notes
    )

    try:
        updated_order, fills = await executor.submit_paper_order(paper_order_to_submit)

        if updated_order.status == PaperOrderStatus.FILLED and fills:
            for fill in fills:
                await executor.apply_fill_to_position(fill)

            if hasattr(executor, '_log_paper_trade_to_history') and callable(getattr(executor, '_log_paper_trade_to_history')):
                 await executor._log_paper_trade_to_history(updated_order, fills[0] if fills else None)
                 logger.info(f"Order {updated_order.order_id} for user {current_user.id} and its fill(s) logged to trading_history via API.")
            else:
                 logger.warning(f"Method _log_paper_trade_to_history not found or callable on executor for order {updated_order.order_id} (user {current_user.id}).")

        message = f"Paper order {updated_order.order_id} for user {current_user.id} submitted. Status: {updated_order.status.value}."
        if fills:
            message += f" {len(fills)} fill(s) generated."

        return SubmitPaperOrderResponse(
            updated_order=updated_order,
            fills=fills,
            message=message
        )
    except Exception as e:
        logger.error(f"API error submitting paper order for user {current_user.id}, symbol {order_request.symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit paper order: {str(e)}")

@app.post(
    f"{PAPER_TRADING_API_PREFIX}/orders/{{order_id}}/cancel",
    response_model=PaperTradeOrder,
    summary="Cancel a pending paper trading order for the authenticated user",
    tags=["Paper Trading", "Orders"]
)
async def cancel_paper_order_for_current_user(
    order_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    executor: SimulatedTradeExecutor = Depends(get_simulated_trade_executor)
):
    """
    Attempts to cancel a specific pending paper trading order for the authenticated user.
    """
    if not executor:
        raise HTTPException(status_code=503, detail="SimulatedTradeExecutor service not available.")
    try:
        canceled_order = await executor.cancel_paper_order(user_id=current_user.id, order_id=order_id)
        return canceled_order
    except ValueError as e:
        logger.warning(f"Failed to cancel paper order {order_id} for user {current_user.id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API error canceling paper order {order_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel paper order: {str(e)}")

# --- Watchlist API Endpoints ---
WATCHLIST_API_PREFIX = "/api/v1/watchlists"
QUOTE_API_PREFIX = "/api/v1/quotes" # Should remain if batch quotes are general, or move under watchlists if specific

@app.post(
    f"{WATCHLIST_API_PREFIX}/",
    response_model=Watchlist,
    status_code=201,
    summary="Create a new watchlist for the authenticated user",
    tags=["Watchlists"]
)
async def create_new_watchlist_for_current_user( # Renamed
    watchlist_data: WatchlistCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        return await service.create_watchlist(user_id=current_user.id, data=watchlist_data)
    except WatchlistServiceError as e:
        logger.error(f"API Error creating watchlist for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected API error creating watchlist for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create watchlist.")

@app.get(
    f"{WATCHLIST_API_PREFIX}/",
    response_model=List[Watchlist],
    summary="Get all watchlists for the authenticated user",
    tags=["Watchlists"]
)
async def get_current_user_watchlists( # Renamed
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        return await service.get_watchlists_by_user(user_id=current_user.id)
    except Exception as e:
        logger.error(f"API Error fetching watchlists for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch watchlists.")

@app.get(
    f"{WATCHLIST_API_PREFIX}/{{watchlist_id}}",
    response_model=WatchlistWithItems,
    summary="Get a specific watchlist and its items for the authenticated user",
    tags=["Watchlists"]
)
async def get_watchlist_details_for_current_user( # Renamed
    watchlist_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        watchlist_details = await service.get_watchlist(watchlist_id=watchlist_id, user_id=current_user.id, include_items=True)
        if not watchlist_details:
            raise HTTPException(status_code=404, detail="Watchlist not found or not owned by user.")
        return watchlist_details
    except WatchlistNotFoundError:
        raise HTTPException(status_code=404, detail="Watchlist not found.")
    except Exception as e:
        logger.error(f"API Error fetching watchlist {watchlist_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch watchlist details.")

@app.put(
    f"{WATCHLIST_API_PREFIX}/{{watchlist_id}}",
    response_model=Watchlist,
    summary="Update a watchlist's name or description for the authenticated user",
    tags=["Watchlists"]
)
async def update_watchlist_for_current_user( # Renamed
    watchlist_id: UUID,
    update_data: WatchlistCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        return await service.update_watchlist(watchlist_id=watchlist_id, user_id=current_user.id, data=update_data)
    except WatchlistNotFoundError:
        raise HTTPException(status_code=404, detail="Watchlist not found or not owned by user.")
    except WatchlistServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"API Error updating watchlist {watchlist_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update watchlist.")

@app.delete(
    f"{WATCHLIST_API_PREFIX}/{{watchlist_id}}",
    status_code=204,
    summary="Delete a watchlist for the authenticated user",
    tags=["Watchlists"]
)
async def delete_watchlist_for_current_user( # Renamed
    watchlist_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        await service.delete_watchlist(watchlist_id=watchlist_id, user_id=current_user.id)
    except WatchlistNotFoundError:
        raise HTTPException(status_code=404, detail="Watchlist not found or not owned by user.")
    except Exception as e:
        logger.error(f"API Error deleting watchlist {watchlist_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete watchlist.")

@app.post(
    f"{WATCHLIST_API_PREFIX}/{{watchlist_id}}/items",
    response_model=List[WatchlistItem],
    status_code=201,
    summary="Add one or more items (symbols) to a watchlist for the authenticated user",
    tags=["Watchlists"]
)
async def add_items_to_watchlist_for_current_user( # Renamed
    watchlist_id: UUID,
    items_request: AddWatchlistItemsRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        created_items = await service.add_multiple_items_to_watchlist(
            watchlist_id=watchlist_id, user_id=current_user.id, items_request=items_request
        )
        return created_items
    except WatchlistNotFoundError:
        raise HTTPException(status_code=404, detail="Watchlist not found or not owned by user.")
    except WatchlistServiceError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"API Error adding items to watchlist {watchlist_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to add items to watchlist.")

@app.delete(
    f"{WATCHLIST_API_PREFIX}/items/{{item_id}}",
    status_code=204,
    summary="Remove an item from a watchlist for the authenticated user",
    tags=["Watchlists"]
)
async def remove_item_from_watchlist_for_current_user( # Renamed
    item_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user), # Auth added
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        await service.remove_item_from_watchlist(item_id=item_id, user_id=current_user.id)
    except WatchlistItemNotFoundError:
        raise HTTPException(status_code=404, detail="Watchlist item not found.")
    except WatchlistOperationForbiddenError:
        raise HTTPException(status_code=403, detail="User not authorized to remove this watchlist item.")
    except Exception as e:
        logger.error(f"API Error removing item {item_id} for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove item from watchlist.")

# --- Batch Quotes Endpoint ---
@app.post(
    f"{QUOTE_API_PREFIX}/batch",
    response_model=BatchQuotesResponse,
    summary="Get current quotes for a batch of symbols",
    tags=["Quotes", "Watchlists"]
)
async def get_batch_quotes(
    request_data: BatchQuotesRequest,
    service: WatchlistService = Depends(get_watchlist_service)
):
    try:
        return await service.get_batch_quotes_for_symbols(
            symbols=request_data.symbols, provider=request_data.provider
        )
    except Exception as e:
        logger.error(f"API Error fetching batch quotes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch batch quotes.")

# --- User Preferences API Endpoints ---
USER_PREFERENCES_API_PREFIX = "/api/v1/users/me/preferences"

@app.get(
    USER_PREFERENCES_API_PREFIX,
    response_model=UserPreferences,
    summary="Get preferences for the authenticated user",
    tags=["User Preferences"]
)
async def get_my_user_preferences(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: UserPreferenceService = Depends(get_user_preference_service)
):
    try:
        return await service.get_user_preferences(user_id=current_user.id)
    except UserPreferenceServiceError as e:
        logger.error(f"API Error getting preferences for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected API error getting preferences for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get user preferences.")

@app.put(
    USER_PREFERENCES_API_PREFIX,
    response_model=UserPreferences,
    summary="Update preferences for the authenticated user",
    tags=["User Preferences"]
)
async def update_my_user_preferences(
    new_preferences: Dict[str, Any] = Body(...), # Request body is the new preferences dictionary
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    service: UserPreferenceService = Depends(get_user_preference_service)
):
    """
    Updates the 'preferences' field for the authenticated user.
    The request body should be a JSON object representing the new preferences dictionary.
    Example: `{"theme": "dark", "notifications_enabled": false}`
    """
    try:
        # Ensure new_preferences is treated as the payload for the 'preferences' field in the DB
        return await service.update_user_preferences(user_id=current_user.id, preferences_payload=new_preferences)
    except UserPreferenceServiceError as e:
        logger.error(f"API Error updating preferences for user {current_user.id}: {e}", exc_info=True)
        # For updates, a 400 might be more appropriate for validation or service logic errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected API error updating preferences for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update user preferences.")

if __name__ == "__main__":
    # Run the enhanced AI services
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,  # Different port from your existing services
        reload=True,
        log_level="info"
    )