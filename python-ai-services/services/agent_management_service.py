from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid

from ..models.agent_models import (
    AgentConfigInput,
    AgentConfigOutput,
    AgentUpdateRequest,
    AgentStatus
)
from loguru import logger

class AgentManagementService:
    def __init__(self):
        self._agents: Dict[str, AgentConfigOutput] = {}
        self._agent_statuses: Dict[str, AgentStatus] = {}
        logger.info("AgentManagementService initialized with in-memory storage.")

    async def create_agent(self, agent_input: AgentConfigInput) -> AgentConfigOutput:
        logger.info(f"Attempting to create agent with name: {agent_input.name}")
        agent_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        agent_config = AgentConfigOutput(
            agent_id=agent_id,
            created_at=now,
            updated_at=now,
            is_active=False, # Default to inactive
            **agent_input.model_dump()
        )
        self._agents[agent_id] = agent_config

        # Initialize status
        self._agent_statuses[agent_id] = AgentStatus(
            agent_id=agent_id,
            status="stopped",
            last_heartbeat=now
        )
        logger.info(f"Agent created successfully with ID: {agent_id}")
        return agent_config

    async def get_agents(self) -> List[AgentConfigOutput]:
        logger.debug(f"Retrieving all agents. Count: {len(self._agents)}")
        return list(self._agents.values())

    async def get_agent(self, agent_id: str) -> Optional[AgentConfigOutput]:
        logger.debug(f"Attempting to retrieve agent with ID: {agent_id}")
        agent = self._agents.get(agent_id)
        if not agent:
            logger.warning(f"Agent with ID {agent_id} not found.")
        return agent

    async def update_agent(self, agent_id: str, update_data: AgentUpdateRequest) -> Optional[AgentConfigOutput]:
        logger.info(f"Attempting to update agent with ID: {agent_id}")
        agent = self._agents.get(agent_id)
        if not agent:
            logger.warning(f"Agent with ID {agent_id} not found for update.")
            return None

        update_dict = update_data.model_dump(exclude_unset=True)

        # Nested models need to be handled carefully for partial updates
        if 'strategy' in update_dict and update_dict['strategy'] is not None:
            current_strategy_params = agent.strategy.parameters
            updated_strategy_params = update_dict['strategy'].get('parameters', {})
            # Example: simple merge, or could be more complex depending on desired behavior
            merged_params = {**current_strategy_params, **updated_strategy_params}
            agent.strategy.parameters = merged_params
            if 'strategy_name' in update_dict['strategy']:
                 agent.strategy.strategy_name = update_dict['strategy']['strategy_name']
            del update_dict['strategy'] # Handled manually

        if 'risk_config' in update_dict and update_dict['risk_config'] is not None:
            for key, value in update_dict['risk_config'].items():
                if value is not None: # only update fields that are set in the request
                    setattr(agent.risk_config, key, value)
            del update_dict['risk_config'] # Handled manually

        # Update remaining fields
        for key, value in update_dict.items():
            if value is not None:
                setattr(agent, key, value)

        agent.updated_at = datetime.now(timezone.utc)
        self._agents[agent_id] = agent
        logger.info(f"Agent {agent_id} updated successfully.")
        return agent

    async def delete_agent(self, agent_id: str) -> bool:
        logger.info(f"Attempting to delete agent with ID: {agent_id}")
        if agent_id in self._agents:
            del self._agents[agent_id]
            if agent_id in self._agent_statuses:
                del self._agent_statuses[agent_id]
            logger.info(f"Agent {agent_id} deleted successfully.")
            return True
        logger.warning(f"Agent with ID {agent_id} not found for deletion.")
        return False

    async def start_agent(self, agent_id: str) -> AgentStatus:
        logger.info(f"Attempting to start agent with ID: {agent_id}")
        agent = self._agents.get(agent_id)
        if not agent:
            logger.error(f"Cannot start agent: Agent with ID {agent_id} not found.")
            raise ValueError(f"Agent with ID {agent_id} not found.")

        agent.is_active = True
        agent.updated_at = datetime.now(timezone.utc)
        self._agents[agent_id] = agent # Re-store the updated agent config

        status = AgentStatus(
            agent_id=agent_id,
            status="starting", # Transition to "running" would be done by the agent's actual process
            message="Agent start initiated.",
            last_heartbeat=datetime.now(timezone.utc)
        )
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} start initiated. Status set to 'starting'.")
        # In a real scenario, this would trigger the agent's main loop/process.
        # For now, we'll manually update to 'running' for simulation.
        status.status = "running"
        status.message = "Agent is now running."
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} status updated to 'running' (simulated).")
        return status

    async def stop_agent(self, agent_id: str) -> AgentStatus:
        logger.info(f"Attempting to stop agent with ID: {agent_id}")
        agent = self._agents.get(agent_id)
        if not agent:
            logger.error(f"Cannot stop agent: Agent with ID {agent_id} not found.")
            raise ValueError(f"Agent with ID {agent_id} not found.")

        agent.is_active = False
        agent.updated_at = datetime.now(timezone.utc)
        self._agents[agent_id] = agent # Re-store the updated agent config

        status = AgentStatus(
            agent_id=agent_id,
            status="stopping", # Transition to "stopped" would be confirmed by the agent's process
            message="Agent stop initiated.",
            last_heartbeat=datetime.now(timezone.utc)
        )
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} stop initiated. Status set to 'stopping'.")
        # Simulate completion of stopping
        status.status = "stopped"
        status.message = "Agent has been stopped."
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} status updated to 'stopped' (simulated).")
        return status

    async def get_agent_status(self, agent_id: str) -> Optional[AgentStatus]:
        logger.debug(f"Retrieving status for agent ID: {agent_id}")
        status = self._agent_statuses.get(agent_id)
        if not status:
             # If agent exists but no status, create a default 'stopped' status
            if agent_id in self._agents:
                logger.warning(f"Status not found for existing agent {agent_id}, returning default 'stopped'.")
                return AgentStatus(agent_id=agent_id, status="stopped", message="Status not explicitly tracked, assuming stopped.")
            logger.warning(f"Status not found for agent ID {agent_id} (agent may not exist).")
        return status

    async def update_agent_heartbeat(self, agent_id: str, message: Optional[str] = None) -> Optional[AgentStatus]:
        """
        Called by an active agent process to signal it's alive and possibly update its message.
        """
        logger.debug(f"Received heartbeat for agent ID: {agent_id}")
        status = self._agent_statuses.get(agent_id)
        if not status:
            logger.warning(f"Cannot update heartbeat: Agent status for ID {agent_id} not found.")
            return None # Or raise error if agent must exist

        if status.status not in ["running", "starting"]: # Only update heartbeat for active agents
             logger.warning(f"Heartbeat received for non-running agent {agent_id} (status: {status.status}). Heartbeat not updated.")
             return status


        status.last_heartbeat = datetime.now(timezone.utc)
        if message:
            status.message = message

        self._agent_statuses[agent_id] = status
        # logger.debug(f"Heartbeat updated for agent {agent_id}. New message: {message if message else '(no change)'}")
        return status

    # Example method that might be called by the agent process itself
    async def _update_agent_status_internally(self, agent_id: str, new_status: Literal["running", "stopped", "error"], message: Optional[str] = None):
        """
        Internal helper for an agent process to update its own status directly.
        This would typically be called by the agent's core logic loop.
        """
        if agent_id not in self._agents:
            logger.error(f"Cannot update status: Agent {agent_id} does not exist.")
            return

        current_status = self._agent_statuses.get(agent_id)
        if not current_status:
            # Should not happen if agent exists, but handle defensively
            current_status = AgentStatus(agent_id=agent_id, status=new_status, message=message or "Status initialized internally.")
        else:
            current_status.status = new_status
            if message:
                current_status.message = message
        current_status.last_heartbeat = datetime.now(timezone.utc)
        self._agent_statuses[agent_id] = current_status
        logger.info(f"Internal status update for agent {agent_id}: new_status='{new_status}', message='{message or '(no change)'}'")

```
