from typing import Dict, List, Optional, Any
from loguru import logger
from pydantic import BaseModel, Field as PydanticField # Renamed Field to avoid conflict if any
from datetime import datetime, timezone # Added timezone for created_at

# Attempt to import letta-client and related error classes
try:
    from letta import Letta
    from letta.exceptions import APIError as LettaAPIError
    LETTA_CLIENT_AVAILABLE = True
except ImportError:
    logger.warning("letta-client not found. MemoryService will use stubbed Letta interactions.")
    LETTA_CLIENT_AVAILABLE = False
    # Define dummy classes for type hinting if letta-client is not available
    class Letta: # type: ignore
        def __init__(self, base_url: str):
            logger.info(f"STUB Letta client initialized with base_url: {base_url}")
        async def health(self): # Conceptual health check
            logger.info("STUB Letta client health check called.")
            return {"status": "ok_stub"}
        # Add other necessary mock methods for agents, messages if needed for type hinting in stubs
        class Agents:
            async def create(self, name: str, persona: str, human: str, model: Optional[str] = None, embedding_model: Optional[str] = None):
                logger.info(f"STUB Letta client agents.create called for name: {name}")
                return {"id": f"stub_letta_id_for_{name}", "name": name}
            async def get(self, agent_id: str): # Conceptual get by ID
                logger.info(f"STUB Letta client agents.get called for ID: {agent_id}")
                if "nonexistent" in agent_id: return None
                return {"id": agent_id, "name": f"app_agent_{agent_id.replace('stub_letta_id_for_app_agent_','')}"}
            async def list(self, name: Optional[str] = None): # Conceptual list with name filter
                logger.info(f"STUB Letta client agents.list called with name filter: {name}")
                if name and "nonexistent" not in name:
                    return [{"id": f"stub_letta_id_for_{name}", "name": name}]
                return []

        class Messages:
             async def create(self, agent_id: str, content: str, role: str = "user", stream: bool = False):
                logger.info(f"STUB Letta client messages.create for agent {agent_id}, role {role}: {content}")
                if stream: # Conceptual, not fully mocked here
                    async def mock_stream(): yield {"type": "message", "data": {"text": f"Streamed stub response to: {content}"}}
                    return mock_stream()
                return {"id": "stub_msg_id", "role": "assistant", "content": f"Stub response to: {content}"}

        agents = Agents()
        messages = Messages()


    class LettaAPIError(Exception): # type: ignore
        def __init__(self, message: str, status_code: Optional[int] = None):
            super().__init__(message)
            self.status_code = status_code
            logger.error(f"STUB LettaAPIError: {message} (Status: {status_code})")


# Import AgentPersistenceService with a fallback for standalone testing
try:
    from .agent_persistence_service import AgentPersistenceService
except ImportError:
    logger.warning("Could not import AgentPersistenceService. Mappings will not be persisted by MemoryService stubs.")
    class AgentPersistenceService: # type: ignore
        async def get_letta_mapping_by_app_agent_id(self, app_agent_id: str) -> Optional[Dict[str, Any]]: return None
        async def save_letta_mapping(self, mapping_data: Dict[str, Any]): pass

# --- Configuration Pydantic Models ---

class MemGPTAgentConfig(BaseModel):
    """Configuration for creating a MemGPT/Letta agent."""
    persona_name_or_text: str = PydanticField(..., description="Name of a predefined persona in Letta, or the full persona text.")
    human_name_or_text: str = PydanticField(..., description="Name of a predefined human profile in Letta, or the full human description text.")
    llm_model_name: Optional[str] = PydanticField(None, description="Specific LLM model for this MemGPT agent (e.g., 'gpt-4'). Letta server default if None.")
    embedding_model_name: Optional[str] = PydanticField(None, description="Specific embedding model. Letta server default if None.")

class AppAgentToLettaAgentMapping(BaseModel):
    """Model for storing the mapping between our application's agent ID and Letta's agent ID."""
    app_agent_id: str = PydanticField(..., description="Our application's unique agent identifier.")
    letta_agent_id: str = PydanticField(..., description="The ID of the agent within the Letta server.")
    letta_agent_name: str = PydanticField(..., description="The name of the agent within the Letta server.")
    created_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))
    last_used_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "allow" # Or forbid, depending on whether we want DB to add its own cols like 'id'

# --- MemoryService Class ---

