import pytest
from pydantic import ValidationError
# Assuming 'python-ai-services' is in PYTHONPATH or tests are run in a way that resolves this:
from python_ai_services.main import CrewBlueprint, LLMParameter, LLMConfig

# Test data
VALID_CREW_BLUEPRINT_DATA = {
    "id": "crew_bp_1",
    "name": "Test Crew",
    "description": "A crew for testing purposes."
}

VALID_LLM_PARAMETER_DATA = {
    "temperature": 0.7,
    "max_tokens": 1000,
    "top_p": 0.9,
    "top_k": 40,
    "frequency_penalty": 0.5,
    "presence_penalty": 0.5
}

VALID_LLM_CONFIG_DATA = {
    "id": "llm_cfg_1",
    "model_name": "test-model-v1",
    "api_key_env_var": "TEST_API_KEY",
    "parameters": VALID_LLM_PARAMETER_DATA
}

# --- Tests for CrewBlueprint ---

def test_crew_blueprint_valid_data():
    """Test CrewBlueprint creation with valid data."""
    bp = CrewBlueprint(**VALID_CREW_BLUEPRINT_DATA)
    assert bp.id == VALID_CREW_BLUEPRINT_DATA["id"]
    assert bp.name == VALID_CREW_BLUEPRINT_DATA["name"]
    assert bp.description == VALID_CREW_BLUEPRINT_DATA["description"]

def test_crew_blueprint_missing_required_fields():
    """Test CrewBlueprint raises ValidationError for missing required fields."""
    with pytest.raises(ValidationError):
        CrewBlueprint(name="Test Crew", description="Desc")  # Missing id
    with pytest.raises(ValidationError):
        CrewBlueprint(id="bp1", description="Desc")  # Missing name
    with pytest.raises(ValidationError):
        CrewBlueprint(id="bp1", name="Test Crew")  # Missing description

def test_crew_blueprint_invalid_types():
    """Test CrewBlueprint raises ValidationError for invalid data types."""
    with pytest.raises(ValidationError):
        CrewBlueprint(id=123, name="Test Crew", description="Desc")  # id as int
    with pytest.raises(ValidationError):
        CrewBlueprint(id="bp1", name=123, description="Desc")  # name as int
    with pytest.raises(ValidationError):
        CrewBlueprint(id="bp1", name="Test Crew", description=True)  # description as bool

# --- Tests for LLMParameter ---

def test_llm_parameter_valid_data_all_fields():
    """Test LLMParameter creation with all fields valid."""
    params = LLMParameter(**VALID_LLM_PARAMETER_DATA)
    assert params.temperature == VALID_LLM_PARAMETER_DATA["temperature"]
    assert params.max_tokens == VALID_LLM_PARAMETER_DATA["max_tokens"]
    assert params.top_p == VALID_LLM_PARAMETER_DATA["top_p"]

def test_llm_parameter_valid_data_optional_missing():
    """Test LLMParameter creation with some optional fields missing."""
    data = {"temperature": 0.8}
    params = LLMParameter(**data)
    assert params.temperature == 0.8
    assert params.max_tokens is None  # Or default if specified in model
    assert params.top_p is None

    params_empty = LLMParameter() # All optional, should be fine
    assert params_empty.temperature is None


def test_llm_parameter_invalid_types():
    """Test LLMParameter raises ValidationError for invalid data types."""
    with pytest.raises(ValidationError):
        LLMParameter(temperature="hot")
    with pytest.raises(ValidationError):
        LLMParameter(max_tokens="one thousand")
    with pytest.raises(ValidationError):
        LLMParameter(top_p="high")
    with pytest.raises(ValidationError):
        LLMParameter(top_k="many")

# --- Tests for LLMConfig ---

