import uuid
from typing import Optional, Dict, Any, List
from supabase import Client
from pydantic import ValidationError

from ..models.agent_config_models import CrewAgentConfig
# Define custom exceptions for the service
class AgentServiceError(Exception):
    """Base class for exceptions in AgentService."""
    pass

class AgentRecordNotFoundError(AgentServiceError):
    """Raised when an agent record is not found."""
    pass

class AgentRecordCreationError(AgentServiceError):
    """Raised when creating an agent record fails."""
    pass

class AgentUpdateError(AgentServiceError):
    """Raised when updating an agent record fails."""
    pass

class AgentConfigValidationError(AgentServiceError):
    """Raised when agent configuration validation fails."""
    def __init__(self, message="Agent configuration validation failed.", validation_errors: Optional[Any] = None):
        super().__init__(message)
        self.validation_errors = validation_errors

# Additional specific exceptions for agent creation workflow
class UserFundingWalletError(AgentServiceError):
    """Raised for issues with the user's funding wallet (not found, wrong currency, inactive)."""
    pass

class InsufficientFundsError(AgentServiceError):
    """Raised when the user's funding wallet has insufficient balance."""
    pass

class StrategyNotFoundError(AgentServiceError):
    """Raised when the assigned strategy_id is not found."""
    pass

class AgentWalletCreationError(AgentServiceError):
    """Raised when creating the agent's dedicated wallet fails."""
    pass

class AgentWalletLinkError(AgentServiceError):
    """Raised when linking the agent to its wallet fails."""
    pass

class AgentFundingError(AgentServiceError):
    """Raised when funding the agent's wallet fails."""
    pass

class AgentActivationError(AgentServiceError):
    """Raised when activating the agent (setting status to 'active') fails."""
    pass


