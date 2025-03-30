"""
API endpoints for ElizaOS integration with TradingFarm
"""
import os
import json
import logging
import uuid
import asyncio
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ..agents.eliza_bridge import ElizaAgentBridge
from ..database.db_manager import DatabaseManager
from ..agents.eliza_wallet import ElizaWalletManager

logger = logging.getLogger(__name__)

# Models for request/response
class CreateAgentRequest(BaseModel):
    name: str
    symbols: List[str]
    timeframes: List[str]
    character_template: Optional[str] = "crypto_trader.json"
    model_provider: Optional[str] = "anthropic"
    model_name: Optional[str] = "claude-3-opus"
    risk_per_trade: Optional[float] = 0.02
    max_leverage: Optional[float] = 3.0
    strategy_type: Optional[str] = "AIStrategy"
    wallet_id: Optional[str] = None
    is_controller: Optional[bool] = False

class AgentResponse(BaseModel):
    id: str
    name: str
    status: str
    message: str

class ElizaStatusResponse(BaseModel):
    status: str
    agent_count: int
    running_agents: int
    agents: List[Dict[str, Any]]

class WalletRequest(BaseModel):
    name: str
    password: Optional[str] = None

class WalletAssignmentRequest(BaseModel):
    agent_id: str
    wallet_id: str

# Create router
router = APIRouter(prefix="/eliza", tags=["eliza"])

# Reference to the ElizaAgentBridge instance
_eliza_bridge = None
_wallet_manager = None

def initialize_eliza_api(agent_manager, db_path: str = "data/trading_farm.db"):
    """Initialize the ElizaOS API endpoints."""
    global _eliza_bridge, _wallet_manager
    _eliza_bridge = ElizaAgentBridge(agent_manager=agent_manager, db_path=db_path)
    
    # Initialize wallet manager
    wallets_path = os.path.join(os.path.dirname(db_path), "eliza_wallets")
    _wallet_manager = ElizaWalletManager(wallets_path=wallets_path)
    
    return router

# Helper to ensure bridge is initialized
def get_bridge():
    """Get the ElizaAgentBridge instance."""
    if _eliza_bridge is None:
        raise HTTPException(status_code=500, detail="ElizaOS bridge not initialized")
    return _eliza_bridge

# Helper to ensure wallet manager is initialized
def get_wallet_manager():
    """Get the ElizaWalletManager instance."""
    if _wallet_manager is None:
        raise HTTPException(status_code=500, detail="ElizaOS wallet manager not initialized")
    return _wallet_manager

@router.get("/status", response_model=ElizaStatusResponse)
async def get_eliza_status():
    """Get the status of the ElizaOS integration."""
    bridge = get_bridge()
    
    try:
        agents = await bridge.list_agents()
        
        # Count running agents
        running_count = 0
        agent_list = []
        
        for agent_id, agent_data in agents.items():
            is_running = agent_data.get("active", False)
            if is_running:
                running_count += 1
                
            agent_list.append({
                "id": agent_id,
                "name": agent_data.get("config", {}).get("name", f"Agent_{agent_id[:8]}"),
                "status": "running" if is_running else "stopped",
                "is_controller": agent_data.get("config", {}).get("is_controller", False)
            })
        
        return {
            "status": "operational",
            "agent_count": len(agents),
            "running_agents": running_count,
            "agents": agent_list
        }
    except Exception as e:
        logger.error(f"Error getting ElizaOS status: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "agent_count": 0,
            "running_agents": 0,
            "agents": []
        }

@router.post("/agents", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest, background_tasks: BackgroundTasks):
    """Create a new ElizaOS trading agent."""
    bridge = get_bridge()
    wallet_manager = get_wallet_manager()
    
    try:
        # Verify character template exists
        template_path = os.path.join("eliza_integrations", request.character_template)
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=400, 
                detail=f"Character template {request.character_template} not found"
            )
            
        # Generate ID for new agent
        agent_id = str(uuid.uuid4())
        
        # Handle wallet creation or assignment
        if request.wallet_id:
            # Verify wallet exists
            wallet_exists = False
            for wallet in wallet_manager.list_wallets():
                if wallet["id"] == request.wallet_id:
                    wallet_exists = True
                    break
                    
            if not wallet_exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Wallet {request.wallet_id} not found"
                )
                
            # Assign existing wallet to agent
            wallet_manager.assign_wallet_to_agent(agent_id, request.wallet_id)
        else:
            # Create new wallet for agent
            wallet_name = f"Wallet for {request.name}"
            wallet_id = wallet_manager.create_wallet(wallet_name)
            wallet_manager.assign_wallet_to_agent(agent_id, wallet_id)
            
        # Create agent in background
        background_tasks.add_task(
            bridge.create_agent,
            agent_id=agent_id,
            name=request.name,
            symbols=request.symbols,
            timeframes=request.timeframes,
            character_template=request.character_template,
            model_provider=request.model_provider,
            model_name=request.model_name,
            risk_per_trade=request.risk_per_trade,
            max_leverage=request.max_leverage,
            is_controller=request.is_controller
        )
        
        return {
            "id": agent_id,
            "name": request.name,
            "status": "creating",
            "message": "Agent creation started"
        }
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/{agent_id}/start", response_model=AgentResponse)
async def start_agent(agent_id: str, background_tasks: BackgroundTasks):
    """Start an ElizaOS trading agent."""
    bridge = get_bridge()
    
    # Check if agent exists
    if agent_id not in bridge.agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # Start the agent in the background
    background_tasks.add_task(bridge.start_eliza_agent, agent_id)
    
    return {
        "id": agent_id,
        "name": bridge.agents[agent_id]["name"],
        "status": "starting",
        "message": f"Agent {bridge.agents[agent_id]['name']} is starting"
    }

