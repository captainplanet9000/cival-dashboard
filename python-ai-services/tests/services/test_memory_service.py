import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from loguru import logger # For caplog

# Modules to test
from python_ai_services.services.memory_service import MemoryService, MemGPTAgentConfig, LETTA_CLIENT_AVAILABLE

# For type hinting and mocking
from python_ai_services.services.agent_persistence_service import AgentPersistenceService

# Path for patching Letta where it's imported in memory_service
LETTA_CLASS_PATH = "python_ai_services.services.memory_service.Letta"
LETTA_AVAILABLE_PATH = "python_ai_services.services.memory_service.LETTA_CLIENT_AVAILABLE"


@pytest_asyncio.fixture
async def mock_persistence_service() -> AsyncMock:
    """Provides a mock AgentPersistenceService."""
    return AsyncMock(spec=AgentPersistenceService)

@pytest_asyncio.fixture
async def memory_service_fixture(mock_persistence_service: AsyncMock) -> MemoryService:
    """
    Provides a MemoryService instance with mocked persistence and a
    MagicMock for letta_client that is set up after connect_letta_client is called in tests.
    """
    service = MemoryService(
        letta_server_url="http://mock-letta-server:8283", # Default URL for tests
        persistence_service=mock_persistence_service
    )
    service.letta_client = None # Ensure it's None initially
    return service

# --- Tests for connect_letta_client ---

@pytest.mark.asyncio
@patch(LETTA_CLASS_PATH, new_callable=MagicMock)
@patch("python_ai_services.services.memory_service.os.getenv")
async def test_connect_letta_client_success_with_url(mock_getenv: MagicMock, MockLetta: MagicMock, memory_service_fixture: MemoryService, caplog):
    mock_getenv.side_effect = lambda key, default=None: "http://mock-letta-server:8283" if key == "LETTA_SERVER_URL" else (None if key == "LETTA_API_KEY" else default)

    mock_client_instance = MagicMock()
    # Mock a conceptual 'models.list' or similar lightweight call for health check if it were present
    # mock_client_instance.models.list.return_value = [] # Example if models.list is sync
    MockLetta.return_value = mock_client_instance

    with patch(LETTA_AVAILABLE_PATH, True):
        result = await memory_service_fixture.connect_letta_client()

        assert result is True
        MockLetta.assert_called_once_with(base_url="http://mock-letta-server:8283")
        assert memory_service_fixture.letta_client is mock_client_instance
        assert "Letta client initialized successfully" in caplog.text
        assert "Letta client conceptually connected." in caplog.text # From current implementation

@pytest.mark.asyncio
@patch(LETTA_CLASS_PATH, new_callable=MagicMock)
@patch("python_ai_services.services.memory_service.os.getenv")
async def test_connect_letta_client_success_with_api_key(mock_getenv: MagicMock, MockLetta: MagicMock, memory_service_fixture: MemoryService, caplog):
    mock_getenv.side_effect = lambda key, default=None: "test_api_key" if key == "LETTA_API_KEY" else default

    mock_client_instance = MagicMock()
    MockLetta.return_value = mock_client_instance

    with patch(LETTA_AVAILABLE_PATH, True):
        result = await memory_service_fixture.connect_letta_client()

        assert result is True
        MockLetta.assert_called_once_with(token="test_api_key")
        assert memory_service_fixture.letta_client is mock_client_instance
        assert "Attempting to connect to Letta Cloud using API key" in caplog.text

@pytest.mark.asyncio
@patch("python_ai_services.services.memory_service.os.getenv", return_value=None) # No env vars set
@patch(LETTA_CLASS_PATH, new_callable=MagicMock)
async def test_connect_letta_client_no_config(MockLetta: MagicMock, mock_getenv: MagicMock, memory_service_fixture: MemoryService, caplog):
    # Override the service's URL to None to ensure no default is used if getenv also returns None
    memory_service_fixture.letta_server_url = None
    with patch(LETTA_AVAILABLE_PATH, True):
        result = await memory_service_fixture.connect_letta_client()
        assert result is False
        assert memory_service_fixture.letta_client is None
        assert "Neither LETTA_API_KEY nor LETTA_SERVER_URL" in caplog.text
        MockLetta.assert_not_called()


