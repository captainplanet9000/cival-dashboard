from typing import List, Optional, Any
from pydantic import BaseModel, Field

class AgentTaskSummary(BaseModel):
    task_id: str = Field(..., description="Unique identifier for the task.")
    status: str = Field(..., description="Current status of the task (e.g., pending, running, completed, failed).")
    agent_name: Optional[str] = Field(None, description="Name of the agent executing the task, if applicable.")
    crew_name: Optional[str] = Field(None, description="Name of the crew the task belongs to, if applicable.")
    timestamp: str = Field(..., description="Timestamp of the last update to the task, in ISO 8601 format.")
    duration_ms: Optional[float] = Field(None, description="Duration of the task in milliseconds, if completed.")
    result_summary: Optional[str] = Field(None, description="A brief summary of the task's result or error.")
    error_message: Optional[str] = Field(None, description="Detailed error message if the task failed.")

class TaskListResponse(BaseModel):
    tasks: List[AgentTaskSummary] = Field(..., description="A list of agent task summaries.")
    total_tasks: int = Field(..., description="Total number of tasks available.")
    page: Optional[int] = Field(None, description="Current page number, if pagination is used.")
    page_size: Optional[int] = Field(None, description="Number of tasks per page, if pagination is used.")

class DependencyStatus(BaseModel):
    name: str = Field(..., description="Name of the external dependency (e.g., Supabase, Redis, Letta).")
    status: str = Field(..., description="Operational status of the dependency (e.g., operational, degraded, unavailable).")
    details: Optional[str] = Field(None, description="Additional details or error messages related to the dependency's status.")
    last_checked: str = Field(..., description="Timestamp when the dependency status was last checked, in ISO 8601 format.")

class SystemHealthSummary(BaseModel):
    overall_status: str = Field(..., description="Overall health status of the system (e.g., healthy, warning, critical).")
    timestamp: str = Field(..., description="Timestamp when the health summary was generated, in ISO 8601 format.")
    dependencies: List[DependencyStatus] = Field(..., description="A list of statuses for critical external dependencies.")
    system_metrics: Optional[dict[str, Any]] = Field(None, description="Optional dictionary for other system-wide metrics, e.g., CPU load, memory usage.")
