from typing import Dict, List, Optional, Any
from loguru import logger
from pydantic import BaseModel, Field as PydanticField # Renamed Field to avoid conflict if any
from datetime import datetime, timezone # Added timezone for created_at

import asyncio # Added for asyncio.to_thread
import os # Added for os.getenv

# Attempt to import letta-client and related error classes
try:
    from letta import Letta
    # Assuming specific exceptions might exist, e.g., for config or connection
    from letta.exceptions import APIError as LettaAPIError # Confirmed
    # from letta.exceptions import LettaClientConfigurationError # Hypothetical specific error
    LETTA_CLIENT_AVAILABLE = True
except ImportError:
    logger.warning("letta-client not found. MemoryService will use stubbed Letta interactions.")
    LETTA_CLIENT_AVAILABLE = False
    # Define dummy classes for type hinting if letta-client is not available
    class Letta: # type: ignore
        def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
            if token:
                logger.info(f"STUB Letta client initialized with API token.")
            else:
                logger.info(f"STUB Letta client initialized with base_url: {base_url}")

        # Mocking the structure for self.letta_client.agents.list and .create
        class Agents:
            def list(self, name: Optional[str] = None): # Assuming sync method
                logger.info(f"STUB Letta client agents.list called (sync) with name filter: {name}")
                # Simulate response structure that might have a .data attribute or be a list directly
                # This mock needs to align with how it's accessed in _get_letta_agent_by_name
                class MockResponse:
                    def __init__(self, data):
                        self.data = data
                if name and "nonexistent" not in name:
                    return MockResponse(data=[MagicMock(id=f"stub_letta_id_for_{name}", name=name)])
                return MockResponse(data=[])


            def create(self, name: str, persona: str, human: str, model: Optional[str] = None): # Assuming sync method
                logger.info(f"STUB Letta client agents.create called (sync) for name: {name}")
                # Return an object that has an 'id' attribute or is a dict with 'id'
                mock_agent = MagicMock()
                mock_agent.id = f"stub_letta_id_for_{name}"
                mock_agent.name = name
                return mock_agent # Or return {"id": ..., "name": ...} if create returns dict

        agents = Agents()
        # Add other sub-clients like messages if needed for method stubs that are being kept
        class Messages:
            async def create(self, agent_id: str, content: str, role: str = "user", stream: bool = False): # Keep this async as service awaits it directly
                logger.info(f"STUB Letta client messages.create (async) for agent {agent_id}, role {role}: {content}")
                if stream:
                    async def mock_stream(): yield {"type": "message", "data": {"text": f"Streamed stub response to: {content}"}} # type: ignore
                    return mock_stream()
                # Simulate returning the message sent, or a list containing it and then assistant's reply
                return [{"role": role, "content": content, "id": "stub_sent_msg_id"},
                        {"role": "assistant", "content": f"Stub assistant auto-reply to: {content}", "id": "stub_reply_msg_id"}]

            def list(self, agent_id: str, limit: Optional[int] = None): # Add sync list method for to_thread
                logger.info(f"STUB Letta client messages.list (sync) for agent {agent_id}, limit {limit}")
                # Simulate response structure with a 'results' attribute
                class MockMsgListResponse:
                    def __init__(self, results_data):
                        self.results = results_data

                # Provide some mock messages for testing response parsing
                mock_messages = [
                    MagicMock(role="user", content="Previous user message", id="prev_user_msg"),
                    MagicMock(role="assistant", content="Previous assistant reply", id="prev_asst_msg"),
                ]
                if limit:
                    return MockMsgListResponse(results_data=mock_messages[:limit])
                return MockMsgListResponse(results_data=mock_messages)

        agents = Agents()
        messages = Messages() # type: ignore


    class LettaAPIError(Exception): # type: ignore
        def __init__(self, message: str, status_code: Optional[int] = None): # type: ignore
            super().__init__(message)
            self.status_code = status_code
            logger.error(f"STUB LettaAPIError: {message} (Status: {status_code})")

    # class LettaClientConfigurationError(Exception): pass # Hypothetical


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
            logger.warning("Letta client library not available. MemoryService will operate in a non-functional stub mode.")
            self.letta_client = None # Ensure it's None
            return False

        try:
            letta_api_key = os.getenv("LETTA_API_KEY")
            # Use self.letta_server_url which is set during __init__
            # Defaulting here again just in case it wasn't passed to constructor, though it should be.
            current_letta_server_url = self.letta_server_url or os.getenv("LETTA_SERVER_URL", "http://localhost:8283")

            if letta_api_key:
                logger.info("Attempting to connect to Letta Cloud using API key...")
                self.letta_client = Letta(token=letta_api_key)
            elif current_letta_server_url:
                logger.info(f"Attempting to connect to self-hosted Letta server at {current_letta_server_url}...")
                self.letta_client = Letta(base_url=current_letta_server_url)
            else:
                logger.error("Letta connection failed: Neither LETTA_API_KEY nor LETTA_SERVER_URL environment variables are set, and no default URL was provided to MemoryService.")
                self.letta_client = None
                return False

            if self.letta_client:
                # Conceptual: Perform a simple API call to verify connection.
                # Example: try to list available models or a similar lightweight call.
                # models_response = await asyncio.to_thread(self.letta_client.models.list) # Requires models API
                # For now, successful instantiation is considered "connected".
                # A more robust health check would be: await asyncio.to_thread(self.letta_client.health.check) if such method exists.
                logger.info(f"Letta client initialized successfully for server/cloud.")
                # Simulating a basic check for URL validity if not using API key and URL was provided
                if not letta_api_key and current_letta_server_url and not current_letta_server_url.startswith("http"):
                    raise ValueError("Invalid Letta server URL provided.")
                logger.info("Letta client conceptually connected.")
                return True
            return False # Should not be reached if logic above is correct
        # except LettaClientConfigurationError as e_config: # Hypothetical specific error
        #     logger.error(f"Letta client configuration error: {e_config}")
        #     self.letta_client = None
        #     return False
        except LettaAPIError as e_api: # Catch API errors during initial connection/test call
            logger.error(f"Letta API error during connection/health check: {e_api}")
            self.letta_client = None
            return False
        except Exception as e:
            logger.error(f"Failed to initialize or connect Letta client: {e}")
            self.letta_client = None
            return False

    async def _get_letta_agent_by_name(self, agent_name: str) -> Optional[Any]: # Return type could be specific Letta agent object
        """
        Helper to retrieve a Letta agent by its name.
        Returns Letta agent object/details if found, else None.
        """
        if not self.letta_client or not LETTA_CLIENT_AVAILABLE:
            logger.warning("Letta client not connected or library not available. Cannot get agent by name.")
            return None

        try:
            logger.info(f"Querying Letta server for agent by name: {agent_name}")
            # Note: letta-client's agents.list() might be paginated or not support direct name filtering.
            # This implementation assumes client-side filtering for simplicity.
            # A more performant approach would use a dedicated get-by-name if the SDK/API supports it,
            # or store mappings if names are not guaranteed unique or queryable.
            all_agents_response = await asyncio.to_thread(self.letta_client.agents.list) # This is a sync call

            # The structure of all_agents_response depends on the letta-client version.
            # Assuming it's an object with a 'data' attribute which is a list of agent-like objects/dicts.
            # Or it could be the list directly. Adapt based on actual SDK.
            agent_list = []
            if hasattr(all_agents_response, 'data') and isinstance(all_agents_response.data, list):
                agent_list = all_agents_response.data
            elif isinstance(all_agents_response, list): # If list() directly returns a list of agent objects
                agent_list = all_agents_response
            else:
                logger.warning(f"Unexpected response structure from letta_client.agents.list: {type(all_agents_response)}")
                return None

            for agent_details in agent_list:
                # Assuming agent_details is an object with .name and .id, or a dict
                agent_detail_name = getattr(agent_details, 'name', agent_details.get('name') if isinstance(agent_details, dict) else None)
                if agent_detail_name == agent_name:
                    agent_detail_id = getattr(agent_details, 'id', agent_details.get('id') if isinstance(agent_details, dict) else None)
                    logger.info(f"Found Letta agent '{agent_name}' with ID {agent_detail_id}")
                    return agent_details # Return the full agent object/dict from client

            logger.info(f"Letta agent '{agent_name}' not found among listed agents.")
            return None
        except LettaAPIError as e:
            logger.error(f"Letta API error finding agent '{agent_name}': {e}")
            return None
        except Exception as e: # Catch other unexpected errors
            logger.error(f"Unexpected error finding Letta agent '{agent_name}': {e}")
            return None


    async def _create_letta_agent(self, agent_name: str, config: MemGPTAgentConfig) -> Optional[Any]: # Return type Any for agent object/dict
        """
        Helper to create a new Letta agent.
        Returns new Letta agent object/details if successful, else None.
        """
        if not self.letta_client or not LETTA_CLIENT_AVAILABLE:
            logger.warning("Letta client not connected or library not available. Cannot create agent.")
            return None

        try:
            logger.info(f"Creating Letta agent: {agent_name} with persona: {config.persona_name_or_text[:50]}...")
            agent_payload = {
                "name": agent_name,
                "persona": config.persona_name_or_text,
                "human": config.human_name_or_text,
                # model and embedding_model are often part of server-side presets or global config in MemGPT/Letta.
                # If the .agents.create() API takes them directly, they can be added here.
            }
            if config.llm_model_name:
                # The exact field name for model depends on letta-client API (e.g., 'model', 'llm_config', 'preset_name')
                agent_payload['model'] = config.llm_model_name
            # if config.embedding_model_name:
            #    agent_payload['embedding_model'] = config.embedding_model_name # Example

            # This is a sync call, wrap with to_thread
            created_agent = await asyncio.to_thread(self.letta_client.agents.create, **agent_payload)

            # Process response: created_agent might be the agent object directly or a response object.
            # Assuming it's the agent object/dict itself if successful and has an 'id'.
            agent_id = None
            if hasattr(created_agent, 'id'):
                agent_id = created_agent.id
            elif isinstance(created_agent, dict) and 'id' in created_agent:
                agent_id = created_agent['id']

            if agent_id:
                logger.info(f"Successfully created Letta agent '{agent_name}' with ID {agent_id}")
                return created_agent # Return the full agent object/dict
            else:
                logger.error(f"Failed to create Letta agent '{agent_name}'. Response did not contain ID. Response: {created_agent}")
                return None
        except LettaAPIError as e:
            logger.error(f"Letta API error creating agent '{agent_name}': {e}")
            return None
        except Exception as e: # Catch other unexpected errors
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

        # 1. Check active_memgpt_agents cache (app_agent_id -> letta_agent_id string)
        if app_agent_id in self.active_memgpt_agents:
            cached_letta_id = self.active_memgpt_agents[app_agent_id]
            logger.info(f"Found active Letta agent ID '{cached_letta_id}' for app_agent_id '{app_agent_id}' in cache.")
            # Optionally, one might verify if this agent still exists on the server if cache can be stale.
            # For this version, we assume cache validity or re-creation if calls fail later.
            return cached_letta_id

        # 2. Conceptual: Check persistence for existing mapping (if self.persistence_service is available)
        # if self.persistence_service:
        #     mapping = await self.persistence_service.get_letta_mapping_by_app_agent_id(app_agent_id)
        #     if mapping:
        #         logger.info(f"Found mapping in DB for {app_agent_id}: Letta Agent ID {mapping.letta_agent_id}, Name {mapping.letta_agent_name}")
        #         # Verify if this agent still exists on Letta server before using it
        #         agent_obj_from_db_mapping = await self._get_letta_agent_by_name(mapping.letta_agent_name)
        #         if agent_obj_from_db_mapping and agent_obj_from_db_mapping.id == mapping.letta_agent_id:
        #             self.active_memgpt_agents[app_agent_id] = agent_obj_from_db_mapping.id
        #             return agent_obj_from_db_mapping.id
        #         else:
        #             logger.warning(f"Mapping for {app_agent_id} found in DB, but agent {mapping.letta_agent_name} (ID: {mapping.letta_agent_id}) not found or ID mismatch on Letta server. Will attempt to recreate.")

        # 3. Try to find agent by its derived name on Letta server
        letta_agent_obj = await self._get_letta_agent_by_name(letta_agent_name)

        # 4. If not found by name, create it
        if not letta_agent_obj:
            logger.info(f"Letta agent '{letta_agent_name}' not found by name. Attempting to create.")
            letta_agent_obj = await self._create_letta_agent(letta_agent_name, memgpt_config)

        if letta_agent_obj:
            # Extract ID whether letta_agent_obj is a dict or an object with .id
            final_letta_agent_id = getattr(letta_agent_obj, 'id', letta_agent_obj.get('id') if isinstance(letta_agent_obj, dict) else None)

            if final_letta_agent_id:
                logger.info(f"Obtained Letta agent ID '{final_letta_agent_id}' for app_agent_id '{app_agent_id}' (Name: '{letta_agent_name}').")
                self.active_memgpt_agents[app_agent_id] = final_letta_agent_id # Cache the ID string

                # Conceptual: Save/Update mapping in persistence_service
                # if self.persistence_service:
                #     try:
                #         mapping_data = AppAgentToLettaAgentMapping(
                #             app_agent_id=app_agent_id,
                #             letta_agent_id=final_letta_agent_id,
                #             letta_agent_name=letta_agent_name,
                #             # created_at and last_used_at will use default_factory
                #         )
                #         await self.persistence_service.save_letta_mapping(mapping_data.model_dump())
                #         logger.info(f"Saved/Updated Letta agent mapping for {app_agent_id} to DB.")
                #     except Exception as e_persist:
                #         logger.error(f"Failed to save Letta agent mapping for {app_agent_id}: {e_persist}")
                return final_letta_agent_id
            else:
                logger.error(f"Letta agent object for '{letta_agent_name}' did not contain an ID. Object: {letta_agent_obj}")
                return None
        else:
            logger.error(f"Failed to get or create Letta agent for app_agent_id '{app_agent_id}' (Name: '{letta_agent_name}')")
            return None

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
            # Attempt to ensure agent exists if not in cache; this might be desirable or handled by caller.
            # For this version, we require get_or_create to be called first to populate cache.
            logger.error(f"Letta agent ID for app_agent_id '{app_agent_id}' not found in active cache. Ensure agent is created/retrieved first via get_or_create_memgpt_agent.")
            return False

        # Actual implementation will use self.letta_client.messages.create(...)
        logger.info(f"MEMORY_SERVICE STUB: Storing message for Letta agent '{letta_agent_id}' (app_agent_id: {app_agent_id}), role '{role}': '{message_content[:100]}...'")
        if not LETTA_CLIENT_AVAILABLE or not self.letta_client: # Should not happen if connect_letta_client was successful and LETTA_CLIENT_AVAILABLE is True
            logger.error("Letta client not available for storing message (should have been caught earlier).")
            return False # Should have been caught by connect or get_or_create
        try:
            # Conceptual Actual SDK call (assuming messages.create is async in the stub or needs to_thread):
            # If letta_client.messages.create is async as per stub:
            # response = await self.letta_client.messages.create(agent_id=letta_agent_id, content=message_content, role=role, stream=False)
            # If it's sync:
            # response = await asyncio.to_thread(
            #     self.letta_client.messages.create, # This is not how the stub is defined, stub messages.create is async
            #     agent_id=letta_agent_id, content=message_content, role=role, stream=False
            # )
            # For the stub, we call its async version directly as it's mocked that way
            response = await self.letta_client.messages.create(agent_id=letta_agent_id, content=message_content, role=role, stream=False)

            # Based on typical API patterns, a successful create returns some object with an ID.
            if response and (hasattr(response, 'id') or (isinstance(response, dict) and response.get('id'))):
                logger.info(f"Message successfully sent to Letta agent {letta_agent_id}. Message ID: {response.get('id') if isinstance(response, dict) else response.id}")
                return True
            else:
                logger.warning(f"Message sending to Letta agent {letta_agent_id} did not return a confirmation ID. Response: {response}")
                return False # Or True if API doesn't confirm message content storage directly
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
            logger.error(f"Letta agent ID for app_agent_id '{app_agent_id}' not found in active cache. Ensure agent is created/retrieved first via get_or_create_memgpt_agent.")
            return None

        # Actual implementation will use self.letta_client.messages.create(...) and process response
        logger.info(f"MEMORY_SERVICE STUB: Sending prompt to Letta agent '{letta_agent_id}' (app_agent_id: {app_agent_id}), role '{role}': '{prompt_message[:100]}...'")
        if not LETTA_CLIENT_AVAILABLE or not self.letta_client:
            logger.error("Letta client not available for getting response.")
            return None
        try:
            # Step 1: Send the user's prompt message
            # Assuming messages.create for sending a prompt might just return an ack or the sent message object
            # The stub for messages.create is async, so direct await is fine.
            sent_message_response = await self.letta_client.messages.create(
                agent_id=letta_agent_id,
                role=role,
                content=prompt_message,
                stream=False
            )

            # Check if sending the prompt was successful (e.g., message has an ID)
            sent_msg_id = None
            if isinstance(sent_message_response, list) and sent_message_response: # Stub returns a list
                sent_msg_id = sent_message_response[0].get("id")
            elif hasattr(sent_message_response, 'id'):
                sent_msg_id = sent_message_response.id

            if not sent_msg_id:
                logger.error(f"Failed to send prompt message to Letta agent {letta_agent_id}. Response: {sent_message_response}")
                return None
            logger.info(f"Prompt successfully sent to Letta agent {letta_agent_id} (Msg ID: {sent_msg_id}). Fetching response...")

            # Step 2: Fetch recent messages to find the assistant's reply
            # Assuming messages.list is a synchronous SDK method
            message_list_response = await asyncio.to_thread(
                self.letta_client.messages.list, # type: ignore
                agent_id=letta_agent_id,
                limit=5 # Fetch a few recent messages
            )

            if message_list_response and hasattr(message_list_response, 'results') and isinstance(message_list_response.results, list):
                # Iterate in reverse to find the latest assistant message
                for msg_obj in reversed(message_list_response.results):
                    msg_role = getattr(msg_obj, 'role', msg_obj.get('role') if isinstance(msg_obj, dict) else None)
                    msg_content = getattr(msg_obj, 'content', msg_obj.get('content') if isinstance(msg_obj, dict) else None)

                    if msg_role == 'assistant' and msg_content is not None:
                        logger.info(f"Received assistant reply from Letta agent {letta_agent_id}: '{str(msg_content)[:100]}...'")
                        return str(msg_content)

                logger.warning(f"No assistant reply found in recent messages for Letta agent {letta_agent_id}.")
                return None # Or a default message like "Agent processed, no textual reply."
            else:
                logger.error(f"Unexpected response structure from Letta agent {letta_agent_id} messages.list: {message_list_response}")
                return None
        except LettaAPIError as e:
            logger.error(f"Letta API error getting response from agent '{letta_agent_id}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting response from Letta agent '{letta_agent_id}': {e}")
            return None

    async def close_letta_client(self):
        """Closes the Letta client connection if it was established."""
        if self.letta_client: # No need to check hasattr for 'close' on the stub, just nullify
            # In a real client, you would check: if hasattr(self.letta_client, "close") and callable(self.letta_client.close):
            #    await asyncio.to_thread(self.letta_client.close) # Or await self.letta_client.close() if it's async
            logger.info("MEMORY_SERVICE: Letta client connection conceptually closed.")
            self.letta_client = None
        else:
            logger.info("MEMORY_SERVICE: No active Letta client to close.")


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
