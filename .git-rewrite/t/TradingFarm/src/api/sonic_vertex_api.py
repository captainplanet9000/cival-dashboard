"""
Sonic and Vertex Protocol API Module for TradingFarm

This module provides API endpoints for managing and interacting with
Sonic and Vertex Protocol trading agents.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body
from pydantic import BaseModel, Field

from ..blockchain.sonic_integration import SonicClient
from ..blockchain.vertex_integration import VertexClient
from ..agents.sonic_agent import SonicAgent
from ..agents.vertex_agent import VertexAgent
from ..agents.eliza_bridge import ElizaAgentBridge

# Set up logging
logger = logging.getLogger(__name__)

# Define API router
router = APIRouter(
    prefix="/api/v1/protocols",
    tags=["protocols"],
    responses={404: {"description": "Not found"}},
)

# Agent manager instance
agent_manager = None
eliza_bridge = None

# Models for request and response
class AgentConfig(BaseModel):
    agent_id: Optional[str] = None
    name: str
    agent_type: str
    private_key: Optional[str] = None
    address: Optional[str] = None
    use_testnet: bool = True
    config: Dict[str, Any] = {}

class SwapRequest(BaseModel):
    agent_id: str
    input_token: str
    output_token: str
    amount: float
    slippage: Optional[float] = 0.005

class AddLiquidityRequest(BaseModel):
    agent_id: str
    token_a: str
    token_b: str
    amount_a: float
    amount_b: float
    slippage: Optional[float] = 0.005

class RemoveLiquidityRequest(BaseModel):
    agent_id: str
    position_id: str
    percentage: Optional[float] = 1.0
    slippage: Optional[float] = 0.005

class PlaceOrderRequest(BaseModel):
    agent_id: str
    symbol: str
    side: str  # "buy" or "sell"
    size: float
    price: Optional[float] = None  # None for market order
    reduce_only: Optional[bool] = False

class ClosePositionRequest(BaseModel):
    agent_id: str
    symbol: str

def initialize_api(bridge: ElizaAgentBridge):
    """
    Initialize the API with the ElizaOS bridge
    
    Args:
        bridge: ElizaOS bridge for agent communication
    """
    global eliza_bridge
    eliza_bridge = bridge
    logger.info("Initialized Sonic and Vertex Protocol API")

# Agent Management Endpoints
@router.post("/agents")
async def create_agent(agent_config: AgentConfig):
    """
    Create a new trading agent
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agent_id = agent_config.agent_id or f"{agent_config.agent_type}_{int(time.time())}"
        
        # Create agent based on type
        if agent_config.agent_type == "sonic":
            agent = SonicAgent(
                agent_id=agent_id,
                name=agent_config.name,
                private_key=agent_config.private_key,
                use_testnet=agent_config.use_testnet,
                eliza_bridge=eliza_bridge,
                config=agent_config.config
            )
        elif agent_config.agent_type == "vertex":
            agent = VertexAgent(
                agent_id=agent_id,
                name=agent_config.name,
                private_key=agent_config.private_key,
                address=agent_config.address,
                use_testnet=agent_config.use_testnet,
                eliza_bridge=eliza_bridge,
                config=agent_config.config
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid agent type")
        
        # Register agent with ElizaOS
        await eliza_bridge.register_agent(agent)
        
        # Start agent
        await agent.start()
        
        return {
            "success": True,
            "agent_id": agent_id,
            "message": f"Agent '{agent_config.name}' created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.get("/agents")
async def list_agents(agent_type: Optional[str] = None):
    """
    List all trading agents
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agents = await eliza_bridge.list_agents()
        
        # Filter by agent type if specified
        if agent_type:
            agents = [a for a in agents if getattr(a, "agent_type", "") == agent_type]
        
        # Convert agents to dictionaries
        agent_dicts = [a.to_dict() for a in agents if hasattr(a, "to_dict")]
        
        return {
            "success": True,
            "agents": agent_dicts
        }
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """
    Get agent details by ID
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Convert agent to dictionary
        agent_dict = agent.to_dict() if hasattr(agent, "to_dict") else {"agent_id": agent_id}
        
        return {
            "success": True,
            "agent": agent_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting agent: {str(e)}")

@router.post("/agents/{agent_id}/start")
async def start_agent(agent_id: str):
    """
    Start an agent
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        await agent.start()
        
        return {
            "success": True,
            "message": f"Agent '{agent_id}' started successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting agent: {str(e)}")

@router.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    """
    Stop an agent
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        await agent.stop()
        
        return {
            "success": True,
            "message": f"Agent '{agent_id}' stopped successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error stopping agent: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """
    Delete an agent
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Stop agent
        await agent.stop()
        
        # Unregister agent
        await eliza_bridge.unregister_agent(agent_id)
        
        return {
            "success": True,
            "message": f"Agent '{agent_id}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

# Sonic Protocol Endpoints
@router.post("/sonic/swap")
async def execute_swap(request: SwapRequest):
    """
    Execute a token swap on Sonic Protocol
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(request.agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {request.agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "sonic":
            raise HTTPException(status_code=400, detail="Not a Sonic Protocol agent")
        
        # Execute swap
        response = await agent.execute_swap(
            input_token=request.input_token,
            output_token=request.output_token,
            amount=request.amount
        )
        
        if not response:
            raise HTTPException(status_code=500, detail="Swap execution failed")
        
        return {
            "success": True,
            "swap": response
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing swap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing swap: {str(e)}")

@router.post("/sonic/add-liquidity")
async def add_liquidity(request: AddLiquidityRequest):
    """
    Add liquidity to a Sonic Protocol pool
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(request.agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {request.agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "sonic":
            raise HTTPException(status_code=400, detail="Not a Sonic Protocol agent")
        
        # Add liquidity
        response = await agent.add_liquidity(
            token_a=request.token_a,
            token_b=request.token_b,
            amount_a=request.amount_a,
            amount_b=request.amount_b
        )
        
        if not response:
            raise HTTPException(status_code=500, detail="Liquidity addition failed")
        
        return {
            "success": True,
            "transaction": response
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding liquidity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding liquidity: {str(e)}")

@router.post("/sonic/remove-liquidity")
async def remove_liquidity(request: RemoveLiquidityRequest):
    """
    Remove liquidity from a Sonic Protocol pool
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(request.agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {request.agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "sonic":
            raise HTTPException(status_code=400, detail="Not a Sonic Protocol agent")
        
        # Remove liquidity
        response = await agent.remove_liquidity(
            position_id=request.position_id,
            percentage=request.percentage
        )
        
        if not response:
            raise HTTPException(status_code=500, detail="Liquidity removal failed")
        
        return {
            "success": True,
            "transaction": response
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing liquidity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing liquidity: {str(e)}")

@router.get("/sonic/pools")
async def get_sonic_pools(agent_id: str):
    """
    Get Sonic Protocol pools
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "sonic":
            raise HTTPException(status_code=400, detail="Not a Sonic Protocol agent")
        
        # Get pools
        await agent.update_pools()
        
        return {
            "success": True,
            "pools": agent.pools
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting pools: {str(e)}")

@router.get("/sonic/balances")
async def get_sonic_balances(agent_id: str):
    """
    Get Sonic Protocol token balances
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "sonic":
            raise HTTPException(status_code=400, detail="Not a Sonic Protocol agent")
        
        # Get balances
        balances = await agent.get_balances()
        
        if not balances:
            raise HTTPException(status_code=500, detail="Failed to get balances")
        
        return {
            "success": True,
            "balances": balances.get("balances", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting balances: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting balances: {str(e)}")

# Vertex Protocol Endpoints
@router.post("/vertex/order")
async def place_order(request: PlaceOrderRequest):
    """
    Place an order on Vertex Protocol
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(request.agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {request.agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Place order based on side
        if request.side.lower() == "buy":
            response = await agent.open_long_position(
                symbol=request.symbol,
                size=request.size,
                price=request.price,
                reduce_only=request.reduce_only
            )
        elif request.side.lower() == "sell":
            response = await agent.open_short_position(
                symbol=request.symbol,
                size=request.size,
                price=request.price,
                reduce_only=request.reduce_only
            )
        else:
            raise HTTPException(status_code=400, detail=f"Invalid order side: {request.side}")
        
        if not response:
            raise HTTPException(status_code=500, detail="Order placement failed")
        
        return {
            "success": True,
            "order": response
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error placing order: {str(e)}")

@router.post("/vertex/close-position")
async def close_position(request: ClosePositionRequest):
    """
    Close a position on Vertex Protocol
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(request.agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {request.agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Close position
        response = await agent.close_position(request.symbol)
        
        if not response:
            raise HTTPException(status_code=500, detail="Position closing failed")
        
        return {
            "success": True,
            "order": response
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing position: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error closing position: {str(e)}")

@router.post("/vertex/cancel-orders")
async def cancel_orders(agent_id: str):
    """
    Cancel all orders for a Vertex Protocol agent
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Cancel orders
        responses = await agent.cancel_all_orders()
        
        return {
            "success": True,
            "cancellations": len(responses) if responses else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cancelling orders: {str(e)}")

@router.get("/vertex/positions")
async def get_vertex_positions(agent_id: str):
    """
    Get Vertex Protocol positions
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Update positions
        await agent.update_positions()
        
        return {
            "success": True,
            "positions": agent.positions
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting positions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting positions: {str(e)}")

@router.get("/vertex/orders")
async def get_vertex_orders(agent_id: str):
    """
    Get Vertex Protocol orders
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Update orders
        await agent.update_orders()
        
        return {
            "success": True,
            "orders": agent.active_orders
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting orders: {str(e)}")

@router.get("/vertex/market-data")
async def get_vertex_market_data(agent_id: str, symbol: Optional[str] = None):
    """
    Get Vertex Protocol market data
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        # Get agent
        agent = await eliza_bridge.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Check agent type
        if getattr(agent, "agent_type", "") != "vertex":
            raise HTTPException(status_code=400, detail="Not a Vertex Protocol agent")
        
        # Update market data
        await agent.update_market_data()
        
        # Return specific symbol data or all data
        if symbol:
            if symbol in agent.market_data:
                return {
                    "success": True,
                    "market_data": agent.market_data[symbol]
                }
            else:
                raise HTTPException(status_code=404, detail=f"Market data not found for symbol: {symbol}")
        else:
            return {
                "success": True,
                "market_data": agent.market_data
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting market data: {str(e)}")

# Market Data Endpoints
@router.get("/market-data")
async def get_market_data(protocol: str):
    """
    Get market data for a specific protocol
    """
    if not eliza_bridge:
        raise HTTPException(status_code=500, detail="API not initialized")
    
    try:
        if protocol.lower() == "sonic":
            # Create a temporary client for fetching market data
            client = SonicClient(use_testnet=True)
            data = await client.get_market_data()
            return {
                "success": True,
                "protocol": "sonic",
                "market_data": data
            }
        elif protocol.lower() == "vertex":
            # Create a temporary client for fetching market data
            client = VertexClient(use_testnet=True)
            markets = await client.get_markets()
            return {
                "success": True,
                "protocol": "vertex",
                "market_data": markets
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported protocol: {protocol}")
    except Exception as e:
        logger.error(f"Error getting market data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting market data: {str(e)}")