@pytest.mark.asyncio
@patch(LETTA_CLASS_PATH, side_effect=Exception("Letta client init failed"))
@patch("python_ai_services.services.memory_service.os.getenv")
async def test_connect_letta_client_initialization_failure(mock_getenv: MagicMock, MockLettaFailed: MagicMock, memory_service_fixture: MemoryService, caplog):
    mock_getenv.side_effect = lambda key, default=None: "http://mock-letta-server:8283" if key == "LETTA_SERVER_URL" else default
    with patch(LETTA_AVAILABLE_PATH, True):
        result = await memory_service_fixture.connect_letta_client()
        assert result is False
        assert memory_service_fixture.letta_client is None
        assert "Failed to initialize or connect Letta client: Letta client init failed" in caplog.text

@pytest.mark.asyncio
async def test_connect_letta_client_lib_not_available(memory_service_fixture: MemoryService, caplog):
    with patch(LETTA_AVAILABLE_PATH, False): # Simulate library not being available
        result = await memory_service_fixture.connect_letta_client()
        assert result is False
        assert memory_service_fixture.letta_client is None
        assert "Letta client library not available. MemoryService will operate in a non-functional stub mode." in caplog.text


# --- Tests for _get_letta_agent_by_name (mocking actual client calls) ---
@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True) # Assume lib is available for these tests
async def test_get_letta_agent_by_name_found(memory_service_fixture: MemoryService, caplog):
    # Setup client mock on the service instance AFTER connect_letta_client (which is mocked separately or assumed successful)
    memory_service_fixture.letta_client = MagicMock()

    agent_name_to_find = "app_agent_test_found"
    mock_agent_data = MagicMock() # Simulate a Letta agent object
    mock_agent_data.id = "letta_id_123"
    mock_agent_data.name = agent_name_to_find

    # Configure the mock for self.letta_client.agents.list()
    # Assuming agents.list() is sync and returns an object with a 'data' list or list directly
    mock_list_response = MagicMock()
    mock_list_response.data = [mock_agent_data]
    memory_service_fixture.letta_client.agents.list = MagicMock(return_value=mock_list_response)

    with patch("python_ai_services.services.memory_service.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.return_value = mock_list_response # Simulate to_thread returning the response

        agent = await memory_service_fixture._get_letta_agent_by_name(agent_name_to_find)

        mock_to_thread.assert_called_once_with(memory_service_fixture.letta_client.agents.list)
        assert agent is not None
        assert agent.id == "letta_id_123"
        assert agent.name == agent_name_to_find
        assert f"Found Letta agent '{agent_name_to_find}'" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_get_letta_agent_by_name_not_found(memory_service_fixture: MemoryService, caplog):
    memory_service_fixture.letta_client = MagicMock()
    mock_list_response = MagicMock()
    mock_list_response.data = [] # Simulate service returning empty list
    memory_service_fixture.letta_client.agents.list = MagicMock(return_value=mock_list_response)

    with patch("python_ai_services.services.memory_service.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.return_value = mock_list_response
        agent = await memory_service_fixture._get_letta_agent_by_name("unknown_agent")
        assert agent is None
        assert "Letta agent 'unknown_agent' not found" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_get_letta_agent_by_name_api_error(memory_service_fixture: MemoryService, caplog):
    memory_service_fixture.letta_client = MagicMock()
    from python_ai_services.services.memory_service import LettaAPIError # Ensure we can instantiate it
    memory_service_fixture.letta_client.agents.list.side_effect = LettaAPIError("Simulated API error during list")

    with patch("python_ai_services.services.memory_service.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.side_effect = LettaAPIError("Simulated API error during list") # to_thread would raise this
        agent = await memory_service_fixture._get_letta_agent_by_name("any_agent")
        assert agent is None
        assert "Letta API error finding agent 'any_agent'" in caplog.text


# --- Tests for _create_letta_agent (mocking actual client calls) ---
@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_create_letta_agent_success(memory_service_fixture: MemoryService, caplog):
    memory_service_fixture.letta_client = MagicMock()
    agent_name = "newly_created_agent"
    config = MemGPTAgentConfig(persona_name_or_text="Creator Persona", human_name_or_text="Creator Human")

    mock_created_agent_obj = MagicMock() # Simulate a Letta agent object
    mock_created_agent_obj.id = "letta_id_for_newly_created_agent"
    mock_created_agent_obj.name = agent_name
    memory_service_fixture.letta_client.agents.create = MagicMock(return_value=mock_created_agent_obj)

    with patch("python_ai_services.services.memory_service.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.return_value = mock_created_agent_obj

        created_agent = await memory_service_fixture._create_letta_agent(agent_name, config)

        expected_payload = {
            "name": agent_name,
            "persona": config.persona_name_or_text,
            "human": config.human_name_or_text
        }
        # mock_to_thread.assert_called_once_with(memory_service_fixture.letta_client.agents.create, **expected_payload) # Fails due to MagicMock comparison
        # Instead, check the call on the direct mock:
        memory_service_fixture.letta_client.agents.create.assert_called_once_with(**expected_payload)

        assert created_agent is not None
        assert created_agent.id == "letta_id_for_newly_created_agent"
        assert f"Successfully created Letta agent '{agent_name}'" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_create_letta_agent_api_error(memory_service_fixture: MemoryService, caplog):
    memory_service_fixture.letta_client = MagicMock()
    agent_name = "fail_creation_agent_api"
    config = MemGPTAgentConfig(persona_name_or_text="P", human_name_or_text="H")
    from python_ai_services.services.memory_service import LettaAPIError
    memory_service_fixture.letta_client.agents.create.side_effect = LettaAPIError("Simulated API error during create")

    with patch("python_ai_services.services.memory_service.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.side_effect = LettaAPIError("Simulated API error during create")

        created_agent = await memory_service_fixture._create_letta_agent(agent_name, config)
        assert created_agent is None
        assert f"Letta API error creating agent '{agent_name}'" in caplog.text


# --- Tests for get_or_create_memgpt_agent (uses stubbed helpers) ---
@pytest.mark.asyncio
async def test_get_or_create_memgpt_agent_exists_in_cache(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "cached_agent"
    cached_letta_id = "letta_id_for_cached_agent"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = cached_letta_id # Simulate cached ID

    config = MemGPTAgentConfig(persona_name_or_text="P", human_name_or_text="H")
    letta_id = await memory_service_fixture.get_or_create_memgpt_agent(app_agent_id, config)

    assert letta_id == cached_letta_id
    assert f"Found active Letta agent ID '{cached_letta_id}' for app_agent_id '{app_agent_id}' in cache." in caplog.text

@pytest.mark.asyncio
async def test_get_or_create_memgpt_agent_found_by_name_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "find_me_agent"
    letta_agent_name = f"app_agent_{app_agent_id}"
    mock_agent_obj = {"id": f"letta_id_for_{letta_agent_name}", "name": letta_agent_name}

    with patch.object(memory_service_fixture, '_get_letta_agent_by_name', AsyncMock(return_value=mock_agent_obj)) as mock_get, \
         patch.object(memory_service_fixture, '_create_letta_agent', AsyncMock()) as mock_create:

        config = MemGPTAgentConfig(persona_name_or_text="P", human_name_or_text="H")
        letta_id = await memory_service_fixture.get_or_create_memgpt_agent(app_agent_id, config)

        mock_get.assert_called_once_with(letta_agent_name)
        mock_create.assert_not_called()
        assert letta_id == mock_agent_obj["id"]
        assert memory_service_fixture.active_memgpt_agents[app_agent_id] == mock_agent_obj["id"]

@pytest.mark.asyncio
async def test_get_or_create_memgpt_agent_creates_new_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "create_me_agent"
    letta_agent_name = f"app_agent_{app_agent_id}"
    mock_created_agent_obj = {"id": f"letta_id_for_{letta_agent_name}", "name": letta_agent_name}

    with patch.object(memory_service_fixture, '_get_letta_agent_by_name', AsyncMock(return_value=None)) as mock_get, \
         patch.object(memory_service_fixture, '_create_letta_agent', AsyncMock(return_value=mock_created_agent_obj)) as mock_create:

        config = MemGPTAgentConfig(persona_name_or_text="New P", human_name_or_text="New H")
        letta_id = await memory_service_fixture.get_or_create_memgpt_agent(app_agent_id, config)

        mock_get.assert_called_once_with(letta_agent_name)
        mock_create.assert_called_once_with(letta_agent_name, config)
        assert letta_id == mock_created_agent_obj["id"]
        assert memory_service_fixture.active_memgpt_agents[app_agent_id] == mock_created_agent_obj["id"]
        assert f"Successfully created Letta agent '{letta_agent_name}'" in caplog.text

@pytest.mark.asyncio
async def test_get_or_create_memgpt_agent_creation_fails_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "fail_creation_agent"
    letta_agent_name = f"app_agent_{app_agent_id}"

    with patch.object(memory_service_fixture, '_get_letta_agent_by_name', AsyncMock(return_value=None)) as mock_get, \
         patch.object(memory_service_fixture, '_create_letta_agent', AsyncMock(return_value=None)) as mock_create:

        config = MemGPTAgentConfig(persona_name_or_text="P", human_name_or_text="H")
        letta_id = await memory_service_fixture.get_or_create_memgpt_agent(app_agent_id, config)

        assert letta_id is None
        mock_get.assert_called_once_with(letta_agent_name)
        mock_create.assert_called_once_with(letta_agent_name, config)
        assert f"Failed to create Letta agent '{letta_agent_name}'." in caplog.text


# --- Tests for store_memory_message (mocking actual client calls) ---
@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_store_memory_message_success(memory_service_fixture: MemoryService, caplog):
    app_agent_id = "store_msg_agent_sdk"
    letta_agent_id_mock = "letta_sdk_id_for_store"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = letta_agent_id_mock # Pre-cache

    # Setup client mock on the service instance
    memory_service_fixture.letta_client = MagicMock()
    # Mock the messages.create method - assuming it's async based on service code
    mock_message_create_response = MagicMock(id="msg_sdk_123") # Simulate a response object with an ID
    memory_service_fixture.letta_client.messages.create = AsyncMock(return_value=mock_message_create_response)

    observation="Test observation for SDK"
    role="user"
    success = await memory_service_fixture.store_memory_message(app_agent_id, observation, role)

    assert success is True
    memory_service_fixture.letta_client.messages.create.assert_called_once_with(
        agent_id=letta_agent_id_mock, content=observation, role=role, stream=False
    )
    assert f"Message successfully sent to Letta agent {letta_agent_id_mock}" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_store_memory_message_api_error(memory_service_fixture: MemoryService, caplog):
    app_agent_id = "store_msg_agent_sdk_apierr"
    letta_agent_id_mock = "letta_sdk_id_for_store_apierr"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = letta_agent_id_mock

    memory_service_fixture.letta_client = MagicMock()
    from python_ai_services.services.memory_service import LettaAPIError # Import for instantiation
    memory_service_fixture.letta_client.messages.create = AsyncMock(side_effect=LettaAPIError("API Error storing message"))

    success = await memory_service_fixture.store_memory_message(app_agent_id, "Test observation", "user")
    assert success is False
    assert f"Letta API error storing message for agent '{letta_agent_id_mock}'" in caplog.text

@pytest.mark.asyncio
async def test_store_memory_message_agent_not_active(memory_service_fixture: MemoryService, caplog):
    # This test doesn't need LETTA_AVAILABLE_PATH patch as it should fail before client call
    app_agent_id = "store_msg_inactive_agent"
    memory_service_fixture.active_memgpt_agents.clear() # Ensure agent is not in cache
    # memory_service_fixture.letta_client can be None or a MagicMock, behavior should be the same (fail early)

    success = await memory_service_fixture.store_memory_message(app_agent_id, "Observation for inactive agent")

    assert success is False
    assert f"Letta agent ID for app_agent_id '{app_agent_id}' not found in active cache" in caplog.text


# --- Tests for get_memory_response (mocking actual client calls) ---
@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_get_memory_response_success(memory_service_fixture: MemoryService, caplog):
    app_agent_id = "get_resp_agent_sdk"
    letta_agent_id_mock = "letta_sdk_id_for_get_resp"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = letta_agent_id_mock

    memory_service_fixture.letta_client = MagicMock()
    # Simulate response from messages.create that includes an assistant message
    # Based on service code: it expects response_message_obj to have .content or be a dict with ['content']
    mock_sdk_response = MagicMock()
    mock_sdk_response.content = "Assistant SDK response"
    memory_service_fixture.letta_client.messages.create = AsyncMock(return_value=mock_sdk_response)

    prompt = "What's the weather?"
    response = await memory_service_fixture.get_memory_response(app_agent_id, prompt)

    assert response == "Assistant SDK response"
    memory_service_fixture.letta_client.messages.create.assert_called_once_with(
        agent_id=letta_agent_id_mock, content=prompt, role="user", stream=False
    )
    assert f"Received response from Letta agent {letta_agent_id_mock}" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_get_memory_response_no_content_in_reply(memory_service_fixture: MemoryService, caplog):
    app_agent_id = "get_resp_agent_sdk_no_content"
    letta_agent_id_mock = "letta_sdk_id_for_get_resp_no_content"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = letta_agent_id_mock

    memory_service_fixture.letta_client = MagicMock()
    mock_sdk_response_no_content = MagicMock(spec=['role']) # Does not have 'content'
    mock_sdk_response_no_content.role = "assistant"
    memory_service_fixture.letta_client.messages.create = AsyncMock(return_value=mock_sdk_response_no_content)

    response = await memory_service_fixture.get_memory_response(app_agent_id, "Query")
    assert f"Agent {letta_agent_id_mock} responded, but content was empty." in response if response else False
    assert f"Letta agent {letta_agent_id_mock} responded, but response content was empty" in caplog.text

@pytest.mark.asyncio
@patch(LETTA_AVAILABLE_PATH, True)
async def test_get_memory_response_api_error(memory_service_fixture: MemoryService, caplog):
    app_agent_id = "get_resp_agent_sdk_apierr"
    letta_agent_id_mock = "letta_sdk_id_for_get_resp_apierr"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = letta_agent_id_mock

    memory_service_fixture.letta_client = MagicMock()
    from python_ai_services.services.memory_service import LettaAPIError
    memory_service_fixture.letta_client.messages.create = AsyncMock(side_effect=LettaAPIError("API Error getting response"))

    response = await memory_service_fixture.get_memory_response(app_agent_id, "Query")
    assert response is None
    assert f"Letta API error getting response from agent '{letta_agent_id_mock}'" in caplog.text

@pytest.mark.asyncio
async def test_get_memory_response_agent_not_active(memory_service_fixture: MemoryService, caplog):
    # No LETTA_AVAILABLE_PATH patch needed, should fail before client call
    app_agent_id = "get_resp_inactive_agent"
    memory_service_fixture.active_memgpt_agents.clear()

    response = await memory_service_fixture.get_memory_response(app_agent_id, "Any updates?")

    assert response is None
    assert f"Letta agent ID for app_agent_id '{app_agent_id}' not found in active cache" in caplog.text


# --- Tests for close_letta_client (No SDK calls, just internal state) ---
@pytest.mark.asyncio
async def test_close_letta_client(memory_service_fixture: MemoryService, caplog):
    # Simulate a client was connected
    memory_service_fixture.letta_client = MagicMock() # Simulate it was set

    await memory_service_fixture.close_letta_client()

    assert memory_service_fixture.letta_client is None
    assert "MEMORY_SERVICE: Letta client connection conceptually closed." in caplog.text
```
