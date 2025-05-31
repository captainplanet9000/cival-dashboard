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
    """Provides a MemoryService instance with mocked persistence."""
    service = MemoryService(
        letta_server_url="http://mock-letta-server:8283",
        persistence_service=mock_persistence_service
    )
    # Ensure client is None initially for connect tests
    service.letta_client = None
    return service

# --- Tests for connect_letta_client ---

@pytest.mark.asyncio
@patch(LETTA_CLASS_PATH, new_callable=MagicMock)
async def test_connect_letta_client_success(MockLetta: MagicMock, memory_service_fixture: MemoryService, caplog):
    mock_letta_instance = MagicMock()
    # MockLetta.return_value = mock_letta_instance # Constructor returns the instance
    # Simulate that the constructor itself is the client if LETTA_CLIENT_AVAILABLE is True
    # and that the stubbed Letta class's __init__ is called.
    # The actual Letta class is already stubbed if not available.
    # This test assumes LETTA_CLIENT_AVAILABLE is True for the success path.

    with patch(LETTA_AVAILABLE_PATH, True): # Ensure the test runs as if lib is available
        memory_service_fixture.letta_client = None # Ensure it's reset
        # Re-initialize Letta with a specific mock for this test if the fixture's default isn't enough
        mock_client_instance = MagicMock() # This represents the `Letta()` instance
        MockLetta.return_value = mock_client_instance

        result = await memory_service_fixture.connect_letta_client()

        assert result is True
        MockLetta.assert_called_once_with(base_url="http://mock-letta-server:8283")
        assert memory_service_fixture.letta_client is mock_client_instance
        assert "Successfully connected to Letta server" in caplog.text # From stubbed client behavior or actual if lib was present
        assert "Letta client conceptual health check passed." in caplog.text


@pytest.mark.asyncio
@patch(LETTA_CLASS_PATH, side_effect=Exception("Letta client init failed"))
async def test_connect_letta_client_failure(MockLettaFailed: MagicMock, memory_service_fixture: MemoryService, caplog):
     with patch(LETTA_AVAILABLE_PATH, True):
        result = await memory_service_fixture.connect_letta_client()
        assert result is False
        assert memory_service_fixture.letta_client is None
        assert "Failed to initialize or connect Letta client: Letta client init failed" in caplog.text

@pytest.mark.asyncio
async def test_connect_letta_client_lib_not_available(memory_service_fixture: MemoryService, caplog):
    with patch(LETTA_AVAILABLE_PATH, False):
        result = await memory_service_fixture.connect_letta_client()
        assert result is False
        assert memory_service_fixture.letta_client is None
        assert "Letta client library is not installed. Cannot connect." in caplog.text


# --- Tests for _get_letta_agent_by_name (internal stub logic) ---
# These test the current simple stub implementation.
@pytest.mark.asyncio
async def test_get_letta_agent_by_name_stub_not_found(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client() # Connect stub client

    # Assuming 'nonexistent_agent' isn't in the stub's hardcoded find logic
    # and not in active_memgpt_agents from previous calls in this test.
    memory_service_fixture.active_memgpt_agents.clear() # Ensure cache is clear

    # Patch the client's agent listing method if it's more complex than the current stub
    # For now, the stub _get_letta_agent_by_name relies on its own simple "nonexistent" check.
    # If it were to use self.letta_client.agents.list, that would need patching here.
    # memory_service_fixture.letta_client.agents.list = AsyncMock(return_value=[]) # if it used this

    agent = await memory_service_fixture._get_letta_agent_by_name("nonexistent_agent_name_stub")
    assert agent is None
    assert "STUB: Letta agent 'nonexistent_agent_name_stub' not found." in caplog.text


# --- Tests for _create_letta_agent (internal stub logic) ---
@pytest.mark.asyncio
async def test_create_letta_agent_stub_success(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client() # Connect stub client
    config = MemGPTAgentConfig(persona_name_or_text="Test Persona", human_name_or_text="Test Human")

    agent_details = await memory_service_fixture._create_letta_agent("test_agent_creation_stub", config)

    assert agent_details is not None
    assert agent_details["id"] == "stub_letta_id_for_test_agent_creation_stub"
    assert agent_details["name"] == "test_agent_creation_stub"
    assert "STUB: Successfully created Letta agent 'test_agent_creation_stub'" in caplog.text


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


# --- Tests for store_memory_message (stub interaction) ---
@pytest.mark.asyncio
async def test_store_memory_message_success_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "store_msg_agent"
    # Ensure agent is "active" by pre-populating its ID (as if get_or_create was called)
    memory_service_fixture.active_memgpt_agents[app_agent_id] = "letta_id_for_store_msg_agent"

    success = await memory_service_fixture.store_memory_message(app_agent_id, "Test observation", "user")

    assert success is True
    assert f"Storing message for Letta agent 'letta_id_for_store_msg_agent'" in caplog.text

@pytest.mark.asyncio
async def test_store_memory_message_agent_not_active_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "store_msg_inactive_agent"
    memory_service_fixture.active_memgpt_agents.clear() # Ensure agent is not in cache

    success = await memory_service_fixture.store_memory_message(app_agent_id, "Observation for inactive agent")

    assert success is False
    assert f"No active Letta agent ID found for app_agent_id '{app_agent_id}'" in caplog.text


# --- Tests for get_memory_response (stub interaction) ---
@pytest.mark.asyncio
async def test_get_memory_response_success_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "get_resp_agent"
    memory_service_fixture.active_memgpt_agents[app_agent_id] = "letta_id_for_get_resp_agent"

    prompt = "What was my last observation?"
    response = await memory_service_fixture.get_memory_response(app_agent_id, prompt)

    assert response is not None
    assert f"Stubbed MemGPT response to '{prompt}' for agent {app_agent_id}" in response
    assert f"Sending prompt to Letta agent 'letta_id_for_get_resp_agent'" in caplog.text

@pytest.mark.asyncio
async def test_get_memory_response_agent_not_active_stub(memory_service_fixture: MemoryService, caplog):
    await memory_service_fixture.connect_letta_client()
    app_agent_id = "get_resp_inactive_agent"
    memory_service_fixture.active_memgpt_agents.clear()

    response = await memory_service_fixture.get_memory_response(app_agent_id, "Any updates?")

    assert response is None
    assert f"No active Letta agent ID found for app_agent_id '{app_agent_id}'" in caplog.text


# --- Tests for close_letta_client ---
@pytest.mark.asyncio
async def test_close_letta_client(memory_service_fixture: MemoryService, caplog):
    # First, connect a client to simulate it being active
    with patch(LETTA_CLASS_PATH, new_callable=MagicMock) as MockLetta:
        with patch(LETTA_AVAILABLE_PATH, True):
            mock_client_instance = MagicMock()
            MockLetta.return_value = mock_client_instance
            await memory_service_fixture.connect_letta_client()
            assert memory_service_fixture.letta_client is not None

    await memory_service_fixture.close_letta_client()

    assert memory_service_fixture.letta_client is None
    # The actual stub Letta client doesn't have a close method, so this log comes from MemoryService itself
    assert "Letta client 'closed' (simulated)" in caplog.text
```