@router.post("/agents/{agent_id}/stop", response_model=AgentResponse)
async def stop_agent(agent_id: str, background_tasks: BackgroundTasks):
    """Stop an ElizaOS trading agent."""
    bridge = get_bridge()
    
    # Check if agent exists
    if agent_id not in bridge.agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # Stop the agent in the background
    background_tasks.add_task(bridge.stop_eliza_agent, agent_id)
    
    return {
        "id": agent_id,
        "name": bridge.agents[agent_id]["name"],
        "status": "stopping",
        "message": f"Agent {bridge.agents[agent_id]['name']} is stopping"
    }

@router.post("/agents/start-all", response_model=Dict[str, str])
async def start_all_agents(background_tasks: BackgroundTasks):
    """Start all ElizaOS trading agents."""
    bridge = get_bridge()
    
    # Start all agents in the background
    background_tasks.add_task(bridge.start_all_agents)
    
    return {"status": "starting", "message": "Starting all ElizaOS agents"}

@router.post("/agents/stop-all", response_model=Dict[str, str])
async def stop_all_agents(background_tasks: BackgroundTasks):
    """Stop all ElizaOS trading agents."""
    bridge = get_bridge()
    
    # Stop all agents in the background
    background_tasks.add_task(bridge.stop_all_agents)
    
    return {"status": "stopping", "message": "Stopping all ElizaOS agents"}

@router.get("/agents/list", response_model=List[Dict[str, Any]])
async def list_agents():
    """List all ElizaOS trading agents."""
    bridge = get_bridge()
    
    agents_list = []
    for agent_id, agent in bridge.agents.items():
        agent_info = {
            "id": agent_id,
            "name": agent["name"],
            "status": "running" if agent["running"] else "stopped",
            "character_file": os.path.basename(agent["character_path"]),
            "symbols": []
        }
        
        # Add trading info if available
        if agent_id in bridge.agent_manager.agents:
            agent_info["symbols"] = bridge.agent_manager.agents[agent_id]["symbols"]
        
        agents_list.append(agent_info)
    
    return agents_list

@router.get("/characters/list", response_model=List[str])
async def list_characters():
    """List available character templates."""
    bridge = get_bridge()
    
    return list(bridge.character_configs.keys())

@router.get("/metrics/{agent_id}", response_model=Dict[str, Any])
async def get_agent_metrics(agent_id: str):
    """Get performance metrics for an ElizaOS trading agent."""
    bridge = get_bridge()
    
    # Check if agent exists
    if agent_id not in bridge.agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # Get metrics from the agent manager
    if agent_id in bridge.agent_manager.agents:
        agent = bridge.agent_manager.agents[agent_id]
        
        return {
            "id": agent_id,
            "name": bridge.agents[agent_id]["name"],
            "statistics": agent["statistics"],
            "signals_count": len(agent["signals"]),
            "positions_count": len(agent["positions"]),
            "orders_count": len(agent["orders"])
        }
    
    return {
        "id": agent_id,
        "name": bridge.agents[agent_id]["name"],
        "statistics": {},
        "message": "Agent metrics not available"
    }

# Add wallet management endpoints
@router.get("/wallets")
async def list_wallets():
    """List all wallets."""
    wallet_manager = get_wallet_manager()
    
    try:
        wallets = wallet_manager.list_wallets()
        return wallets
    except Exception as e:
        logger.error(f"Error listing wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/wallets")
async def create_wallet(request: WalletRequest):
    """Create a new wallet."""
    wallet_manager = get_wallet_manager()
    
    try:
        wallet_id = wallet_manager.create_wallet(request.name, request.password)
        return {"wallet_id": wallet_id, "name": request.name}
    except Exception as e:
        logger.error(f"Error creating wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallets/{wallet_id}")
async def get_wallet(wallet_id: str):
    """Get wallet details."""
    wallet_manager = get_wallet_manager()
    
    try:
        for wallet in wallet_manager.list_wallets():
            if wallet["id"] == wallet_id:
                return wallet
                
        raise HTTPException(status_code=404, detail=f"Wallet {wallet_id} not found")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/wallets/assign")