class MemoryService:
    """
    Service for managing and interacting with MemGPT/Letta agents for persistent memory capabilities.
    This service acts as a client to a Letta server.
    """
    def __init__(self, letta_server_url: str, persistence_service: Optional[AgentPersistenceService] = None):
        self.letta_server_url: str = letta_server_url
        self.persistence_service: Optional[AgentPersistenceService] = persistence_service
        self.letta_client: Optional[Letta] = None
        # active_memgpt_agents conceptually caches Letta agent IDs or client objects
        # Key: app_agent_id, Value: letta_agent_id (string) or Letta agent object
        self.active_memgpt_agents: Dict[str, str] = {}
        logger.info(f"MemoryService initialized with Letta server URL: {self.letta_server_url}")

    async def connect_letta_client(self) -> bool:
        """
        Initializes the Letta client and checks connectivity to the Letta server.
        Returns True if connection is successful, False otherwise.
        """
        if not LETTA_CLIENT_AVAILABLE:
            logger.error("Letta client library is not installed. Cannot connect.")
            return False
        try:
            self.letta_client = Letta(base_url=self.letta_server_url)
            # Conceptual health check - actual method might differ
            # response = await self.letta_client.health() # Assuming a health check endpoint
            # if response and response.get("status") == "ok": # Adjust based on actual health response
            logger.info(f"Successfully connected to Letta server at {self.letta_server_url} (STUB: connection simulated).")
            return True
            # else:
            #     logger.error(f"Letta server at {self.letta_server_url} reported unhealthy or unexpected status: {response}")
            #     self.letta_client = None
            #     return False
        except Exception as e:
            logger.error(f"Failed to connect to Letta server at {self.letta_server_url}: {e}")
            self.letta_client = None
            return False

    async def _get_letta_agent_by_name(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """
        Helper to retrieve a Letta agent by its name.
        Returns Letta agent details if found, else None.
        This is a STUB. Actual implementation requires letta-client interaction.
        """
        if not self.letta_client:
            logger.error("Letta client not connected. Cannot get agent by name.")
            return None

        logger.info(f"MEMORY_SERVICE STUB: Checking if Letta agent '{agent_name}' exists via SDK.")
        try:
            # Actual SDK call: agents = await self.letta_client.agents.list(name=agent_name)
            # if agents and len(agents) > 0: return agents[0] # Assuming name is unique or take first
            if "nonexistent" not in agent_name: # Simulate finding an agent
                 mock_agent_data = {"id": f"stub_letta_id_for_{agent_name}", "name": agent_name}
                 logger.debug(f"MEMORY_SERVICE STUB: Found agent by name '{agent_name}': {mock_agent_data}")
                 return mock_agent_data
            return None
        except LettaAPIError as e:
            logger.error(f"Letta API error while getting agent by name '{agent_name}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error while getting Letta agent by name '{agent_name}': {e}")
            return None


    async def _create_letta_agent(self, agent_name: str, config: MemGPTAgentConfig) -> Optional[Dict[str, Any]]:
        """
        Helper to create a new Letta agent.
        Returns new Letta agent details if successful, else None.
        This is a STUB. Actual implementation requires letta-client interaction.
        """
        if not self.letta_client:
            logger.error("Letta client not connected. Cannot create agent.")
            return None

        logger.info(f"MEMORY_SERVICE STUB: Creating Letta agent '{agent_name}' with config: {config.model_dump_json(indent=2)}")
        try:
            # Actual SDK call:
            # new_agent = await self.letta_client.agents.create(
            #     name=agent_name,
            #     persona=config.persona_name_or_text,
            #     human=config.human_name_or_text,
            #     model=config.llm_model_name, # Pass None if not specified, Letta server uses default
            #     embedding_model=config.embedding_model_name # Pass None if not specified
            # )
            # return new_agent # This would be the agent object from letta-client
            mock_created_agent = {"id": f"stub_letta_id_for_{agent_name}", "name": agent_name, "persona": config.persona_name_or_text}
            logger.debug(f"MEMORY_SERVICE STUB: Successfully created Letta agent: {mock_created_agent}")
            return mock_created_agent
        except LettaAPIError as e:
            logger.error(f"Letta API error creating agent '{agent_name}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error creating Letta agent '{agent_name}': {e}")
            return None

    async def get_or_create_memgpt_agent(self, app_agent_id: str, memgpt_config: MemGPTAgentConfig) -> Optional[str]:
        """
        Ensures a MemGPT/Letta agent exists for the given app_agent_id.
        If it exists, its ID is returned. If not, it's created.
        Manages mapping between app_agent_id and Letta agent ID.
        Returns the Letta agent ID if successful, else None.
        """
        if not self.letta_client:
            logger.error("Letta client not connected. Cannot get or create MemGPT agent.")
            return None

        letta_agent_name = f"app_agent_{app_agent_id}" # Derived, unique name for Letta server

        # 1. Check active_memgpt_agents cache (app_agent_id -> letta_agent_id)
        if app_agent_id in self.active_memgpt_agents:
            logger.info(f"Found active Letta agent ID '{self.active_memgpt_agents[app_agent_id]}' for app_agent_id '{app_agent_id}' in cache.")
            return self.active_memgpt_agents[app_agent_id]

        # 2. Conceptual: Check persistence for existing mapping (if implemented)
        letta_agent_details: Optional[Dict[str, Any]] = None
        if self.persistence_service:
            # mapping_data = await self.persistence_service.get_letta_mapping_by_app_agent_id(app_agent_id)
            # if mapping_data:
            #     logger.info(f"Found mapping in DB: app_agent_id '{app_agent_id}' -> Letta ID '{mapping_data['letta_agent_id']}'")
            #     # Optionally verify this agent still exists on Letta server
            #     # letta_agent_details = await self.letta_client.agents.get(mapping_data['letta_agent_id']) # conceptual
            #     # if letta_agent_details:
            #     #    self.active_memgpt_agents[app_agent_id] = letta_agent_details['id']
            #     #    return letta_agent_details['id']
            #     # else: logger.warning("Mapping found in DB, but agent not on Letta server. Will recreate.")
            pass # Stubbed for now

        # 3. Try to find agent by name on Letta server
        if not letta_agent_details:
            letta_agent_details = await self._get_letta_agent_by_name(letta_agent_name)

        # 4. If not found, create it
        if not letta_agent_details:
            logger.info(f"Letta agent '{letta_agent_name}' not found. Attempting to create.")
            letta_agent_details = await self._create_letta_agent(letta_agent_name, memgpt_config)
            if not letta_agent_details:
                logger.error(f"Failed to create Letta agent '{letta_agent_name}'.")
                return None
            logger.info(f"Successfully created Letta agent '{letta_agent_name}' with ID '{letta_agent_details['id']}'.")

            # Conceptual: Save new mapping to persistence (if implemented)
            # if self.persistence_service:
            #     new_mapping = AppAgentToLettaAgentMapping(
            #         app_agent_id=app_agent_id,
            #         letta_agent_id=letta_agent_details['id'],
            #         letta_agent_name=letta_agent_name
            #     )
            #     await self.persistence_service.save_letta_mapping(new_mapping.model_dump())

        letta_agent_id = letta_agent_details["id"]
        self.active_memgpt_agents[app_agent_id] = letta_agent_id # Cache it
        return letta_agent_id

    async def store_memory_message(self, app_agent_id: str, message_content: str, role: str = "user") -> bool:
        """
        Stores an observation or message in the memory of the specified app_agent_id's MemGPT/Letta agent.
        This is a STUB. Actual implementation requires letta-client interaction.
        """
        if not self.letta_client:
            logger.error("Letta client not connected. Cannot store message.")
            return False

        letta_agent_id = self.active_memgpt_agents.get(app_agent_id)
        if not letta_agent_id:
            # In a real scenario, you might call get_or_create_memgpt_agent here if appropriate
            logger.error(f"No active Letta agent ID found for app_agent_id '{app_agent_id}'. Message not stored.")
            return False

        logger.info(f"MEMORY_SERVICE STUB: Storing message for Letta agent '{letta_agent_id}' (app_agent_id: {app_agent_id}), role '{role}': '{message_content[:100]}...'")
        try:
            # Actual SDK call:
            # response = await self.letta_client.messages.create(
            #    agent_id=letta_agent_id,
            #    role=role, # "user" for external observations, "system" for system messages, "assistant" for agent's own previous messages
            #    content=message_content,
            #    stream=False # Typically don't need to stream response for just storing a message
            # )
            # return response is not None and response.get("id") is not None # Check for successful message creation
            return True # Simulate success for stub
        except LettaAPIError as e:
            logger.error(f"Letta API error storing message for agent '{letta_agent_id}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error storing message for Letta agent '{letta_agent_id}': {e}")
            return False

    async def get_memory_response(self, app_agent_id: str, prompt_message: str, role: str = "user") -> Optional[str]:
        """
        Sends a prompt to the MemGPT/Letta agent and gets its response, which may include recalled memories.
        This is a STUB. Actual implementation requires letta-client interaction.
        """
        if not self.letta_client:
            logger.error("Letta client not connected. Cannot get memory response.")
            return None

        letta_agent_id = self.active_memgpt_agents.get(app_agent_id)
        if not letta_agent_id:
            logger.error(f"No active Letta agent ID found for app_agent_id '{app_agent_id}'. Cannot get response.")
            return None

        logger.info(f"MEMORY_SERVICE STUB: Sending prompt to Letta agent '{letta_agent_id}' (app_agent_id: {app_agent_id}), role '{role}': '{prompt_message[:100]}...'")
        try:
            # Actual SDK call:
            # response_data = await self.letta_client.messages.create(
            #     agent_id=letta_agent_id,
            #     role=role,
            #     content=prompt_message,
            #     stream=False # Get the full response
            # )
            # if response_data and response_data.get("content"):
            #    return response_data["content"]
            # return None # Or handle cases where no content is in response
            mock_response = f"Stubbed MemGPT response for '{prompt_message}', incorporating memories related to app_agent_id '{app_agent_id}'."
            return mock_response
        except LettaAPIError as e:
            logger.error(f"Letta API error getting response from agent '{letta_agent_id}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting response from Letta agent '{letta_agent_id}': {e}")
            return None

    async def close_letta_client(self):
        """Closes the Letta client connection if it was established."""
        if self.letta_client and hasattr(self.letta_client, "close"): # Check if client has a close method
            try:
                # await self.letta_client.close() # Actual close method if provided by SDK
                logger.info("MEMORY_SERVICE STUB: Letta client 'closed' (simulated).")
                self.letta_client = None
            except Exception as e:
                logger.error(f"Error closing Letta client: {e}")
        else:
            self.letta_client = None # Ensure it's None even if no explicit close needed/available


if __name__ == "__main__":
    import asyncio

    async def main():
        logger.remove()
        logger.add(lambda msg: print(msg, end=''), colorize=True, format="<level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")

        # Example Usage
        # This requires a running Letta server if LETTA_CLIENT_AVAILABLE is True and stubs are replaced.
        # For now, it will mostly use the stubbed client logic if letta-client is not installed.
        memory_service = MemoryService(letta_server_url="http://localhost:8283") # Default Letta port

        if await memory_service.connect_letta_client():
            logger.info("MemoryService connected to Letta (or stub client initialized).")

            app_agent_id_1 = "crew_ai_strategist_001"
            agent_config = MemGPTAgentConfig(
                persona_name_or_text="I am a helpful AI assistant specialized in financial markets.",
                human_name_or_text="The user is a trader looking for market insights."
            )

            letta_id_1 = await memory_service.get_or_create_memgpt_agent(app_agent_id_1, agent_config)
            if letta_id_1:
                logger.info(f"Letta Agent ID for {app_agent_id_1}: {letta_id_1}")

                await memory_service.store_memory_message(app_agent_id_1, "The user is interested in BTC/USD trends.")
                await memory_service.store_memory_message(app_agent_id_1, "Volatility has been high recently for BTC.", role="system")

                response = await memory_service.get_memory_response(app_agent_id_1, "What are the recent observations for BTC/USD?")
                logger.info(f"Response for {app_agent_id_1}: {response}")

            app_agent_id_2 = "crew_ai_researcher_002"
            agent_config_2 = MemGPTAgentConfig(
                persona_name_or_text="I am a research assistant, I provide detailed information.",
                human_name_or_text="The user is looking for specific data points."
            )
            letta_id_2 = await memory_service.get_or_create_memgpt_agent(app_agent_id_2, agent_config_2)
            if letta_id_2:
                 logger.info(f"Letta Agent ID for {app_agent_id_2}: {letta_id_2}")
                 await memory_service.store_memory_message(app_agent_id_2, "User asked about ETH/USD historical data.")
                 response2 = await memory_service.get_memory_response(app_agent_id_2, "Summarize my interests.")
                 logger.info(f"Response for {app_agent_id_2}: {response2}")

            # Try getting the first agent again (should be cached or found by name)
            letta_id_1_again = await memory_service.get_or_create_memgpt_agent(app_agent_id_1, agent_config)
            assert letta_id_1_again == letta_id_1
            logger.info(f"Re-fetched Letta Agent ID for {app_agent_id_1}: {letta_id_1_again}")


            await memory_service.close_letta_client()
        else:
            logger.error("Failed to connect MemoryService to Letta server.")

    asyncio.run(main())

```
