from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import uuid
import json
import os
from pathlib import Path

from ..models.agent_models import (
    AgentConfigInput,
    AgentConfigOutput,
    AgentUpdateRequest,
    AgentStatus,
    AgentStrategyConfig, # Required for nested updates
    AgentRiskConfig      # Required for nested updates
)
from loguru import logger

class AgentManagementService:
    def __init__(self, config_dir: Path = Path("agent_configs")):
        self.config_dir = config_dir
        os.makedirs(self.config_dir, exist_ok=True)
        self._agent_statuses: Dict[str, AgentStatus] = {} # Runtime status remains in-memory
        logger.info(f"AgentManagementService initialized. Configs stored in: {self.config_dir.resolve()}")
        self._load_existing_statuses()

    def _load_existing_statuses(self):
        """Initialize statuses for agents that have configs but no runtime status yet."""
        try:
            for filename in os.listdir(self.config_dir):
                if filename.endswith(".json"):
                    agent_id = filename[:-5] # Remove .json
                    if agent_id not in self._agent_statuses:
                        # Attempt to load config to check is_active, default to 'stopped'
                        # This is a simplified load just for is_active, actual get_agent does full parsing
                        try:
                            file_path = self.config_dir / filename
                            with open(file_path, 'r') as f:
                                data = json.load(f)
                                is_active = data.get('is_active', False)
                                current_status_val = "running" if is_active else "stopped"
                                # if is_active, it implies it should be running, but on startup, it's safer to assume stopped
                                # unless a more robust persistence for runtime state is added.
                                # For now, if is_active is True in file, it means it *should* be running.
                                # Actual runtime state is managed by start/stop calls.
                                # So, on fresh service start, all are "stopped" unless explicitly started later.
                                self._agent_statuses[agent_id] = AgentStatus(
                                    agent_id=agent_id,
                                    status="stopped", # Always init to stopped, start_agent will change this
                                    last_heartbeat=datetime.now(timezone.utc)
                                )
                                logger.debug(f"Initialized status for existing agent {agent_id} to 'stopped'.")
                        except Exception as e:
                            logger.error(f"Error loading minimal config for agent {agent_id} to init status: {e}")
        except Exception as e:
            logger.error(f"Error listing agent config directory during status initialization: {e}")


    async def _save_agent_config(self, agent_config: AgentConfigOutput):
        file_path = self.config_dir / f"{agent_config.agent_id}.json"
        try:
            with open(file_path, 'w') as f:
                f.write(agent_config.model_dump_json(indent=2))
            logger.debug(f"Agent config saved to {file_path}")
        except IOError as e:
            logger.error(f"Failed to save agent config {agent_config.agent_id} to {file_path}: {e}")
            raise # Re-raise to indicate save failure

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
        await self._save_agent_config(agent_config)

        self._agent_statuses[agent_id] = AgentStatus(
            agent_id=agent_id,
            status="stopped",
            last_heartbeat=now
        )
        logger.info(f"Agent created successfully with ID: {agent_id}")
        return agent_config

    async def get_agents(self) -> List[AgentConfigOutput]:
        agents_list: List[AgentConfigOutput] = []
        logger.debug(f"Retrieving all agents from {self.config_dir}")
        try:
            for filename in os.listdir(self.config_dir):
                if filename.endswith(".json"):
                    agent_id = filename[:-5]
                    agent = await self.get_agent(agent_id) # Use existing get_agent to load and parse
                    if agent:
                        agents_list.append(agent)
        except Exception as e:
            logger.error(f"Error listing or loading agents from {self.config_dir}: {e}", exc_info=True)
        return agents_list

    async def get_agent(self, agent_id: str) -> Optional[AgentConfigOutput]:
        logger.debug(f"Attempting to retrieve agent with ID: {agent_id} from file.")
        file_path = self.config_dir / f"{agent_id}.json"
        if not file_path.exists():
            logger.warning(f"Agent config file not found for ID {agent_id} at {file_path}")
            return None
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                return AgentConfigOutput(**data)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for agent {agent_id} from {file_path}: {e}")
            return None
        except IOError as e:
            logger.error(f"IOError for agent {agent_id} from {file_path}: {e}")
            return None
        except Exception as e: # Catch any other Pydantic validation errors, etc.
            logger.error(f"Failed to load/parse agent {agent_id} from {file_path}: {e}", exc_info=True)
            return None


    async def update_agent(self, agent_id: str, update_data: AgentUpdateRequest) -> Optional[AgentConfigOutput]:
        logger.info(f"Attempting to update agent with ID: {agent_id} in file.")
        agent = await self.get_agent(agent_id)
        if not agent:
            logger.warning(f"Agent with ID {agent_id} not found for update.")
            return None

        update_dict = update_data.model_dump(exclude_unset=True)

        # For nested Pydantic models, we need to update them correctly.
        # Pydantic's model_update can be tricky with nested partial updates.
        # A common way is to convert the existing model to a dict, update the dict, then re-parse.

        agent_data_dict = agent.model_dump()

        # Handle nested model updates carefully
        if 'strategy' in update_dict and update_dict['strategy'] is not None:
            # Assuming AgentUpdateRequest.strategy is a dict (from model_dump) or AgentStrategyConfig
            strategy_update_data = update_dict['strategy']
            if isinstance(strategy_update_data, dict):
                 # If strategy_update_data has 'parameters', merge them, otherwise replace strategy.parameters
                if 'parameters' in strategy_update_data and isinstance(agent_data_dict['strategy']['parameters'], dict) and isinstance(strategy_update_data['parameters'], dict):
                    agent_data_dict['strategy']['parameters'].update(strategy_update_data['parameters'])
                    # Remove parameters from strategy_update_data to avoid overwriting the merged one by top-level dict.update
                    del strategy_update_data['parameters']
                agent_data_dict['strategy'].update(strategy_update_data)
            elif isinstance(strategy_update_data, AgentStrategyConfig): # Should be dict from model_dump(exclude_unset=True)
                 agent_data_dict['strategy'].update(strategy_update_data.model_dump(exclude_unset=True))


        if 'risk_config' in update_dict and update_dict['risk_config'] is not None:
            risk_update_data = update_dict['risk_config']
            if isinstance(risk_update_data, dict):
                agent_data_dict['risk_config'].update(risk_update_data)
            elif isinstance(risk_update_data, AgentRiskConfig): # Should be dict
                agent_data_dict['risk_config'].update(risk_update_data.model_dump(exclude_unset=True))

        # Handle operational_parameters merge
        if 'operational_parameters' in update_dict and update_dict['operational_parameters'] is not None:
            if isinstance(agent_data_dict.get('operational_parameters'), dict) and isinstance(update_dict['operational_parameters'], dict):
                agent_data_dict['operational_parameters'].update(update_dict['operational_parameters'])
            else: # Overwrite if not dict or not existing
                agent_data_dict['operational_parameters'] = update_dict['operational_parameters']

        # Update other top-level fields
        for key, value in update_dict.items():
            if key not in ['strategy', 'risk_config', 'operational_parameters']: # Already handled
                agent_data_dict[key] = value # Value can be None here if explicitly set in AgentUpdateRequest

        agent_data_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

        try:
            updated_agent = AgentConfigOutput(**agent_data_dict)
            await self._save_agent_config(updated_agent)
            logger.info(f"Agent {agent_id} updated successfully in file.")
            return updated_agent
        except Exception as e: # Pydantic validation error or other
            logger.error(f"Error re-validating or saving updated agent {agent_id}: {e}", exc_info=True)
            return None


    async def delete_agent(self, agent_id: str) -> bool:
        logger.info(f"Attempting to delete agent with ID: {agent_id} from file.")
        file_path = self.config_dir / f"{agent_id}.json"
        if file_path.exists():
            try:
                os.remove(file_path)
                if agent_id in self._agent_statuses:
                    del self._agent_statuses[agent_id]
                logger.info(f"Agent {agent_id} deleted successfully from file system and status cache.")
                return True
            except IOError as e:
                logger.error(f"Error deleting agent config file {file_path} for agent {agent_id}: {e}")
                return False # Deletion failed
        logger.warning(f"Agent config file {file_path} not found for deletion for agent {agent_id}.")
        return False

    async def start_agent(self, agent_id: str) -> AgentStatus:
        logger.info(f"Attempting to start agent with ID: {agent_id}")
        agent = await self.get_agent(agent_id) # Load from file
        if not agent:
            logger.error(f"Cannot start agent: Agent with ID {agent_id} not found.")
            raise ValueError(f"Agent with ID {agent_id} not found.")

        agent.is_active = True
        agent.updated_at = datetime.now(timezone.utc)
        await self._save_agent_config(agent) # Save updated is_active state

        status = AgentStatus(
            agent_id=agent_id,
            status="starting",
            message="Agent start initiated.",
            last_heartbeat=datetime.now(timezone.utc)
        )
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} start initiated. Status set to 'starting'. Config updated with is_active=True.")

        status.status = "running"
        status.message = "Agent is now running."
        self._agent_statuses[agent_id] = status # Update in-memory status
        logger.info(f"Agent {agent_id} status updated to 'running' (simulated).")
        return status

    async def stop_agent(self, agent_id: str) -> AgentStatus:
        logger.info(f"Attempting to stop agent with ID: {agent_id}")
        agent = await self.get_agent(agent_id) # Load from file
        if not agent:
            logger.error(f"Cannot stop agent: Agent with ID {agent_id} not found.")
            raise ValueError(f"Agent with ID {agent_id} not found.")

        agent.is_active = False
        agent.updated_at = datetime.now(timezone.utc)
        await self._save_agent_config(agent) # Save updated is_active state

        status = AgentStatus(
            agent_id=agent_id,
            status="stopping",
            message="Agent stop initiated.",
            last_heartbeat=datetime.now(timezone.utc)
        )
        self._agent_statuses[agent_id] = status
        logger.info(f"Agent {agent_id} stop initiated. Status set to 'stopping'. Config updated with is_active=False.")

        status.status = "stopped"
        status.message = "Agent has been stopped."
        self._agent_statuses[agent_id] = status # Update in-memory status
        logger.info(f"Agent {agent_id} status updated to 'stopped' (simulated).")
        return status

    async def get_child_agents(self, parent_agent_id: str) -> List[AgentConfigOutput]:
        logger.debug(f"Retrieving child agents for parent_agent_id: {parent_agent_id}")
        child_agents: List[AgentConfigOutput] = []
        try:
            for filename in os.listdir(self.config_dir):
                if filename.endswith(".json"):
                    agent_id = filename[:-5]
                    # Avoid reading the file if it's the parent itself, though parent_agent_id check handles this
                    if agent_id == parent_agent_id:
                        continue

                    # We need to load the agent config to check its parent_agent_id
                    # Using a simplified load just for parent_agent_id to avoid full model parsing if not needed,
                    # but full parsing is safer for consistency and future needs. Let's use get_agent.
                    agent_config = await self.get_agent(agent_id)
                    if agent_config and agent_config.parent_agent_id == parent_agent_id:
                        child_agents.append(agent_config)
        except Exception as e:
            logger.error(f"Error listing or loading child agents for parent {parent_agent_id} from {self.config_dir}: {e}", exc_info=True)

        logger.info(f"Found {len(child_agents)} child agents for parent {parent_agent_id}.")
        return child_agents

    async def get_agent_status(self, agent_id: str) -> Optional[AgentStatus]:
        logger.debug(f"Retrieving status for agent ID: {agent_id}")
        status = self._agent_statuses.get(agent_id)
        if not status:
            # Check if config file exists for this agent_id to differentiate "unknown agent" from "known agent, no runtime status"
            if (self.config_dir / f"{agent_id}.json").exists():
                 # Config exists, but not in _agent_statuses (e.g., after service restart before agent starts)
                logger.warning(f"Status not found in memory for existing agent {agent_id}, returning default 'stopped'.")
                # Create and store a default status for next time
                default_status = AgentStatus(agent_id=agent_id, status="stopped", message="Status initialized on first query after service start.", last_heartbeat=datetime.now(timezone.utc))
                self._agent_statuses[agent_id] = default_status
                return default_status
            else:
                logger.warning(f"Status not found for agent ID {agent_id} (agent config also does not exist).")
                return None # Agent truly unknown
        return status

    async def update_agent_heartbeat(self, agent_id: str) -> bool:
        logger.debug(f"Received heartbeat for agent ID: {agent_id}")

        # Check if agent config file exists.
        if not (self.config_dir / f"{agent_id}.json").exists():
            logger.error(f"Cannot update heartbeat: Agent config for ID {agent_id} not found.")
            return False

        status = self._agent_statuses.get(agent_id)
        now = datetime.now(timezone.utc)

        if not status:
            logger.warning(f"Heartbeat for agent {agent_id}: No in-memory status found. Initializing as 'running'.")
            status = AgentStatus(
                agent_id=agent_id,
                status="running",
                message="Heartbeat received, status auto-initialized to running.",
                last_heartbeat=now
            )
        elif status.status not in ["running", "starting"]:
            # If an agent is explicitly stopped or in error, but its config still exists (and might be is_active=true)
            # a heartbeat indicates it might be running unexpectedly or coming back up.
            # The prompt states "ensure status is 'running'".
            logger.warning(f"Heartbeat for agent {agent_id}: Status was '{status.status}'. Forcing to 'running' due to heartbeat.")
            status.status = "running"
            status.message = f"Status forced to running due to heartbeat from previous state {status.status}."

        status.last_heartbeat = now
        self._agent_statuses[agent_id] = status
        logger.debug(f"Heartbeat updated for agent {agent_id}. Status: {status.status}.")
        return True

    async def _update_agent_status_internally(self, agent_id: str, new_status: Literal["running", "stopped", "error"], message: Optional[str] = None):
        # This method is less relevant now that status is primarily driven by explicit start/stop/get calls
        # and heartbeat. Config persistence for 'is_active' is the source of truth for desired state.
        # However, an agent process might still want to report an 'error' state.
        logger.info(f"Internal status update attempt for agent {agent_id}: new_status='{new_status}'")
        if not (self.config_dir / f"{agent_id}.json").exists(): # Check file existence
            logger.error(f"Cannot update status internally: Agent config {agent_id} does not exist.")
            return

        current_status = self._agent_statuses.get(agent_id)
        if not current_status:
            current_status = AgentStatus(agent_id=agent_id, status=new_status, message=message or f"Status initialized internally to {new_status}.")
        else:
            current_status.status = new_status
            if message:
                current_status.message = message

        current_status.last_heartbeat = datetime.now(timezone.utc)
        self._agent_statuses[agent_id] = current_status
        logger.info(f"Internal status update for agent {agent_id} completed: new_status='{new_status}', message='{message or '(no change)'}'")

```