def test_llm_config_valid_data():
    """Test LLMConfig creation with valid data."""
    config = LLMConfig(**VALID_LLM_CONFIG_DATA)
    assert config.id == VALID_LLM_CONFIG_DATA["id"]
    assert config.model_name == VALID_LLM_CONFIG_DATA["model_name"]
    assert config.parameters.temperature == VALID_LLM_PARAMETER_DATA["temperature"]

def test_llm_config_missing_required_fields():
    """Test LLMConfig raises ValidationError for missing required fields."""
    with pytest.raises(ValidationError):
        LLMConfig(model_name="test", parameters=VALID_LLM_PARAMETER_DATA)  # Missing id
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", parameters=VALID_LLM_PARAMETER_DATA)  # Missing model_name
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", model_name="test")  # Missing parameters

def test_llm_config_invalid_parameters_type():
    """Test LLMConfig raises ValidationError for invalid parameters structure."""
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", model_name="test", parameters={"temp": 0.7}) # Invalid structure
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", model_name="test", parameters="not a dict")

def test_llm_config_invalid_field_types():
    """Test LLMConfig raises ValidationError for invalid field types."""
    with pytest.raises(ValidationError):
        LLMConfig(id=123, model_name="test", parameters=VALID_LLM_PARAMETER_DATA) # id as int
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", model_name=True, parameters=VALID_LLM_PARAMETER_DATA) # model_name as bool
    with pytest.raises(ValidationError):
        LLMConfig(id="cfg1", model_name="test", api_key_env_var=123, parameters=VALID_LLM_PARAMETER_DATA) # api_key_env_var as int

def test_llm_parameter_all_fields_none():
    """Test LLMParameter creation with all fields explicitly set to None (if allowed by model)."""
    # This test assumes that all fields in LLMParameter are Optional and can be None.
    # If some fields have defaults that are not None, this test might need adjustment
    # or the model definition implies they can be None.
    data = {
        "temperature": None,
        "max_tokens": None,
        "top_p": None,
        "top_k": None,
        "frequency_penalty": None,
        "presence_penalty": None
    }
    params = LLMParameter(**data)
    assert params.temperature is None
    assert params.max_tokens is None
    assert params.top_p is None
    assert params.top_k is None
    assert params.frequency_penalty is None
    assert params.presence_penalty is None

def test_llm_config_api_key_env_var_optional():
    """Test LLMConfig creation when optional api_key_env_var is missing."""
    data_no_api_key = {
        "id": "llm_cfg_2",
        "model_name": "test-model-v2",
        "parameters": VALID_LLM_PARAMETER_DATA
    }
    config = LLMConfig(**data_no_api_key)
    assert config.id == data_no_api_key["id"]
    assert config.api_key_env_var is None # Or default if specified in model
    assert config.parameters.max_tokens == VALID_LLM_PARAMETER_DATA["max_tokens"]

def test_crew_blueprint_extra_fields():
    """Test CrewBlueprint creation with extra fields (should be ignored by default)."""
    data_with_extra = {**VALID_CREW_BLUEPRINT_DATA, "extra_field": "should_be_ignored"}
    bp = CrewBlueprint(**data_with_extra)
    assert bp.id == VALID_CREW_BLUEPRINT_DATA["id"]
    with pytest.raises(AttributeError): # Pydantic models don't store extra fields by default
        _ = bp.extra_field

# To make this runnable with `pytest`, one might need to:
# 1. Ensure `python-ai-services/main.py` and the models within it are importable.
#    This might involve setting PYTHONPATH or running pytest from a project root
#    that recognizes `python_ai_services` as a package.
# 2. Install pytest: `pip install pytest`
# 3. Run pytest from the terminal in the directory containing `python-ai-services`
#    or a higher-level project root.
#    Example: `cd /path/to/project_root && pytest`
#
# If direct import `from python_ai_services.main import ...` fails due to path issues
# in the execution environment, the models might need to be redefined in this test file
# or a conftest.py used to adjust sys.path, but this is beyond what the agent can
# configure in the environment itself.
# For now, assuming the import works.
