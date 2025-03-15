"""
Bossman controller endpoints for Alchemy integration
Extends the Trading Farm API with multi-chain management capabilities
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel, Field

from .alchemy_api import (
    BossmanCreateRequest, 
    BossmanCommandRequest, 
    MonitorAgentsRequest,
    MarketMonitorRequest,
    RebalanceRequest,
    StrategyRequest,
    RiskUpdateRequest,
    get_bossman_controller
)

from ..agents.bossman_alchemy import BossmanController

logger = logging.getLogger(__name__)

# Initialize API router
bossman_router = APIRouter(
    prefix="/bossman",
    tags=["bossman"],
    responses={404: {"description": "Not found"}},
)

# Bossman controller endpoints
@bossman_router.post("/create", response_model=Dict[str, Any])
async def create_bossman(
    request: BossmanCreateRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Create a Bossman controller agent with enhanced blockchain capabilities"""
    try:
        agent_id = bossman_controller.create_bossman_agent()
        
        if not agent_id:
            raise HTTPException(status_code=500, detail="Failed to create Bossman agent")
        
        return {
            "success": True,
            "agent_id": agent_id,
            "message": "Bossman controller agent created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating Bossman agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.get("/status", response_model=Dict[str, Any])
async def get_bossman_status(
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Get Bossman controller status"""
    try:
        status = bossman_controller.get_status()
        
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        logger.error(f"Error getting Bossman status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/monitor", response_model=Dict[str, Any])
async def monitor_agents(
    request: MonitorAgentsRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Monitor multiple trading agents across chains"""
    try:
        results = bossman_controller.monitor_agents(request.agent_ids)
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error monitoring agents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/command", response_model=Dict[str, Any])
async def execute_command(
    request: BossmanCommandRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Execute a command for a specific agent"""
    try:
        result = bossman_controller.execute_command(
            agent_id=request.agent_id,
            command=request.command,
            parameters=request.parameters
        )
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error executing command: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/market", response_model=Dict[str, Any])
async def monitor_market(
    request: MarketMonitorRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Monitor market conditions across specified tokens and networks"""
    try:
        results = bossman_controller.monitor_market(
            tokens=request.tokens,
            networks=request.networks
        )
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error monitoring market: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/opportunities", response_model=Dict[str, Any])
async def analyze_opportunities(
    tokens: Optional[List[str]] = Query(None, description="List of token addresses to analyze"),
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Analyze cross-chain arbitrage opportunities"""
    try:
        opportunities = bossman_controller.analyze_cross_chain_opportunities(tokens)
        
        return {
            "success": True,
            "opportunities": opportunities
        }
    except Exception as e:
        logger.error(f"Error analyzing opportunities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/rebalance", response_model=Dict[str, Any])
async def rebalance_assets(
    request: RebalanceRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Rebalance assets between agents"""
    try:
        result = bossman_controller.rebalance_assets(
            source_agent_id=request.source_agent_id,
            target_agent_id=request.target_agent_id,
            amount=request.amount,
            token_address=request.token_address
        )
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error rebalancing assets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/strategy", response_model=Dict[str, Any])
async def set_trading_strategy(
    request: StrategyRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Set trading strategy for an agent"""
    try:
        result = bossman_controller.set_trading_strategy(
            agent_id=request.agent_id,
            strategy=request.strategy,
            parameters=request.parameters
        )
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error setting trading strategy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@bossman_router.post("/risk", response_model=Dict[str, Any])
async def update_risk_parameters(
    request: RiskUpdateRequest,
    bossman_controller: BossmanController = Depends(get_bossman_controller)
):
    """Update risk parameters for all agents"""
    try:
        result = bossman_controller.update_risk_parameters(
            risk_level=request.risk_level,
            parameters=request.parameters
        )
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error updating risk parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
