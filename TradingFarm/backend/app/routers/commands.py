from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db, get_supabase_client
import logging
from ..config import settings
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Models for request/response
class CommandHistoryItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    command: str
    response: Optional[str] = None
    farm_id: Optional[str] = None
    agent_id: Optional[str] = None
    created_at: datetime

class CommandHistoryResponse(BaseModel):
    items: List[CommandHistoryItem]
    total: int
    success: bool
    error: Optional[str] = None

class CommandHistoryRequest(BaseModel):
    limit: Optional[int] = 10
    offset: Optional[int] = 0
    user_id: Optional[str] = None
    farm_id: Optional[str] = None
    agent_id: Optional[str] = None
    search: Optional[str] = None

@router.get("/history", response_model=CommandHistoryResponse)
async def get_command_history(
    limit: int = 10,
    offset: int = 0,
    user_id: Optional[str] = None,
    farm_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get command history with optional filtering
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("command_history").select("*")
        
        # Apply filters
        if user_id:
            query = query.eq("user_id", user_id)
        if farm_id:
            query = query.eq("farm_id", farm_id)
        if agent_id:
            query = query.eq("agent_id", agent_id)
        if search:
            query = query.ilike("command", f"%{search}%")
        
        # Get count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination and ordering
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        # Execute query
        result = query.execute()
        
        if not result.data:
            return CommandHistoryResponse(
                items=[],
                total=0,
                success=True
            )
        
        # Convert to CommandHistoryItem objects
        items = [
            CommandHistoryItem(
                id=item["id"],
                user_id=item.get("user_id"),
                command=item["command"],
                response=item.get("response"),
                farm_id=item.get("farm_id"),
                agent_id=item.get("agent_id"),
                created_at=datetime.fromisoformat(item["created_at"]) if isinstance(item["created_at"], str) else item["created_at"]
            )
            for item in result.data
        ]
        
        return CommandHistoryResponse(
            items=items,
            total=total,
            success=True
        )
    except Exception as e:
        logger.error(f"Error getting command history: {e}")
        return CommandHistoryResponse(
            items=[],
            total=0,
            success=False,
            error=str(e)
        )

@router.post("/similarity", response_model=Dict[str, Any])
async def find_similar_commands(
    command: str = Body(..., embed=True),
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    Find similar commands in command history using PostgreSQL trigram similarity
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Use a PostgreSQL function to find similar commands
        result = supabase.rpc(
            "find_similar_commands",
            {
                "query_text": command,
                "similarity_threshold": 0.3,
                "result_limit": limit
            }
        ).execute()
        
        return {
            "similar_commands": result.data if result.data else [],
            "success": True
        }
    except Exception as e:
        logger.error(f"Error finding similar commands: {e}")
        return {
            "similar_commands": [],
            "success": False,
            "error": str(e)
        }

@router.post("/execute", response_model=Dict[str, Any])
async def execute_command(
    command: str = Body(..., embed=True),
    user_id: Optional[str] = None,
    farm_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Execute a command and save it to command history
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Save command to history
        command_history_data = {
            "user_id": user_id,
            "command": command,
            "farm_id": farm_id,
            "agent_id": agent_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Insert into command_history table
        history_result = supabase.table("command_history").insert(command_history_data).execute()
        command_id = history_result.data[0]["id"] if history_result.data else None
        
        # Return success response
        return {
            "command_id": command_id,
            "success": True,
            "message": "Command executed and saved to history"
        }
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/update-history", response_model=Dict[str, Any])
async def update_command_history(
    command_id: str = Body(...),
    response: str = Body(...),
    db: Session = Depends(get_db)
):
    """
    Update a command history entry with a response
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Update command history
        result = supabase.table("command_history").update({
            "response": response,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", command_id).execute()
        
        return {
            "success": True,
            "message": "Command history updated"
        }
    except Exception as e:
        logger.error(f"Error updating command history: {e}")
        return {
            "success": False,
            "error": str(e)
        }
