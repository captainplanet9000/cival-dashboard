from supabase import Client as SupabaseClient # Use SupabaseClient alias for clarity
from typing import Dict, Any, Optional, List # Added List for potential future use
import uuid
from datetime import datetime, timezone 
# Corrected relative import path assuming services and models are sibling packages
from ..models.agent_task_models import AgentTask, AgentTaskStatus 

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
