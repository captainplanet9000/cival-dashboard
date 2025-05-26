"""
Agent State Manager for persistent storage of agent trading states
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import asyncio
from loguru import logger
import httpx


class AgentStateManager:
    """Service for managing persistent agent states"""
    
    def __init__(self, db_connection_string: str = None):
        self.db_connection_string = db_connection_string
        self.base_url = "http://localhost:3000/api/agents"
        self.in_memory_cache = {}
        self.lock = asyncio.Lock()
    
    async def get_agent_state(self, agent_id: str) -> Dict:
        """Retrieve the agent's state from the database"""
        logger.info(f"Getting state for agent: {agent_id}")
        
        # Check in-memory cache first
        if agent_id in self.in_memory_cache:
            logger.debug(f"Using cached state for agent: {agent_id}")
            return self.in_memory_cache[agent_id]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/state?agentId={agent_id}",
                    timeout=10.0
                )
                response.raise_for_status()
                state = response.json()
                
                # Update in-memory cache
                self.in_memory_cache[agent_id] = state
                
                logger.info(f"Retrieved state for agent: {agent_id}")
                return state
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"No state found for agent: {agent_id}")
                # Return empty state
                empty_state = {"agentId": agent_id, "state": {}, "createdAt": datetime.utcnow().isoformat()}
                self.in_memory_cache[agent_id] = empty_state
                return empty_state
            else:
                logger.error(f"HTTP error getting agent state: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Failed to get agent state: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error getting agent state: {str(e)}")
            raise Exception(f"Agent state request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error getting agent state: {str(e)}")
            raise
    
    async def update_agent_state(self, agent_id: str, state: Dict) -> Dict:
        """Update the agent's state in the database"""
        logger.info(f"Updating state for agent: {agent_id}")
        
        # Acquire lock to prevent concurrent updates
        async with self.lock:
            try:
                # Prepare the update payload
                payload = {
                    "agentId": agent_id,
                    "state": state,
                    "updatedAt": datetime.utcnow().isoformat()
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/state",
                        json=payload,
                        timeout=10.0
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    # Update in-memory cache
                    self.in_memory_cache[agent_id] = result
                    
                    logger.info(f"Updated state for agent: {agent_id}")
                    return result
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error updating agent state: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Failed to update agent state: {e.response.text}")
            except httpx.RequestError as e:
                logger.error(f"Request error updating agent state: {str(e)}")
                raise Exception(f"Agent state update request failed: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error updating agent state: {str(e)}")
                raise
    
    async def update_state_field(self, agent_id: str, field: str, value: Any) -> Dict:
        """Update a specific field in the agent's state"""
        logger.info(f"Updating field '{field}' for agent: {agent_id}")
        
        try:
            # Get current state
            current_state = await self.get_agent_state(agent_id)
            
            # Create a copy of the state to modify
            state_copy = current_state.get("state", {}).copy()
            
            # Update the specific field
            state_copy[field] = value
            
            # Save the updated state
            return await self.update_agent_state(agent_id, state_copy)
            
        except Exception as e:
            logger.error(f"Error updating state field: {str(e)}")
            raise
    
    async def delete_agent_state(self, agent_id: str) -> bool:
        """Delete the agent's state from the database"""
        logger.info(f"Deleting state for agent: {agent_id}")
        
        async with self.lock:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.delete(
                        f"{self.base_url}/state?agentId={agent_id}",
                        timeout=10.0
                    )
                    response.raise_for_status()
                    
                    # Remove from in-memory cache
                    if agent_id in self.in_memory_cache:
                        del self.in_memory_cache[agent_id]
                    
                    logger.info(f"Deleted state for agent: {agent_id}")
                    return True
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error deleting agent state: {e.response.status_code} - {e.response.text}")
                return False
            except httpx.RequestError as e:
                logger.error(f"Request error deleting agent state: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Unexpected error deleting agent state: {str(e)}")
                return False
    
    async def save_trading_decision(self, agent_id: str, decision: Dict) -> Dict:
        """Save trading decision to agent history"""
        logger.info(f"Saving trading decision for agent: {agent_id}")
        
        try:
            # Prepare the decision payload
            payload = {
                "agentId": agent_id,
                "decision": decision,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/decisions",
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Saved trading decision for agent: {agent_id}")
                
                # Update decision history in agent state
                await self._update_decision_history(agent_id, decision)
                
                return result
                
        except Exception as e:
            logger.error(f"Error saving trading decision: {str(e)}")
            raise
    
    async def _update_decision_history(self, agent_id: str, decision: Dict):
        """Update decision history in agent state"""
        try:
            # Get current state
            current_state = await self.get_agent_state(agent_id)
            
            # Create a copy of the state to modify
            state_copy = current_state.get("state", {}).copy()
            
            # Initialize decision history if not present
            if "decisionHistory" not in state_copy:
                state_copy["decisionHistory"] = []
            
            # Add decision to history (with timestamp if not present)
            if "timestamp" not in decision:
                decision["timestamp"] = datetime.utcnow().isoformat()
            
            # Limit history size (keep latest 50 decisions)
            max_history = 50
            state_copy["decisionHistory"] = [decision] + state_copy["decisionHistory"][:max_history-1]
            
            # Save the updated state
            await self.update_agent_state(agent_id, state_copy)
            
        except Exception as e:
            logger.error(f"Error updating decision history: {str(e)}")
            # Don't raise exception to prevent blocking the main flow
            
    async def create_agent_checkpoint(self, agent_id: str, metadata: Dict = None) -> Dict:
        """Create a checkpoint of the agent's current state"""
        logger.info(f"Creating checkpoint for agent: {agent_id}")
        
        try:
            # Get current state
            current_state = await self.get_agent_state(agent_id)
            
            # Prepare checkpoint payload
            checkpoint = {
                "agentId": agent_id,
                "state": current_state.get("state", {}),
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/checkpoints",
                    json=checkpoint,
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Created checkpoint for agent: {agent_id}")
                return result
                
        except Exception as e:
            logger.error(f"Error creating agent checkpoint: {str(e)}")
            raise
    
    async def restore_agent_checkpoint(self, agent_id: str, checkpoint_id: str) -> Dict:
        """Restore an agent's state from a checkpoint"""
        logger.info(f"Restoring checkpoint {checkpoint_id} for agent: {agent_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/checkpoints/restore",
                    json={
                        "agentId": agent_id,
                        "checkpointId": checkpoint_id
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Clear cache to force reload
                if agent_id in self.in_memory_cache:
                    del self.in_memory_cache[agent_id]
                
                logger.info(f"Restored checkpoint for agent: {agent_id}")
                return result
                
        except Exception as e:
            logger.error(f"Error restoring agent checkpoint: {str(e)}")
            raise