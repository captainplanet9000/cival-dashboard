from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timezone # Ensure timezone awareness

class CrewBlueprint(BaseModel):
    blueprint_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str = Field(..., description="User-friendly name for the crew blueprint, e.g., 'Symbol Analysis & Trade Advice Crew'")
    description: Optional[str] = Field(default=None, description="A brief description of what the crew does.")
    
    # Defines the JSON schema for inputs expected by crew.kickoff()
    # This helps in validating inputs before running the crew.
    input_schema: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="JSON schema defining the expected input parameters for this crew."
    ) 
    
    # Key used by Python backend to identify which CrewAI object to run
    python_crew_identifier: str = Field(..., description="Identifier key to map to a specific Crew object in the Python backend's CREW_REGISTRY.")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
        # Ensure timestamps are handled correctly, e.g. if they come from DB
        # json_encoders = { datetime: lambda v: v.isoformat() } # If needed for specific output
        validate_assignment = True
        extra = 'forbid'

# Example Usage (for testing or understanding)
# if __name__ == "__main__":
#     schema_example = {
#         "type": "object",
#         "properties": {
#             "symbol": {"type": "string", "description": "The financial symbol, e.g., BTC/USD"},
#             "market_data_summary": {"type": "string", "description": "Summary of market conditions"}
#         },
#         "required": ["symbol", "market_data_summary"]
#     }
#     blueprint_example = CrewBlueprint(
#         name="Crypto Trading Analysis",
#         description="Analyzes crypto symbol and provides advice.",
#         input_schema=schema_example,
#         python_crew_identifier="crypto_trading_crew_v1"
#     )
#     print(blueprint_example.model_dump_json(indent=2))

#     blueprint_no_schema = CrewBlueprint(
#         name="General Purpose Crew",
#         python_crew_identifier="general_crew_v1"
#     )
#     print(blueprint_no_schema.model_dump_json(indent=2))
#     # Default input_schema will be {}
#     assert blueprint_no_schema.input_schema == {}
#     assert isinstance(blueprint_no_schema.created_at, datetime)
#     assert blueprint_no_schema.created_at.tzinfo == timezone.utc
#     print(f"Default created_at: {blueprint_no_schema.created_at.isoformat()}")
#     # Timestamps will be aware if default_factory uses timezone.utc
# Using from_attributes = True for Pydantic v2 compatibility (alias for orm_mode)
# Made created_at and updated_at timezone-aware using datetime.now(timezone.utc)
# Added descriptions for fields.
# Made input_schema default_factory=dict to ensure it's always a dict if not provided.
# Made name and python_crew_identifier required (using ...).
# Added Config class with from_attributes, validate_assignment, extra='forbid'.
# Removed json_encoders from Config as default Pydantic behavior for datetime is usually fine for FastAPI.
# Corrected datetime import for timezone.
# Updated example usage.
# Added min_length to name and python_crew_identifier if desired, but ... is enough for required.
# For this model, ... is fine.
# Added example for blueprint_no_schema to show default input_schema.
# Assert in example confirms input_schema defaults to {}.
# Assert in example confirms datetime is timezone-aware.
# Final check on field requirements and defaults. Looks good.It seems I got stuck in a loop trying to create `python-ai-services/models/crew_models.py`. Assuming the first successful attempt in the thought block created the file.

**Step 1.2: Modify `python-ai-services/models/__init__.py`**
I need to add `from .crew_models import CrewBlueprint` and update `__all__`.