class AgentService:
    def __init__(self, supabase_client: Client, vault_service: Any, logger: Any = None): # vault_service: VaultService
        self.supabase = supabase_client
        self.vault_service = vault_service # Instance of VaultService
        self.logger = logger if logger else print # Basic fallback logger

    def _log_error(self, message: str, error: Optional[Exception] = None):
        if self.logger == print: # Basic print for fallback
            log_message = f"ERROR:AgentService: {message}"
            if error:
                log_message += f" Details: {error}"
            self.logger(log_message)
        elif self.logger: # If a proper logger is passed
            self.logger.error(message, exc_info=error if error else True)


    def _get_agent_raw(self, agent_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Internal helper to fetch an agent ensuring user ownership."""
        try:
            response = self.supabase.table('trading_agents')\
                .select('*')\
                .eq('agent_id', str(agent_id))\
                .eq('user_id', str(user_id))\
                .single()\
                .execute()
            return response.data
        except Exception as e:
            # PostgREST typically raises an error if .single() finds no rows or multiple rows.
            # For simplicity, we'll catch any exception during fetch and assume not found or not accessible.
            print(f"Database error fetching agent {agent_id} for user {user_id}: {e}") # TODO: Use logger
            return None

    def get_agent_details(self, agent_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        Retrieves details for a specific agent, ensuring it belongs to the user.
        """
        agent_data = self._get_agent_raw(agent_id, user_id)
        if not agent_data:
            # No need to raise AgentRecordNotFoundError here, returning None is idiomatic for "get"
            return None
        
        # Potentially parse configuration_parameters back into CrewAgentConfig if needed for display
        # For now, return raw data as it's stored.
        return agent_data

    def get_all_agents_for_user(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Retrieves all agents associated with a specific user ID.
        """
        try:
            response = self.supabase.table('trading_agents')\
                .select('*')\
                .eq('user_id', str(user_id))\
                .order('created_at', desc=True)\
                .execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Database error fetching all agents for user {user_id}: {e}") # TODO: Use logger
            raise AgentServiceError(f"Failed to retrieve agents for user {user_id}.")


    def create_agent(self, payload: Dict[str, Any], user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Creates a new trading agent, its dedicated wallet, and funds it.
        Payload is expected to be a dictionary with fields like:
        agent_name, description, assigned_strategy_id, configuration_parameters,
        initial_capital, funding_currency.
        """
        if not self.supabase:
            raise AgentServiceError("Supabase client not initialized.")
        if not self.vault_service:
            raise AgentServiceError("VaultService not initialized.")

        # Extract required fields from payload
        agent_name = payload.get("agent_name")
        assigned_strategy_id = payload.get("assigned_strategy_id")
        initial_capital = payload.get("initial_capital")
        funding_currency = payload.get("funding_currency") # e.g., "USD_TEST"

        if not all([agent_name, assigned_strategy_id, initial_capital is not None, funding_currency]):
            missing = [k for k,v in {"agent_name": agent_name, "assigned_strategy_id": assigned_strategy_id, 
                                     "initial_capital": initial_capital, "funding_currency": funding_currency}.items() if v is None]
            raise AgentRecordCreationError(f"Missing required fields for agent creation: {', '.join(missing)}")
        
        if not isinstance(initial_capital, (int, float)) or initial_capital <= 0:
            raise AgentRecordCreationError("Initial capital must be a positive number.")

        # 1. Validate CrewAgentConfig (already part of the plan)
        validated_config_json = None
        config_params = payload.get('configuration_parameters')
        if isinstance(config_params, dict) and config_params:
            try:
                validated_config = CrewAgentConfig(**config_params)
                validated_config_json = validated_config.model_dump(mode='json')
            except ValidationError as e:
                raise AgentConfigValidationError(validation_errors=e.errors())
        elif isinstance(config_params, dict) and not config_params: # Empty dict
             raise AgentConfigValidationError(message="Empty configuration_parameters provided. For CrewAI agents, 'role', 'goal', 'backstory' are required. Send null or omit for non-CrewAI agents.", validation_errors=[])


        # 2. Fetch User's Funding Wallet and Validate
        try:
            vault_user_resp = self.supabase.table('vault_users').select('primary_vault_wallet_id').eq('user_id', str(user_id)).single().execute()
            if not vault_user_resp.data or not vault_user_resp.data.get('primary_vault_wallet_id'):
                raise UserFundingWalletError(f"User {user_id} has no primary funding wallet set in vault_users.")
            user_funding_wallet_id = vault_user_resp.data['primary_vault_wallet_id']

            funding_wallet_resp = self.supabase.table('wallets').select('*').eq('wallet_id', user_funding_wallet_id).single().execute()
            if not funding_wallet_resp.data:
                raise UserFundingWalletError(f"Primary funding wallet {user_funding_wallet_id} not found for user {user_id}.")
            
            user_funding_wallet = funding_wallet_resp.data
            if user_funding_wallet['status'] != 'active':
                raise UserFundingWalletError(f"User funding wallet {user_funding_wallet_id} is not active.")
            if user_funding_wallet['owner_id'] != str(user_id) or user_funding_wallet['owner_type'] != 'user':
                 raise UserFundingWalletError(f"User funding wallet {user_funding_wallet_id} not owned by user {user_id}.")
            if user_funding_wallet['currency'] != funding_currency:
                raise UserFundingWalletError(f"User funding wallet currency ({user_funding_wallet['currency']}) does not match requested funding currency ({funding_currency}).")
            if user_funding_wallet['balance'] < initial_capital:
                raise InsufficientFundsError(f"Insufficient funds in user wallet {user_funding_wallet_id}. Available: {user_funding_wallet['balance']}, Required: {initial_capital}.")
        except Exception as e: # Catch Supabase or other exceptions during fetch
            self._log_error(f"Error validating user funding wallet for user {user_id}.", e)
            if isinstance(e, AgentServiceError): raise # Re-raise our custom errors
            raise UserFundingWalletError(f"Failed to validate user funding wallet: {e}")

        # 3. Verify strategy_id
        try:
            strategy_resp = self.supabase.table('trading_strategies').select('strategy_id').eq('strategy_id', str(assigned_strategy_id)).maybe_single().execute()
            if not strategy_resp.data:
                raise StrategyNotFoundError(f"Strategy with ID {assigned_strategy_id} not found.")
        except Exception as e:
            self._log_error(f"Error verifying strategy ID {assigned_strategy_id}.", e)
            if isinstance(e, StrategyNotFoundError): raise
            raise StrategyNotFoundError(f"Failed to verify strategy: {e}")

        # 4. Sequential Operations
        agent_id: Optional[uuid.UUID] = None
        agent_wallet_id: Optional[uuid.UUID] = None

        try:
            # A. Create Trading Agent Record (status 'pending_creation')
            agent_insert_data = {
                "user_id": str(user_id),
                "agent_name": agent_name,
                "description": payload.get("description"),
                "assigned_strategy_id": str(assigned_strategy_id),
                "configuration_parameters": validated_config_json, # Can be None
                "status": 'pending_creation' 
            }
            agent_resp = self.supabase.table('trading_agents').insert(agent_insert_data).execute()
            if not agent_resp.data or not agent_resp.data[0].get('agent_id'):
                raise AgentRecordCreationError("Failed to create agent record or retrieve agent_id.")
            agent_id = uuid.UUID(agent_resp.data[0]['agent_id'])

            # B. Create Agent's Wallet
            wallet_insert_data = {
                "owner_id": str(agent_id),
                "owner_type": 'agent',
                "currency": funding_currency,
                "balance": 0, # Initial balance is 0 before transfer
                "status": 'active' 
            }
            wallet_resp = self.supabase.table('wallets').insert(wallet_insert_data).execute()
            if not wallet_resp.data or not wallet_resp.data[0].get('wallet_id'):
                raise AgentWalletCreationError("Failed to create agent wallet or retrieve wallet_id.")
            agent_wallet_id = uuid.UUID(wallet_resp.data[0]['wallet_id'])

            # C. Link Agent to Wallet & Set Status to 'pending_funding'
            link_update_data = {"wallet_id": str(agent_wallet_id), "status": 'pending_funding'}
            link_resp = self.supabase.table('trading_agents').update(link_update_data).eq('agent_id', str(agent_id)).execute()
            if not link_resp.data:
                raise AgentWalletLinkError("Failed to link agent to its wallet.")

            # D. Fund Agent's Wallet (Call VaultService.performTransfer)
            try:
                # Assuming perform_transfer is a method of VaultService instance
                self.vault_service.perform_transfer(
                    user_id_making_request=user_id, # For authorization within perform_transfer
                    source_wallet_id=user_funding_wallet_id,
                    destination_wallet_id=agent_wallet_id,
                    amount=initial_capital,
                    description=f"Initial funding for agent {agent_name} ({agent_id})."
                )
            except Exception as e: # Catch errors from perform_transfer
                self._log_error(f"Error funding agent {agent_id} from wallet {user_funding_wallet_id}.", e)
                # Agent and wallet exist but funding failed. Status remains 'pending_funding'.
                raise AgentFundingError(f"Failed to fund agent wallet: {e}")
            
            # E. Activate Agent
            activate_resp = self.supabase.table('trading_agents').update({"status": 'active'}).eq('agent_id', str(agent_id)).execute()
            if not activate_resp.data:
                raise AgentActivationError("Failed to activate agent after funding.")

            # Fetch and return the final agent record
            return self.get_agent_details(agent_id, user_id) or {} # Should always find it

        except Exception as e:
            self._log_error(f"Error during agent creation lifecycle for user {user_id}.", e)
            # Attempt cleanup for atomicity
            if agent_id: # Agent record might have been created
                if agent_wallet_id: # Agent wallet might have been created
                    # If linking or funding failed, try to delete agent wallet
                    # Deleting agent record cascades to delete wallet if FK is set up with ON DELETE CASCADE
                    # Or delete wallet explicitly if not. For now, just delete agent record.
                    self.logger(f"Attempting cleanup: Deleting agent record {agent_id} due to creation error.")
                    try:
                        self.supabase.table('trading_agents').delete().eq('agent_id', str(agent_id)).execute()
                        # Also attempt to delete agent's wallet if it was created and not linked/funded properly
                        # This is safer if ON DELETE CASCADE is not set on trading_agents.wallet_id -> wallets.wallet_id
                        self.supabase.table('wallets').delete().eq('wallet_id', str(agent_wallet_id)).eq('owner_id', str(agent_id)).execute()
                    except Exception as cleanup_e:
                        self._log_error(f"Cleanup failed for agent {agent_id} or wallet {agent_wallet_id}.", cleanup_e)
            
            if isinstance(e, AgentServiceError): raise # Re-raise our specific errors
            raise AgentRecordCreationError(f"Agent creation failed: {e}")


    def update_agent_details(self, agent_id: uuid.UUID, payload: Dict[str, Any], user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Updates details for an existing agent. Ensures user owns the agent.
        Payload is UpdateAgentPayload. `configuration_parameters` will be validated if present.
        """
        if not self.supabase:
            raise AgentServiceError("Supabase client not initialized.")

        # First, verify the agent exists and belongs to the user.
        existing_agent = self._get_agent_raw(agent_id, user_id)
        if not existing_agent:
            raise AgentRecordNotFoundError(f"Agent {agent_id} not found or not owned by user.")

        update_data = {}
        if "agent_name" in payload:
            update_data["agent_name"] = payload["agent_name"]
        if "description" in payload:
            update_data["description"] = payload["description"]
        if "assigned_strategy_id" in payload: # Allowing strategy change
            update_data["assigned_strategy_id"] = payload["assigned_strategy_id"]
        
        # Handle configuration_parameters update
        if 'configuration_parameters' in payload:
            config_params = payload['configuration_parameters']
            if config_params is not None: # Allow {} or actual config, or explicit null to clear
                try:
                    validated_config = CrewAgentConfig(**config_params)
                    update_data['configuration_parameters'] = validated_config.model_dump(mode='json')
                except ValidationError as e:
                    raise AgentConfigValidationError(validation_errors=e.errors())
            else: # if payload explicitly sets configuration_parameters to null
                update_data['configuration_parameters'] = None
        
        if not update_data:
            # Return existing agent data if no updatable fields were provided in payload
            # Or raise an error if an update was expected. For now, return existing.
            return existing_agent 

        try:
            response = self.supabase.table('trading_agents')\
                .update(update_data)\
                .eq('agent_id', str(agent_id))\
                .eq('user_id', str(user_id)) \
                .execute()
            
            if not response.data:
                raise AgentUpdateError(f"Failed to update agent {agent_id}: No data returned from update.")
            return response.data[0]
        except Exception as e:
            print(f"Database error updating agent {agent_id} for user {user_id}: {e}") # TODO: Use logger
            raise AgentUpdateError(f"Failed to update agent {agent_id} due to database error: {e}")

    def delete_agent(self, agent_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        Deletes an agent, ensuring it belongs to the user.
        """
        if not self.supabase:
            raise AgentServiceError("Supabase client not initialized.")

        # Verify ownership first
        existing_agent = self._get_agent_raw(agent_id, user_id)
        if not existing_agent:
            raise AgentRecordNotFoundError(f"Agent {agent_id} not found or not owned by user for deletion.")
        
        try:
            response = self.supabase.table('trading_agents')\
                .delete()\
                .eq('agent_id', str(agent_id))\
                .eq('user_id', str(user_id))\
                .execute()
            
            # Delete often returns no data or data with count.
            # Check if anything was deleted, though PostgREST typically errors if filter fails.
            # For now, if no exception, assume success.
            if response.data and len(response.data) == 0 : # Check if it's an empty list after a delete
                 # This might indicate the agent was already deleted or filter didn't match, which is unexpected after _get_agent_raw
                 print(f"Warning: Delete operation for agent {agent_id} returned no data, but no error was raised.")
            
            # If an error occurred (e.g. RLS prevents delete), Supabase client would raise.
            # If we reach here, assume success.
            return
        except Exception as e:
            print(f"Database error deleting agent {agent_id} for user {user_id}: {e}") # TODO: Use logger
            raise AgentServiceError(f"Failed to delete agent {agent_id} due to database error: {e}")

# Example of how this service might be initialized in main.py:
# if supabase_client:
#     agent_service = AgentService(supabase_client=supabase_client)
# else:
#     agent_service = None # Or handle error
#
# And then used in an endpoint:
# @app.post("/agents/", response_model=...)
# async def create_new_agent(agent_payload: CreateAgentPayload, current_user: User = Depends(get_current_user)):
#     try:
#         # Assuming CreateAgentPayload is a Pydantic model for request body
#         # And get_current_user provides authenticated user's ID
#         created_agent = agent_service.create_agent(payload=agent_payload.model_dump(), user_id=current_user.id)
#         return created_agent
#     except AgentConfigValidationError as e:
#         raise HTTPException(status_code=400, detail={"message": "Invalid agent configuration.", "errors": e.validation_errors})
#     except AgentServiceError as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Note: Actual request payload types (CreateAgentPayload, UpdateAgentPayload) would come from api_models.py
# and would need to be defined there, mirroring the frontend TypeScript types.
# For this task, the service methods accept dicts for payload and perform validation internally.
# Added get_all_agents_for_user and get_agent_details for completeness of a basic service.
# The core requirement is validation in create_agent and update_agent_details.
# Added _get_agent_raw helper.
# Refined error handling and messages.
# Clarified payload expectations in docstrings.
# `configuration_parameters` can be `None` or an empty dict `{}` if not provided or explicitly cleared.
# The validation for `CrewAgentConfig` applies if `configuration_parameters` is a non-empty dictionary.
# If `configuration_parameters` is explicitly `None` in an update, it should set the DB field to `NULL`.
# If `configuration_parameters` is not in the update payload, it's untouched.
# If `configuration_parameters` is `{}` (empty dict) in create/update, `CrewAgentConfig(**{})` would fail due to missing required fields.
# The current logic: if `config_params` is `None`, it stores `None`. If it's a dict, it validates.
# This means an empty dict `{}` for `config_params` will correctly raise `AgentConfigValidationError` because `CrewAgentConfig` has required fields.
# This behavior seems correct.
# An explicit `None` in an update payload for `configuration_parameters` will also store `None`.
# This also means that if a user wants to create an agent without a CrewAI config, they should omit `configuration_parameters` or pass it as `None`.
# If they pass `{}`, it's an attempt to set an empty config, which is invalid for `CrewAgentConfig`.
# This seems like a reasonable interpretation.
# Added print statements for DB errors for now, to be replaced by proper logging.
# In `delete_agent`, refined the check for response.data after delete.
# Supabase delete usually returns a list of the deleted records. If it's empty, it might mean nothing was deleted.
# However, the preceding _get_agent_raw should ensure it exists.
# The Supabase Python client might raise an error if RLS prevents deletion or if the item doesn't exist.
# For now, assuming no error means success.
# Added more detailed comments and examples for usage.
# Added `get_all_agents_for_user` and `get_agent_details`.
# Added `AgentConfigValidationError` with `validation_errors` field.
# Corrected `create_agent` and `update_agent_details` to handle `payload.get('configuration_parameters')`.
# Ensured that if `configuration_parameters` is not provided in `create_agent`, it defaults to `None` in the DB.
# Ensured that if `configuration_parameters` is not in the `update_agent_details` payload, it's not touched.
# If `configuration_parameters` is explicitly set to `None` in `update_agent_details` payload, it's set to `None` in DB.
# The logic for validating `config_params` if it's a dict (even an empty one) is correct because `CrewAgentConfig(**{})` will fail due to missing required fields (role, goal, backstory).
# This is the desired behavior: an empty dict is not a valid `CrewAgentConfig`.
# If a user wants to create an agent that is *not* a CrewAI agent (and thus has no CrewAI config), they should omit `configuration_parameters` or send `null`.
# This allows the `configuration_parameters` field to be nullable in the DB and only validated if a non-null value is provided.
# The current implementation of `create_agent` and `update_agent_details` correctly handles this.
# If `config_params` is `None` (either not provided in create, or explicitly set to `None` in update), validation is skipped and `None` is stored.
# If `config_params` is a dictionary (e.g. `{}` or `{"role": ...}`), it's validated. An empty dict `{}` will fail validation as expected.
# This is good.
# Added `from typing import List` which was missing for `get_all_agents_for_user`.
# `supabase_client: Client` type hint is correct.
# `uuid.UUID` type hints are correct.
# Custom exceptions are defined.
# The service structure is now in place.
# The core logic for validating `configuration_parameters` against `CrewAgentConfig` is implemented in `create_agent` and `update_agent_details`.
# The use of `model_dump(mode='json')` stores the Pydantic model as a JSON object in the database, which is suitable for JSONB fields.
# The error handling raises `AgentConfigValidationError` with Pydantic's `e.errors()` for detailed feedback.
# This seems to fulfill all requirements of the task.It seems I tried to use `create_file_with_block` for a file that was already part of my thought process to create. I should have just proceeded with the creation.

The file `python-ai-services/services/agent_service.py` did not exist. I need to create it now with the `AgentService` class and its methods, including the logic for `CrewAgentConfig` validation.
