from supabase import Client as SupabaseClient # Use SupabaseClient alias for clarity
from typing import Dict, Any, Optional, List # Added List for potential future use
import uuid
from datetime import datetime, timezone 
# Corrected relative import path assuming services and models are sibling packages
from ..models.agent_task_models import AgentTask, AgentTaskStatus 
from ..models.monitoring_models import AgentTaskSummary, TaskListResponse

class AgentTaskService:
    def __init__(self, supabase: SupabaseClient):
        self.supabase = supabase

    def create_task(self, user_id: uuid.UUID, task_name: Optional[str] = None, 
                    agent_id: Optional[uuid.UUID] = None, 
                    input_parameters: Optional[Dict[str, Any]] = None) -> AgentTask:
        
        # Construct payload for DB, letting DB handle defaults for task_id, created_at, updated_at
        db_payload: Dict[str, Any] = {
            "user_id": str(user_id), # Ensure UUIDs are strings for DB
            "status": "PENDING", # Default status
        }
        if task_name is not None:
            db_payload["task_name"] = task_name
        if agent_id is not None:
            db_payload["agent_id"] = str(agent_id)
        if input_parameters is not None:
            db_payload["input_parameters"] = input_parameters
            
        response = self.supabase.table("agent_tasks").insert(db_payload).select("*").execute()
        
        if not response.data or (hasattr(response, 'error') and response.error):
            error_msg = response.error.message if hasattr(response, 'error') and response.error else 'No data returned'
            raise Exception(f"Failed to create agent task: {error_msg}")
        
        # Parse DB response back into Pydantic model
        return AgentTask(**response.data[0])

    def update_task_status(self, task_id: uuid.UUID, status: AgentTaskStatus, 
                           results: Optional[Dict[str, Any]] = None, 
                           error_message: Optional[str] = None) -> AgentTask:
        
        update_data: Dict[str, Any] = {"status": status}
        # updated_at is handled by DB trigger, but Pydantic model has default_factory.
        # Explicitly setting it here is fine if needed for application logic before DB commit.
        # For this service, relying on DB trigger for updated_at.
        
        # Set started_at only if status is RUNNING and started_at is not already set
        if status == "RUNNING":
            # Fetch current task to check started_at
            current_task_response = self.supabase.table("agent_tasks").select("started_at").eq("task_id", str(task_id)).single().execute()
            if current_task_response.data and current_task_response.data.get('started_at') is None:
                 update_data["started_at"] = datetime.now(timezone.utc).isoformat()
        
        if status in ["COMPLETED", "FAILED", "CANCELLED"]:
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        if results is not None:
            update_data["results"] = results
        if error_message is not None:
            update_data["error_message"] = error_message
        
        response = self.supabase.table("agent_tasks").update(update_data).eq("task_id", str(task_id)).select("*").execute()
        
        if not response.data or (hasattr(response, 'error') and response.error):
            error_msg = response.error.message if hasattr(response, 'error') and response.error else 'No data returned'
            raise Exception(f"Failed to update agent task {task_id}: {error_msg}")
        
        return AgentTask(**response.data[0])

    def get_task(self, task_id: uuid.UUID) -> Optional[AgentTask]:
        response = self.supabase.table("agent_tasks").select("*").eq("task_id", str(task_id)).execute()
        if response.data:
            return AgentTask(**response.data[0])
        return None

    def list_tasks_for_user(self, user_id: uuid.UUID, limit: int = 20, offset: int = 0) -> List[AgentTask]:
        response = self.supabase.table("agent_tasks") \
            .select("*") \
            .eq("user_id", str(user_id)) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .offset(offset) \
            .execute()
        if response.data:
            return [AgentTask(**item) for item in response.data]
        return []

    # New method for monitoring
    def get_task_summaries(
        self, 
        page: int = 1, 
        page_size: int = 20, 
        status_filter: Optional[List[AgentTaskStatus]] = None,
    ) -> TaskListResponse:
        offset = (page - 1) * page_size

        query_builder = self.supabase.table("agent_tasks").select(
            "task_id, status, task_name, agent_id, created_at, started_at, completed_at, error_message",
            count="exact" 
        )

        if status_filter:
            # Convert AgentTaskStatus enum members to their string values for the query
            status_filter_values = [status.value for status in status_filter]
            query_builder = query_builder.in_("status", status_filter_values)
        
        query_builder = query_builder.order("created_at", desc=True).range(offset, offset + page_size - 1)
        
        response = query_builder.execute()

        if hasattr(response, 'error') and response.error is not None:
            error_message_detail = "Unknown error"
            if hasattr(response.error, 'message'):
                error_message_detail = response.error.message
            elif isinstance(response.error, dict) and 'message' in response.error:
                error_message_detail = response.error['message']
            
            raise Exception(f"Failed to fetch task summaries: {error_message_detail}")

        summaries: List[AgentTaskSummary] = []
        if response.data:
            for item in response.data:
                duration_ms = None
                if item.get("started_at") and item.get("completed_at"):
                    try:
                        start_at_str = item["started_at"]
                        completed_at_str = item["completed_at"]
                        
                        if not isinstance(start_at_str, str):
                           start_at_str = str(start_at_str) 
                        if not isinstance(completed_at_str, str):
                           completed_at_str = str(completed_at_str)

                        start_time = datetime.fromisoformat(start_at_str.replace("Z", "+00:00"))
                        end_time = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00"))
                        duration_ms = (end_time - start_time).total_seconds() * 1000
                    except (ValueError, TypeError):
                        # If parsing fails, leave duration_ms as None
                        pass 

                created_at_val = item.get("created_at")
                timestamp_str: str
                if isinstance(created_at_val, str):
                    # Ensure it's in ISO 8601 format and timezone aware (UTC)
                    dt_obj = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
                    if dt_obj.tzinfo is None:
                        dt_obj = dt_obj.replace(tzinfo=timezone.utc)
                    timestamp_str = dt_obj.isoformat()
                elif isinstance(created_at_val, datetime):
                    if created_at_val.tzinfo is None:
                        created_at_val = created_at_val.replace(tzinfo=timezone.utc)
                    timestamp_str = created_at_val.isoformat()
                else:
                    # Fallback if created_at is missing or not a recognized type
                    timestamp_str = datetime.now(timezone.utc).isoformat()

                summary = AgentTaskSummary(
                    task_id=str(item["task_id"]),
                    status=item["status"],
                    # Use task_name from DB for agent_name in summary as per original code snippet
                    agent_name=item.get("task_name"), 
                    crew_name=None, # crew_name is not directly available in agent_tasks table
                    timestamp=timestamp_str, # Use the processed created_at as the primary timestamp
                    duration_ms=duration_ms,
                    result_summary=None, # result_summary is not directly available
                    error_message=item.get("error_message")
                )
                summaries.append(summary)
        
        total_tasks = response.count if response.count is not None else 0
        
        return TaskListResponse(
            tasks=summaries,
            total_tasks=total_tasks,
            page=page,
            page_size=page_size
        )

    def list_tasks_for_agent(self, agent_id: uuid.UUID, limit: int = 20, offset: int = 0) -> List[AgentTask]:
        response = self.supabase.table("agent_tasks") \
            .select("*") \
            .eq("agent_id", str(agent_id)) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .offset(offset) \
            .execute()
        if response.data:
            return [AgentTask(**item) for item in response.data]
        return []
