import uuid
from typing import Optional, Dict, Any
from supabase import Client as SupabaseClient
from datetime import datetime, timezone
from logging import getLogger

logger = getLogger(__name__)

class AgentPersistenceError(Exception):
    pass

class AgentStateNotFoundError(AgentPersistenceError):
    pass

class AgentPersistenceService:
    def __init__(self, supabase_client: SupabaseClient):
        self.supabase = supabase_client

    def save_agent_runtime_state(
        self,
        agent_id: str,
        strategy_type: str,
        state: Dict[str, Any],
        memory_references: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not agent_id or not strategy_type:
            raise ValueError("agent_id and strategy_type are required.")

        record = {
            "agent_id": agent_id,
            "strategy_type": strategy_type,
            "state": state,
            "memory_references": memory_references,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            logger.info(f"Saving runtime state for agent_id: {agent_id}")
            # This upsert assumes agent_id has a UNIQUE constraint in agent_states table.
            # If not, it might behave primarily as an insert or fail depending on table setup.
            # It also implies that if 'agent_id' is the conflict target, other fields are updated.
            # Supabase python client upsert needs a 'returning="representation"' for data to be returned
            # and it will return a list.
            response = self.supabase.table("agent_states").upsert(record, on_conflict="agent_id").execute()

            # Check for errors first as per Supabase client behavior
            if hasattr(response, 'error') and response.error:
                err_msg = response.error.message
                logger.error(f"Failed to save/update agent state for {agent_id}. Error: {err_msg}")
                raise AgentPersistenceError(f"Failed to save/update agent state for {agent_id}: {err_msg}")

            if not response.data:
                logger.error(f"Failed to save/update agent state for {agent_id}. No data returned, though no explicit error reported.")
                # This case might indicate an issue with the upsert not returning data as expected
                # or the record not being found/matched for update and no insert happened.
                raise AgentPersistenceError(f"Failed to save/update agent state for {agent_id}: No data returned.")

            return response.data[0]
        except AgentPersistenceError: # Re-raise specific errors
            raise
        except Exception as e:
            logger.exception(f"Database error saving agent state for {agent_id}: {str(e)}") # Log full exception
            raise AgentPersistenceError(f"Database error saving agent state: {str(e)}")

    def load_latest_agent_runtime_state(self, agent_id: str) -> Optional[Dict[str, Any]]:
        if not agent_id:
            raise ValueError("agent_id is required.")
        try:
            logger.info(f"Loading latest runtime state for agent_id: {agent_id}")
            response = self.supabase.table("agent_states") \
                .select("id, agent_id, strategy_type, state, memory_references, created_at, updated_at") \
                .eq("agent_id", agent_id) \
                .order("updated_at", desc=True) \
                .limit(1) \
                .maybe_single() \
                .execute()

            # maybe_single() returns data directly, not a list with one item.
            # No error attribute check needed for maybe_single if it returns None for no data.
            # However, if execute() itself can have an error (network etc.), that should be checked.
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error loading latest agent state for {agent_id}: {response.error.message}")
                raise AgentPersistenceError(f"Error loading latest agent state for {agent_id}: {response.error.message}")

            return response.data # This will be None if no record found, or the dict if found
        except AgentPersistenceError: # Re-raise specific errors
            raise
        except Exception as e:
            logger.exception(f"Database error loading latest agent state for {agent_id}: {str(e)}")
            raise AgentPersistenceError(f"Database error loading agent state: {str(e)}")

    def load_agent_runtime_state_by_id(self, state_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        if not state_id:
            raise ValueError("state_id is required.")
        try:
            logger.info(f"Loading runtime state for state_id: {state_id}")
            response = self.supabase.table("agent_states") \
                .select("id, agent_id, strategy_type, state, memory_references, created_at, updated_at") \
                .eq("id", str(state_id)) \
                .maybe_single() \
                .execute()

            if hasattr(response, 'error') and response.error:
                logger.error(f"Error loading agent state by ID {state_id}: {response.error.message}")
                raise AgentPersistenceError(f"Error loading agent state by ID {state_id}: {response.error.message}")

            return response.data
        except AgentPersistenceError: # Re-raise specific errors
            raise
        except Exception as e:
             logger.exception(f"Database error loading agent state by ID {state_id}: {str(e)}")
             raise AgentPersistenceError(f"Database error loading agent state by ID: {str(e)}")

    def update_specific_agent_runtime_state(
        self,
        state_id: uuid.UUID,
        new_state: Optional[Dict[str, Any]] = None,
        new_memory_references: Optional[Dict[str, Any]] = None,
        new_strategy_type: Optional[str] = None
    ) -> Dict[str, Any]:
        if not state_id:
            raise ValueError("state_id is required for updating.")

        update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if new_state is not None:
            update_fields["state"] = new_state
        if new_memory_references is not None:
            update_fields["memory_references"] = new_memory_references
        if new_strategy_type is not None:
            update_fields["strategy_type"] = new_strategy_type

        if len(update_fields) == 1 and "updated_at" in update_fields: # Only updated_at is present
            raise ValueError("No fields provided to update for agent state other than timestamp.")

        try:
            logger.info(f"Updating specific runtime state for state_id: {state_id}")
            response = self.supabase.table("agent_states") \
                .update(update_fields) \
                .eq("id", str(state_id)) \
                .execute() # For update, select() or returning='representation' might be needed if data is expected

            if hasattr(response, 'error') and response.error:
                err_msg = response.error.message
                logger.error(f"Failed to update agent state for ID {state_id}. Error: {err_msg}")
                # Distinguish between "not found" (if possible from error details) and other errors
                # For now, using AgentPersistenceError as a general update failure
                raise AgentPersistenceError(f"Failed to update agent state for ID {state_id}: {err_msg}")

            if not response.data: # Upsert/Insert/Update might not return data by default in older supabase-py versions
                                  # or if returning='minimal' (default for update)
                logger.warning(f"Agent state update for ID {state_id} reported success but returned no data. "
                                "This might be normal if 'returning' was not 'representation'. "
                                "To confirm update, re-fetch the state or ensure DB schema/query returns data.")
                # To adhere to return type, we might need to fetch the record or change supabase call.
                # For now, returning the input fields that were meant for update along with state_id.
                # This is a practical approach if the DB operation itself doesn't return the full new state.
                # However, the prompt expects Dict[str, Any] which implies the updated record.
                # The .execute() on update in supabase-py v1 returns a list of dicts if successful and data is selected.
                # If it's empty, it means no rows matched the filter or nothing was returned.
                # Let's assume if no error and no data, the row was not found.
                raise AgentStateNotFoundError(f"Agent state with ID {state_id} not found for update, or update returned no data.")

            return response.data[0]
        except AgentStateNotFoundError: # Re-raise specific errors
            raise
        except AgentPersistenceError:
            raise
        except Exception as e:
            logger.exception(f"Database error updating specific agent state for ID {state_id}: {str(e)}")
            raise AgentPersistenceError(f"Database error updating specific agent state: {str(e)}")