async def assign_wallet(request: WalletAssignmentRequest):
    """Assign a wallet to an agent."""
    bridge = get_bridge()
    wallet_manager = get_wallet_manager()
    
    try:
        # Verify agent exists
        agents = await bridge.list_agents()
        if request.agent_id not in agents:
            raise HTTPException(status_code=404, detail=f"Agent {request.agent_id} not found")
            
        # Verify wallet exists
        wallet_exists = False
        for wallet in wallet_manager.list_wallets():
            if wallet["id"] == request.wallet_id:
                wallet_exists = True
                break
                
        if not wallet_exists:
            raise HTTPException(status_code=404, detail=f"Wallet {request.wallet_id} not found")
            
        # Assign wallet
        wallet_manager.assign_wallet_to_agent(request.agent_id, request.wallet_id)
        
        return {
            "status": "success",
            "message": f"Wallet {request.wallet_id} assigned to agent {request.agent_id}"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error assigning wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallets/agent/{agent_id}")
async def get_agent_wallet(agent_id: str):
    """Get wallet assigned to an agent."""
    bridge = get_bridge()
    wallet_manager = get_wallet_manager()
    
    try:
        # Verify agent exists
        agents = await bridge.list_agents()
        if agent_id not in agents:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
            
        # Get wallet
        wallet = wallet_manager.get_agent_wallet(agent_id)
        if not wallet:
            return {"message": f"No wallet assigned to agent {agent_id}"}
            
        return {
            "id": wallet["id"],
            "name": wallet["name"],
            "address": wallet["address"],
            "balance": wallet["balance"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting agent wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add controller agent endpoints
@router.get("/controller")
async def get_controller_agent():
    """Get the controller agent (Bossman) if it exists."""
    bridge = get_bridge()
    wallet_manager = get_wallet_manager()
    
    try:
        agents = await bridge.list_agents()
        
        # Look for a controller agent
        for agent_id, agent in agents.items():
            if agent.get("config", {}).get("is_controller", False):
                # Add wallet info if available
                result = {
                    "agent_id": agent_id,
                    "details": agent
                }
                
                wallet = wallet_manager.get_agent_wallet(agent_id)
                if wallet:
                    result["wallet"] = {
                        "id": wallet["id"],
                        "name": wallet["name"],
                        "address": wallet["address"],
                        "balance": wallet["balance"]
                    }
                
                return result
        
        return {"message": "No controller agent found"}
    except Exception as e:
        logger.error(f"Error getting controller agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-bossman")
async def create_bossman_controller(background_tasks: BackgroundTasks):
    """Create the Bossman controller agent."""
    bridge = get_bridge()
    wallet_manager = get_wallet_manager()
    
    try:
        # Check if a controller agent already exists
        agents = await bridge.list_agents()
        
        for agent_id, agent in agents.items():
            if agent.get("config", {}).get("is_controller", False):
                return {
                    "message": "Controller agent already exists",
                    "agent_id": agent_id
                }
        
        # Create a new controller agent
        agent_id = str(uuid.uuid4())
        
        # Create wallet for the controller
        wallet_name = "Bossman Controller Wallet"
        wallet_id = wallet_manager.create_wallet(wallet_name)
        wallet_manager.assign_wallet_to_agent(agent_id, wallet_id)
        
        # Create the agent
        background_tasks.add_task(
            bridge.create_agent,
            agent_id=agent_id,
            name="Bossman",
            symbols=["BTC-USD", "ETH-USD", "SOL-USD"], # Key market indicators
            timeframes=["1h", "4h", "1d"], # Strategic timeframes
            character_template="bossman_controller.json",
            model_provider="anthropic",
            model_name="claude-3-opus",
            risk_per_trade=0.02,
            max_leverage=1.0,
            is_controller=True
        )
        
        return {
            "agent_id": agent_id,
            "status": "creating",
            "message": "Bossman controller agent is being created",
            "wallet_id": wallet_id
        }
    except Exception as e:
        logger.error(f"Error creating controller agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/controller/{agent_id}/command")
async def send_command_to_controller(agent_id: str, command: Dict[str, Any]):
    """Send a command to the controller agent."""
    bridge = get_bridge()
    
    try:
        # Verify agent exists and is a controller
        agents = await bridge.list_agents()
        if agent_id not in agents:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
            
        agent = agents[agent_id]
        if not agent.get("config", {}).get("is_controller", False):
            raise HTTPException(status_code=400, detail=f"Agent {agent_id} is not a controller agent")
            
        # Send command to the controller
        result = await bridge.send_command_to_agent(agent_id, command)
        
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error sending command to controller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add dashboard endpoint
@router.get("/dashboard", include_in_schema=False)
async def get_dashboard():
    """Serve the ElizaOS Trading Farm dashboard."""
    try:
        # Get the path to the templates directory
        template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
        dashboard_path = os.path.join(template_dir, "eliza_dashboard.html")
        
        # Ensure the templates directory exists
        os.makedirs(template_dir, exist_ok=True)
        
        # Check if the dashboard file exists
        if not os.path.exists(dashboard_path):
            return {
                "status": "error",
                "message": "Dashboard template not found"
            }
        
        # Read the dashboard HTML
        with open(dashboard_path, "r") as file:
            html_content = file.read()
        
        # Return the HTML content
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        logger.error(f"Error serving dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
