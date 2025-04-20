from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging
import json
import httpx
from ..db import get_db, get_supabase_client
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# ElizaOS API Client
class ElizaOSClient:
    def __init__(self):
        self.base_url = settings.elizaos_url
        self.api_key = settings.elizaos_api_key
    
    async def _make_request(self, method: str, path: str, data: Any = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            if method.lower() == "get":
                response = await client.get(url, headers=headers)
            elif method.lower() == "post":
                response = await client.post(url, headers=headers, json=data)
            elif method.lower() == "put":
                response = await client.put(url, headers=headers, json=data)
            elif method.lower() == "delete":
                response = await client.delete(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            if response.status_code >= 400:
                logger.error(f"ElizaOS API error: {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ElizaOS API error: {response.text}"
                )
            
            return response.json()
    
    async def create_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new ElizaOS agent"""
        return await self._make_request("post", "/agents", agent_data)
    
    async def get_agents(self) -> List[Dict[str, Any]]:
        """Get all available agents"""
        response = await self._make_request("get", "/agents")
        return response.get("agents", [])
    
    async def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """Get a specific agent by ID"""
        return await self._make_request("get", f"/agents/{agent_id}")
    
    async def update_agent(self, agent_id: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing agent"""
        return await self._make_request("put", f"/agents/{agent_id}", agent_data)
    
    async def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """Delete an agent"""
        return await self._make_request("delete", f"/agents/{agent_id}")
    
    async def execute_command(self, agent_id: str, command: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a command on an agent"""
        data = {
            "command": command,
            "context": context or {}
        }
        return await self._make_request("post", f"/agents/{agent_id}/execute", data)
    
    async def get_agent_memory(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get an agent's memory entries"""
        response = await self._make_request("get", f"/agents/{agent_id}/memory")
        return response.get("memories", [])
    
    async def create_goal(self, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trading goal"""
        return await self._make_request("post", "/goals", goal_data)
    
    async def get_goals(self) -> List[Dict[str, Any]]:
        """Get all goals"""
        response = await self._make_request("get", "/goals")
        return response.get("goals", [])
    
    async def get_goal(self, goal_id: str) -> Dict[str, Any]:
        """Get a specific goal by ID"""
        return await self._make_request("get", f"/goals/{goal_id}")
    
    async def update_goal(self, goal_id: str, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing goal"""
        return await self._make_request("put", f"/goals/{goal_id}", goal_data)
    
    async def delete_goal(self, goal_id: str) -> Dict[str, Any]:
        """Delete a goal"""
        return await self._make_request("delete", f"/goals/{goal_id}")

# ElizaOS Models
class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    model: str = "gpt-4o"
    farm_id: Optional[str] = None
    max_memory_items: Optional[int] = 100
    custom_instructions: Optional[str] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    farm_id: Optional[str] = None
    max_memory_items: Optional[int] = None
    custom_instructions: Optional[str] = None
    is_active: Optional[bool] = None

class Agent(AgentBase):
    id: str
    created_at: str
    updated_at: str
    is_active: bool

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_value: float
    current_value: float = 0.0
    timeframe_days: int
    risk_level: str
    farm_id: Optional[str] = None
    agent_ids: List[str] = []

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    timeframe_days: Optional[int] = None
    risk_level: Optional[str] = None
    farm_id: Optional[str] = None
    agent_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Goal(GoalBase):
    id: str
    created_at: str
    updated_at: str
    is_active: bool
    progress_percentage: float

class CommandExecuteRequest(BaseModel):
    command: str
    context: Optional[Dict[str, Any]] = None

class CommandExecuteResponse(BaseModel):
    response: str
    execution_id: str
    completed: bool
    
# Initialize ElizaOS client
elizaos_client = ElizaOSClient()

# Agent Routes
@router.post("/agents", response_model=Agent)
async def create_agent(
    agent: AgentCreate,
    db: Session = Depends(get_db)
):
    """Create a new trading agent"""
    try:
        agent_data = agent.dict()
        
        # Create agent in ElizaOS
        elizaos_response = await elizaos_client.create_agent(agent_data)
        
        # Store in our database as well for quick access
        supabase = get_supabase_client()
        
        db_agent = {
            "id": elizaos_response["id"],
            "name": agent.name,
            "description": agent.description,
            "model": agent.model,
            "farm_id": agent.farm_id,
            "max_memory_items": agent.max_memory_items,
            "custom_instructions": agent.custom_instructions,
            "is_active": True,
            "elizaos_data": json.dumps(elizaos_response)
        }
        
        supabase.table("agents").insert(db_agent).execute()
        
        return elizaos_response
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating agent: {str(e)}"
        )

@router.get("/agents", response_model=List[Agent])
async def get_agents(
    farm_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all trading agents, optionally filtered by farm_id"""
    try:
        # Get agents from ElizaOS
        elizaos_agents = await elizaos_client.get_agents()
        
        # Filter by farm_id if provided
        if farm_id:
            elizaos_agents = [agent for agent in elizaos_agents if agent.get("farm_id") == farm_id]
            
        return elizaos_agents
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting agents: {str(e)}"
        )

@router.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific agent by ID"""
    try:
        agent = await elizaos_client.get_agent(agent_id)
        return agent
    except Exception as e:
        logger.error(f"Error getting agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting agent: {str(e)}"
        )

@router.put("/agents/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing trading agent"""
    try:
        # Update agent in ElizaOS
        update_data = {k: v for k, v in agent_update.dict().items() if v is not None}
        updated_agent = await elizaos_client.update_agent(agent_id, update_data)
        
        # Update in our database as well
        supabase = get_supabase_client()
        
        # Only update fields that were provided
        db_update = {k: v for k, v in agent_update.dict().items() if v is not None}
        if db_update:
            db_update["elizaos_data"] = json.dumps(updated_agent)
            supabase.table("agents").update(db_update).eq("id", agent_id).execute()
        
        return updated_agent
    except Exception as e:
        logger.error(f"Error updating agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating agent: {str(e)}"
        )

@router.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Delete a trading agent"""
    try:
        # Delete from ElizaOS
        await elizaos_client.delete_agent(agent_id)
        
        # Delete from our database
        supabase = get_supabase_client()
        supabase.table("agents").delete().eq("id", agent_id).execute()
        
        return None
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting agent: {str(e)}"
        )

@router.post("/agents/{agent_id}/execute", response_model=CommandExecuteResponse)
async def execute_agent_command(
    agent_id: str,
    command_request: CommandExecuteRequest,
    db: Session = Depends(get_db)
):
    """Execute a command on an agent"""
    try:
        # Execute command via ElizaOS
        response = await elizaos_client.execute_command(
            agent_id, 
            command_request.command, 
            command_request.context
        )
        
        # Store command execution in history
        supabase = get_supabase_client()
        
        history_entry = {
            "agent_id": agent_id,
            "command": command_request.command,
            "response": response.get("response", ""),
            "context": json.dumps(command_request.context) if command_request.context else None,
            "execution_id": response.get("execution_id", ""),
            "completed": response.get("completed", False)
        }
        
        supabase.table("agent_command_history").insert(history_entry).execute()
        
        return CommandExecuteResponse(
            response=response.get("response", ""),
            execution_id=response.get("execution_id", ""),
            completed=response.get("completed", False)
        )
    except Exception as e:
        logger.error(f"Error executing command on agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing command: {str(e)}"
        )

@router.get("/agents/{agent_id}/memory", response_model=List[Dict[str, Any]])
async def get_agent_memory(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Get an agent's memory entries"""
    try:
        memories = await elizaos_client.get_agent_memory(agent_id)
        return memories
    except Exception as e:
        logger.error(f"Error getting memory for agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting agent memory: {str(e)}"
        )

# Goal Routes
@router.post("/goals", response_model=Goal)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db)
):
    """Create a new trading goal"""
    try:
        goal_data = goal.dict()
        
        # Create goal in ElizaOS
        elizaos_response = await elizaos_client.create_goal(goal_data)
        
        # Store in our database as well
        supabase = get_supabase_client()
        
        db_goal = {
            "id": elizaos_response["id"],
            "title": goal.title,
            "description": goal.description,
            "target_value": goal.target_value,
            "current_value": goal.current_value,
            "timeframe_days": goal.timeframe_days,
            "risk_level": goal.risk_level,
            "farm_id": goal.farm_id,
            "agent_ids": json.dumps(goal.agent_ids),
            "is_active": True,
            "elizaos_data": json.dumps(elizaos_response)
        }
        
        supabase.table("goals").insert(db_goal).execute()
        
        # Calculate progress percentage
        progress = (goal.current_value / goal.target_value) * 100 if goal.target_value > 0 else 0
        elizaos_response["progress_percentage"] = min(100, progress)
        
        return elizaos_response
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating goal: {str(e)}"
        )

@router.get("/goals", response_model=List[Goal])
async def get_goals(
    farm_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all trading goals, optionally filtered by farm_id"""
    try:
        # Get goals from ElizaOS
        elizaos_goals = await elizaos_client.get_goals()
        
        # Filter by farm_id if provided
        if farm_id:
            elizaos_goals = [goal for goal in elizaos_goals if goal.get("farm_id") == farm_id]
            
        # Add progress percentage to each goal
        for goal in elizaos_goals:
            target = goal.get("target_value", 0)
            current = goal.get("current_value", 0)
            progress = (current / target) * 100 if target > 0 else 0
            goal["progress_percentage"] = min(100, progress)
            
        return elizaos_goals
    except Exception as e:
        logger.error(f"Error getting goals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting goals: {str(e)}"
        )

@router.get("/goals/{goal_id}", response_model=Goal)
async def get_goal(
    goal_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific goal by ID"""
    try:
        goal = await elizaos_client.get_goal(goal_id)
        
        # Add progress percentage
        target = goal.get("target_value", 0)
        current = goal.get("current_value", 0)
        progress = (current / target) * 100 if target > 0 else 0
        goal["progress_percentage"] = min(100, progress)
        
        return goal
    except Exception as e:
        logger.error(f"Error getting goal {goal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting goal: {str(e)}"
        )

@router.put("/goals/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing trading goal"""
    try:
        # Update goal in ElizaOS
        update_data = {k: v for k, v in goal_update.dict().items() if v is not None}
        updated_goal = await elizaos_client.update_goal(goal_id, update_data)
        
        # Update in our database as well
        supabase = get_supabase_client()
        
        # Only update fields that were provided
        db_update = {k: v for k, v in goal_update.dict().items() if v is not None}
        
        # Special handling for agent_ids JSON field
        if goal_update.agent_ids is not None:
            db_update["agent_ids"] = json.dumps(goal_update.agent_ids)
            
        if db_update:
            db_update["elizaos_data"] = json.dumps(updated_goal)
            supabase.table("goals").update(db_update).eq("id", goal_id).execute()
        
        # Add progress percentage
        target = updated_goal.get("target_value", 0)
        current = updated_goal.get("current_value", 0)
        progress = (current / target) * 100 if target > 0 else 0
        updated_goal["progress_percentage"] = min(100, progress)
        
        return updated_goal
    except Exception as e:
        logger.error(f"Error updating goal {goal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating goal: {str(e)}"
        )

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db)
):
    """Delete a trading goal"""
    try:
        # Delete from ElizaOS
        await elizaos_client.delete_goal(goal_id)
        
        # Delete from our database
        supabase = get_supabase_client()
        supabase.table("goals").delete().eq("id", goal_id).execute()
        
        return None
    except Exception as e:
        logger.error(f"Error deleting goal {goal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting goal: {str(e)}"
        )

# ElizaOS Webhook for events
@router.post("/webhook", status_code=status.HTTP_200_OK)
async def elizaos_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Webhook for ElizaOS events"""
    try:
        # Parse webhook payload
        payload = await request.json()
        event_type = payload.get("event_type")
        event_data = payload.get("data", {})
        
        logger.info(f"Received ElizaOS webhook: {event_type}")
        
        # Store webhook event
        supabase = get_supabase_client()
        
        webhook_entry = {
            "event_type": event_type,
            "event_data": json.dumps(event_data)
        }
        
        supabase.table("elizaos_webhooks").insert(webhook_entry).execute()
        
        # Process different event types
        if event_type == "agent.execution.completed":
            agent_id = event_data.get("agent_id")
            execution_id = event_data.get("execution_id")
            
            # Update execution status in command history
            if agent_id and execution_id:
                supabase.table("agent_command_history").update({
                    "completed": True,
                    "completion_time": "now()"
                }).eq("agent_id", agent_id).eq("execution_id", execution_id).execute()
        
        elif event_type == "goal.updated":
            goal_id = event_data.get("goal_id")
            current_value = event_data.get("current_value")
            
            # Update goal progress in our database
            if goal_id and current_value is not None:
                supabase.table("goals").update({
                    "current_value": current_value
                }).eq("id", goal_id).execute()
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error processing ElizaOS webhook: {e}")
        return {"status": "error", "message": str(e)}
