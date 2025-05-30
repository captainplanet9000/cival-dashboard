from pydantic import BaseModel
import uuid
from typing import Optional, Dict, Any

class CrewRunRequest(BaseModel):
    blueprint_id: uuid.UUID # ID of the CrewBlueprint to run
    user_id: str # Received from Next.js backend, which has authenticated user
    inputs: Dict[str, Any] # Generic inputs, validated against blueprint's input_schema

class CrewRunResponse(BaseModel):
    task_id: uuid.UUID
    status: str
    message: Optional[str] = None

# API Payloads for Agent CRUD
class CreateAgentApiPayload(BaseModel):
    agent_name: str # Changed from name to agent_name for clarity
    assigned_strategy_id: uuid.UUID # Changed from strategy_id for clarity
    configuration_parameters: Optional[Dict[str, Any]] = None
    initial_capital: float
    funding_currency: str
    # user_id will be passed as a separate header or query param by Next.js BFF

class UpdateAgentApiPayload(BaseModel):
    agent_name: Optional[str] = None
    assigned_strategy_id: Optional[uuid.UUID] = None
    configuration_parameters: Optional[Dict[str, Any]] = None
    # Add other updatable fields as necessary, e.g., description
    description: Optional[str] = None


# Placeholder for the response model for agent details
# This should ideally mirror the structure of TradingAgentWithDetails from the frontend types
# For now, using Any, but can be refined.
class TradingAgentDetailsResponse(BaseModel):
    agent_id: uuid.UUID
    user_id: uuid.UUID
    agent_name: str
    description: Optional[str] = None
    assigned_strategy_id: Optional[uuid.UUID] = None
    wallet_id: Optional[uuid.UUID] = None
    status: str # e.g., 'active', 'inactive', 'pending_creation'
    configuration_parameters: Optional[Dict[str, Any]] = None
    created_at: str # ISO datetime string
    updated_at: str # ISO datetime string
    # Include wallet details if they are to be embedded
    # wallet: Optional[Dict[str, Any]] = None # Simplified wallet representation
    # Include strategy details if they are to be embedded
    # trading_strategy: Optional[Dict[str, Any]] = None # Simplified strategy representation

# Response model for agent memory entries
class AgentMemoryResponseItem(BaseModel):
    retrieved_memory_content: str
    # Potentially add other fields like 'timestamp', 'score', 'id' if they become available
    # from MemoryService.list_memories in a structured way.
    # For now, this matches the current output of list_memories which wraps strings.
