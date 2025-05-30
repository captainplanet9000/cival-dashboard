from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timezone # Ensure timezone is imported
import uuid

AgentTaskStatus = Literal[
    "PENDING", 
    "RUNNING", 
    "COMPLETED", 
    "FAILED", 
    "CANCELLED", 
    "AWAITING_APPROVAL" # Added new status
]

class AgentTask(BaseModel):
    task_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    agent_id: Optional[uuid.UUID] = None 
    user_id: uuid.UUID 
    task_name: Optional[str] = None 
    status: AgentTaskStatus = "PENDING"
    input_parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    # Using default_factory with timezone.utc for timezone-aware datetimes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) 
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        # orm_mode = True # Deprecated in Pydantic v2
        from_attributes = True # For Pydantic v2, enables ORM mode
        use_enum_values = True # To store enum values as strings
        populate_by_name = True # Allows using field names or aliases for population

    # Ensure updated_at is set on modification (Pydantic v2 way)
    # This is more for application logic using the model. DB trigger handles DB updates.
    # For direct model updates in code before saving, this can be useful.
    # However, the service class will handle setting updated_at directly.
    # @model_validator(mode='before')
    # def set_updated_at_on_modification(cls, values):
    #     if 'status' in values: # Example: update if status changes
    #         values['updated_at'] = datetime.now(timezone.utc)
    #     return values
