"""
ElizaOS MCP Server for Trading Farm with multi-chain trading support.
"""
import os
import sys
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import requests
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import local modules
from elizaos_mcp_server.config import (
    get_mcp_port, get_chain_config, 
    NEON_CONFIG, ELIZAOS_CONFIG, RISK_CONFIG
)
from elizaos_mcp_server.neon_store import NeonStrategyStore
from elizaos_mcp_server.chains.hyperliquid import HyperliquidAdapter
from elizaos_mcp_server.chains.arbitrum import ArbitrumAdapter
from elizaos_mcp_server.chains.sonic import SonicAdapter
from elizaos_mcp_server.chains.solana import SolanaAdapter
from elizaos_mcp_server.chains.sui import SuiAdapter
from elizaos_mcp_server.agents.manager import get_agent_manager
from elizaos_mcp_server.agents.coordinator import get_coordinator

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("elizaos_mcp_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("elizaos_mcp_server")

# Define the FastAPI app
app = FastAPI(title="ElizaOS MCP Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize chain adapters
chain_adapters = {
    "hyperliquid": HyperliquidAdapter(),
    "arbitrum": ArbitrumAdapter(),
    "sonic": SonicAdapter(),
    "solana": SolanaAdapter(),
    "sui": SuiAdapter()
}

# Initialize Neon strategy store
strategy_store = NeonStrategyStore()

# Initialize ElizaOS agent manager
agent_manager = get_agent_manager()
coordinator = get_coordinator()

# Start the coordinator
coordinator.start()
logger.info("Started ElizaOS multi-agent coordinator")

# Models for API requests
class MCPToolExecuteRequest(BaseModel):
    name: str
    parameters: Dict[str, Any]

class ElizaCommandRequest(BaseModel):
    command: str
    parameters: Dict[str, Any] = {}

class AgentMessageRequest(BaseModel):
    sender_id: str
    message_type: str
    content: Dict[str, Any]
    recipient_id: Optional[str] = None
    priority: int = 1

# Handle communication with ElizaOS
async def send_eliza_command(command: str, parameters: Dict[str, Any] = None, agent_id: str = None) -> Dict[str, Any]:
    """Send a command to ElizaOS"""
    if agent_id is None:
        agent_id = f"{ELIZAOS_CONFIG['agent_id_prefix']}1"
        
    url = f"{ELIZAOS_CONFIG['api_endpoint']}/agents/{agent_id}/command"
    
    payload = {
        "command": command,
        "parameters": parameters or {}
    }
    
    logger.info(f"Sending ElizaOS command: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code != 200:
            logger.error(f"ElizaOS API error: {response.status_code} - {response.text}")
            return {"error": f"ElizaOS API error: {response.status_code}", "details": response.text}
        
        return response.json()
    except Exception as e:
        logger.error(f"Error sending ElizaOS command: {e}")
        return {"error": f"Error sending ElizaOS command: {str(e)}"}

# Routes

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ElizaOS MCP Server for Trading Farm",
        "version": "1.0.0",
        "chains": list(chain_adapters.keys()),
        "elizaos_config": {
            "multi_agent_enabled": ELIZAOS_CONFIG["multi_agent_coordination"],
            "max_agents_per_chain": ELIZAOS_CONFIG["max_agents_per_chain"],
            "cross_chain_enabled": ELIZAOS_CONFIG["cross_chain_enabled"],
            "simulation_mode": ELIZAOS_CONFIG.get("simulation_mode", True)
        },
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/execute")
async def execute_tool(request: MCPToolExecuteRequest):
    """Execute an MCP tool"""
    logger.info(f"Executing tool: {request.name}")
    logger.info(f"Parameters: {json.dumps(request.parameters, indent=2)}")
    
    # Parse tool name to determine chain and operation
    tool_parts = request.name.split("_")
    
    if len(tool_parts) < 3:
        raise HTTPException(status_code=400, detail=f"Invalid tool name format: {request.name}")
    
    # Get chain name from tool parts
    chain_name = None
    operation = None
    
    # Handle mcp0_hyperliquid_operation pattern (e.g., mcp0_hyperliquid_get_market_data)
    if tool_parts[0] == "mcp0":
        if len(tool_parts) >= 3:
            chain_name = tool_parts[1].lower()
            # Join the rest as operation
            operation = "_".join(tool_parts[2:])
    
    if not chain_name or not operation:
        raise HTTPException(status_code=400, detail=f"Could not parse chain and operation from: {request.name}")
    
    # Validate chain
    if chain_name not in chain_adapters:
        raise HTTPException(status_code=404, detail=f"Unsupported chain: {chain_name}")
    
    # Get the appropriate adapter
    adapter = chain_adapters[chain_name]
    
    # Convert snake_case operation to camelCase method names if needed
    method_name = operation
    
    # Execute the operation
    try:
        if hasattr(adapter, method_name):
            method = getattr(adapter, method_name)
            
            # Convert the request parameters to a dictionary and unpack them
            params = dict(request.parameters)
            
            # For async methods
            if asyncio.iscoroutinefunction(method):
                try:
                    result = await method(**params)
                    return result
                except TypeError as e:
                    # Log the available parameters and the error
                    logger.error(f"TypeError when calling {method_name}: {e}")
                    logger.error(f"Provided parameters: {params}")
                    logger.error(f"Method signature: {method.__annotations__}")
                    raise HTTPException(status_code=422, detail=f"Parameter mismatch for {method_name}: {str(e)}")
            else:
                # For sync methods
                try:
                    result = method(**params)
                    return result
                except TypeError as e:
                    logger.error(f"TypeError when calling {method_name}: {e}")
                    logger.error(f"Provided parameters: {params}")
                    raise HTTPException(status_code=422, detail=f"Parameter mismatch for {method_name}: {str(e)}")
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Operation {method_name} not supported by {chain_name} adapter"
            )
    except Exception as e:
        logger.error(f"Error executing {method_name} on {chain_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/elizaos/command")
async def execute_eliza_command(request: ElizaCommandRequest):
    """Execute a command through ElizaOS"""
    logger.info(f"Executing ElizaOS command: {request.command}")
    
    try:
        # Use our new agent manager to process commands with multi-agent capabilities
        result = await agent_manager.process_command(
            command=request.command,
            parameters=request.parameters
        )
        return result
    except Exception as e:
        logger.error(f"Error processing ElizaOS command: {e}")
        return {
            "status": "error",
            "message": f"Error processing command: {str(e)}",
            "command_id": f"error_{int(datetime.now().timestamp())}",
            "simulation_mode": ELIZAOS_CONFIG.get("simulation_mode", True)
        }

@app.get("/elizaos/system/status")
async def get_system_status():
    """Get the status of the ElizaOS multi-agent system"""
    try:
        agent_status = coordinator.get_agent_status()
        
        return {
            "status": "success",
            "elizaos_version": "2.1.0",
            "multi_agent_system": {
                "active": coordinator.active,
                "total_agents": agent_status["total_agents"],
                "agents_by_chain": agent_status["agents_by_chain"],
                "agents_by_specialization": agent_status["agents_by_specialization"],
                "active_messages": agent_status["active_messages"]
            },
            "configuration": {
                "max_agents_per_chain": ELIZAOS_CONFIG["max_agents_per_chain"],
                "cross_chain_enabled": ELIZAOS_CONFIG["cross_chain_enabled"],
                "default_model": ELIZAOS_CONFIG["default_model"],
                "memory_enabled": ELIZAOS_CONFIG["memory_enabled"],
                "simulation_mode": ELIZAOS_CONFIG.get("simulation_mode", True)
            }
        }
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/elizaos/agents/message")
async def send_agent_message(request: AgentMessageRequest):
    """Send a message to the multi-agent system"""
    try:
        message_id = coordinator.send_message(dict(request))
        
        return {
            "status": "success",
            "message": "Message sent to agent system",
            "message_id": message_id
        }
    except Exception as e:
        logger.error(f"Error sending agent message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/elizaos/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """Get the status of a specific agent"""
    try:
        status = coordinator.get_agent_status(agent_id)
        
        if "error" in status:
            raise HTTPException(status_code=404, detail=status["error"])
            
        return {
            "status": "success",
            "agent_status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/elizaos/risk/config")
async def get_risk_config():
    """Get the current risk management configuration"""
    try:
        return {
            "status": "success",
            "risk_config": RISK_CONFIG
        }
    except Exception as e:
        logger.error(f"Error getting risk configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/elizaos/cross-chain/scan")
async def trigger_cross_chain_scan():
    """Manually trigger a scan for cross-chain opportunities"""
    try:
        # Force an immediate check
        coordinator.last_cross_chain_check = datetime.now().replace(year=2000)
        
        return {
            "status": "success",
            "message": "Cross-chain opportunity scan initiated",
            "next_automatic_scan": f"In {ELIZAOS_CONFIG['cross_chain_coordination_interval_seconds']} seconds"
        }
    except Exception as e:
        logger.error(f"Error triggering cross-chain scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/strategies")
async def list_strategies():
    """List all strategies from Neon database"""
    try:
        strategies = await strategy_store.list_strategies()
        return {"strategies": strategies}
    except Exception as e:
        logger.error(f"Error listing strategies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    """Get a specific strategy from Neon database"""
    try:
        strategy = await strategy_store.get_strategy(strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
        return strategy
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/strategies")
async def create_strategy(strategy: Dict[str, Any]):
    """Create a new strategy in Neon database"""
    try:
        result = await strategy_store.create_strategy(strategy)
        return result
    except Exception as e:
        logger.error(f"Error creating strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, strategy: Dict[str, Any]):
    """Update an existing strategy in Neon database"""
    try:
        result = await strategy_store.update_strategy(strategy_id, strategy)
        if not result:
            raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a strategy from Neon database"""
    try:
        result = await strategy_store.delete_strategy(strategy_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
        return {"message": f"Strategy {strategy_id} deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def start_server(port: int = None):
    """Start the FastAPI server"""
    if port is None:
        port = get_mcp_port("hyperliquid")  # Default to hyperliquid port
        
    logger.info(f"Starting ElizaOS MCP Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="ElizaOS MCP Server for Trading Farm")
    parser.add_argument("--port", type=int, default=None, help="Port to run the server on")
    parser.add_argument("--chain", type=str, default="hyperliquid", help="Chain to run the server for")
    
    args = parser.parse_args()
    
    if args.port is None and args.chain:
        args.port = get_mcp_port(args.chain)
        
    start_server(args.port)
