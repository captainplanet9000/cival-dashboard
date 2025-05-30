from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from supabase import create_client as create_supabase_client
import os
from typing import Optional, List, Dict, Any 
from dotenv import load_dotenv
import uuid
import json 
from datetime import datetime, timezone 
from pydantic import ValidationError # For parsing ProposedTradeSignal explicitly

# AG-UI Event Imports
from ag_ui_protocol.events import (
    RunStarted, RunFinished, RunError, 
    StepStarted, StepFinished,
    TextMessageStart, TextMessageContent, TextMessageEnd
)
# Local Imports
from websocket_server import schedule_broadcast
from callbacks.agui_crew_callback_handler import AgUiCrewCallbackHandler

from models.api_models import (
    CrewRunRequest, CrewRunResponse, 
    CreateAgentApiPayload, UpdateAgentApiPayload, TradingAgentDetailsResponse,
    AgentMemoryResponseItem
)
from models.base_models import ProposedTradeSignal # Changed from TradeSignal
from services.agent_task_service import AgentTaskService
from services.simulated_trade_executor import SimulatedTradeExecutor
from services.agent_service import (
    AgentService, 
    AgentRecordNotFoundError, 
    AgentConfigValidationError,
    UserFundingWalletError, 
    StrategyNotFoundError,  
    InsufficientFundsError, 
    AgentRecordCreationError, 
    AgentWalletCreationError, 
    AgentWalletLinkError,     
    AgentFundingError,        
    AgentActivationError,     
    AgentUpdateError          
)
from services.vault_service import VaultService
from services.memory_service import MemoryService, MemoryInitializationError 
from agents.trading_crew import trading_crew as default_trading_crew 
from crewai import Crew 
from agents.crew_llm_config import get_llm, ERROR_MSG as LLM_ERROR_MSG, get_available_llm_identifiers
from models.agent_task_models import AgentTask, AgentTaskStatus # Ensure AgentTaskStatus is available
from models.crew_models import CrewBlueprint 
import logging

# --- Crew Registry ---
CREW_REGISTRY: Dict[str, Crew] = {
    "default_trading_crew": default_trading_crew,
}
# --- End Crew Registry ---

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class AppAgentServiceError(Exception): # Renamed from AgentServiceError to avoid conflict with service's own base error
    pass

load_dotenv()
app = FastAPI(title="Python AI Services API - CrewAI Extension")

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_client = None
agent_task_service: Optional[AgentTaskService] = None
simulated_trade_executor: Optional[SimulatedTradeExecutor] = None
vault_service_instance: Optional[VaultService] = None
agent_service_instance: Optional[AgentService] = None

if not supabase_url or not supabase_key:
    logger.critical("Supabase URL or Key not configured. Services will not be available.")
else:
    try:
        supabase_client = create_supabase_client(supabase_url, supabase_key)
        agent_task_service = AgentTaskService(supabase=supabase_client, logger=logger)
        simulated_trade_executor = SimulatedTradeExecutor(supabase_url, supabase_key)
        vault_service_instance = VaultService(supabase_client=supabase_client, logger=logger)
        if vault_service_instance: # vault_service_instance must be valid to pass to AgentService
            agent_service_instance = AgentService(supabase_client=supabase_client, vault_service=vault_service_instance, logger=logger)
        else: # Should not happen if VaultService init is not failing
            logger.error("VaultService could not be initialized, AgentService will not be available.")

        logger.info("Supabase client and core services initialized.")
        if not agent_service_instance: # Log if agent service didn't init
            logger.warning("AgentService not initialized (likely due to VaultService failure).")

    except Exception as e:
        logger.error(f"CRITICAL: Failed to initialize Supabase client or services: {e}", exc_info=True)

# --- Agent Task / Crew Run Endpoints ---
def _emit_agui_thought(thread_id_for_agui: str, run_id: str, thought_content: str):
    timestamp = datetime.now(timezone.utc).isoformat()
    msg_id = str(uuid.uuid4())
    try:
        content_str = json.dumps(thought_content) if not isinstance(thought_content, str) else thought_content
        schedule_broadcast(thread_id_for_agui, TextMessageStart(messageId=msg_id, role="assistant", runId=run_id, threadId=thread_id_for_agui, timestamp=timestamp).model_dump_json())
        schedule_broadcast(thread_id_for_agui, TextMessageContent(messageId=msg_id, delta=content_str, runId=run_id, threadId=thread_id_for_agui, timestamp=timestamp).model_dump_json())
        schedule_broadcast(thread_id_for_agui, TextMessageEnd(messageId=msg_id, runId=run_id, threadId=thread_id_for_agui, timestamp=timestamp).model_dump_json())
    except Exception as e:
        logger.error(f"Error emitting AG-UI thought for run {run_id}: {e}", exc_info=True)

def run_crew_background(task_id: uuid.UUID, crew_to_run: Crew, crew_inputs: Dict[str, Any], user_id_str: str, blueprint_name: str):
    run_id = str(task_id)
    thread_id_for_agui = str(task_id)
    timestamp_start = datetime.now(timezone.utc).isoformat()
    logger.info(f"Background task {run_id} for blueprint '{blueprint_name}' started with inputs: {crew_inputs}")

    if not agent_task_service:
        logger.error(f"AgentTaskService not initialized. Cannot update task {run_id}.")
        return

    try:
        schedule_broadcast(thread_id_for_agui, RunStarted(runId=run_id, threadId=thread_id_for_agui, timestamp=timestamp_start).model_dump_json())
        _emit_agui_thought(thread_id_for_agui, run_id, f"Crew run {run_id} for blueprint '{blueprint_name}' started. Inputs: {crew_inputs}. User ID: {user_id_str}")

        llm_instance = get_llm() # Raises EnvironmentError if not configured
        if not crew_to_run: # Check if selected_crew is valid
            raise AppAgentServiceError(f"Crew '{blueprint_name}' not available for task {run_id}.")

        agent_task_service.update_task_status(task_id, AgentTaskStatus.RUNNING)
        
        step_crew_execution = f"CrewExecution_{blueprint_name}"
        schedule_broadcast(thread_id_for_agui, StepStarted(runId=run_id, stepName=step_crew_execution, timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
        _emit_agui_thought(thread_id_for_agui, run_id, f"Kicking off Crew '{blueprint_name}' with inputs: {crew_inputs}")
        agui_callback = AgUiCrewCallbackHandler(run_id=run_id, thread_id=thread_id_for_agui, logger=logger)
        crew_result_raw = crew_to_run.kickoff(inputs=crew_inputs, callbacks=[agui_callback])
        _emit_agui_thought(thread_id_for_agui, run_id, f"CrewAI kickoff complete. Raw result: {crew_result_raw}")
        schedule_broadcast(thread_id_for_agui, StepFinished(runId=run_id, stepName=step_crew_execution, timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
        
        final_result_data = {"raw_crew_output": str(crew_result_raw)}
        parsed_proposal: Optional[ProposedTradeSignal] = None
        current_task_status: AgentTaskStatus = AgentTaskStatus.FAILED
        error_message_for_task: Optional[str] = None

        if crew_result_raw:
            step_result_parsing = "ResultParsing"
            schedule_broadcast(thread_id_for_agui, StepStarted(runId=run_id, stepName=step_result_parsing, timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
            try:
                parsed_dict = {}
                if isinstance(crew_result_raw, dict): parsed_dict = crew_result_raw
                elif isinstance(crew_result_raw, str):
                    cleaned_str = crew_result_raw.strip()
                    if cleaned_str.startswith("```json"): cleaned_str = cleaned_str[7:-3]
                    elif cleaned_str.startswith("```"): cleaned_str = cleaned_str[3:-3] # Handle case where only one set of backticks
                    parsed_dict = json.loads(cleaned_str.strip())
                else: raise ValueError("Unexpected result type from crew.")

                if 'action' in parsed_dict and isinstance(parsed_dict['action'], str):
                    parsed_dict['action'] = parsed_dict['action'].upper()
                
                parsed_proposal = ProposedTradeSignal(**parsed_dict)
                final_result_data["proposed_trade_signal"] = parsed_proposal.model_dump(mode='json')
                _emit_agui_thought(thread_id_for_agui, run_id, f"Successfully parsed ProposedTradeSignal: {final_result_data['proposed_trade_signal']}")
                schedule_broadcast(thread_id_for_agui, StepFinished(runId=run_id, stepName=step_result_parsing, output=final_result_data["proposed_trade_signal"], timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())

                if parsed_proposal.action in ["BUY", "SELL"]:
                    current_task_status = AgentTaskStatus.AWAITING_APPROVAL
                    agent_task_service.update_task_status(task_id, current_task_status, results=final_result_data)
                    custom_event_payload = {"type": "custom", "name": "trade.approval.required", "runId": run_id, "threadId": thread_id_for_agui, "timestamp": datetime.now(timezone.utc).isoformat(), "value": parsed_proposal.model_dump(mode='json')}
                    schedule_broadcast(thread_id_for_agui, json.dumps(custom_event_payload))
                    return # Stop further processing in this background task; wait for HIL
                else: # HOLD or other
                    current_task_status = AgentTaskStatus.COMPLETED
            except (ValidationError, json.JSONDecodeError, ValueError) as e:
                error_message_for_task = f"Result parsing error: {e}"
                logger.error(f"{error_message_for_task}. Raw: {crew_result_raw}", exc_info=True)
                _emit_agui_thought(thread_id_for_agui, run_id, f"Error parsing crew result. Raw: {crew_result_raw}. Error: {error_message_for_task}")
                schedule_broadcast(thread_id_for_agui, StepFinished(runId=run_id, stepName=step_result_parsing, error_message=error_message_for_task, timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
                current_task_status = AgentTaskStatus.FAILED
        else: # No crew_result_raw
            _emit_agui_thought(thread_id_for_agui, run_id, "Crew finished with no output.")
            final_result_data["message"] = "Crew finished with no specific output."
            current_task_status = AgentTaskStatus.COMPLETED 

        agent_task_service.update_task_status(task_id, current_task_status, results=final_result_data, error_message=error_message_for_task)
        if current_task_status == AgentTaskStatus.FAILED:
            schedule_broadcast(thread_id_for_agui, RunError(runId=run_id, threadId=thread_id_for_agui, message=error_message_for_task or "Unknown error.", code="CREW_FAILED", timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
        else:
            schedule_broadcast(thread_id_for_agui, RunFinished(runId=run_id, threadId=thread_id_for_agui, timestamp=datetime.now(timezone.utc).isoformat(), result=final_result_data).model_dump_json())

    except (AppAgentServiceError, EnvironmentError) as e: # Catch setup errors for LLM/Crew
        error_message = str(e)
        logger.error(f"Setup error during crew execution for task {run_id}: {error_message}", exc_info=True)
        if agent_task_service: agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message=error_message)
        schedule_broadcast(thread_id_for_agui, RunError(runId=run_id, threadId=thread_id_for_agui, message=error_message, code="CREW_SETUP_ERROR", timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())
    except Exception as e: # Catch all other unexpected errors
        error_message = str(e)
        logger.error(f"Unexpected error during crew execution for task {run_id}: {error_message}", exc_info=True)
        if agent_task_service: agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message=error_message)
        schedule_broadcast(thread_id_for_agui, RunError(runId=run_id, threadId=thread_id_for_agui, message=error_message, code="UNKNOWN_EXECUTION_ERROR", timestamp=datetime.now(timezone.utc).isoformat()).model_dump_json())

@app.post("/crew/run_trading_analysis", response_model=CrewRunResponse)
async def trigger_crew_run(crew_request: CrewRunRequest, background_tasks: BackgroundTasks):
    if not supabase_client or not agent_task_service: raise HTTPException(status_code=503, detail="Core services (Supabase/AgentTaskService) not available.")
    if not supabase_client: raise HTTPException(status_code=503, detail="Supabase client not available for blueprint fetching.")
    try: get_llm()
    except EnvironmentError as e:
        logger.error(f"LLM configuration error: {LLM_ERROR_MSG}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"LLM not available: {LLM_ERROR_MSG}")

    logger.info(f"Received request to run crew blueprint: {crew_request.blueprint_id}, user: {crew_request.user_id}, inputs: {crew_request.inputs}")
    try: task_user_id = uuid.UUID(crew_request.user_id)
    except ValueError:
        logger.warning(f"Invalid user_id format: {crew_request.user_id}", exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid user_id format.")

    try:
        blueprint_resp = supabase_client.table("crew_blueprints").select("*").eq("blueprint_id", str(crew_request.blueprint_id)).single().execute()
        if not blueprint_resp.data: raise HTTPException(status_code=404, detail=f"CrewBlueprint with ID {crew_request.blueprint_id} not found.")
        blueprint = CrewBlueprint(**blueprint_resp.data)
    except Exception as e:
        logger.error(f"Failed to fetch or parse CrewBlueprint {crew_request.blueprint_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not retrieve crew blueprint: {e}")

    selected_crew = CREW_REGISTRY.get(blueprint.python_crew_identifier)
    if not selected_crew:
        logger.error(f"Crew with identifier '{blueprint.python_crew_identifier}' not found in CREW_REGISTRY for blueprint {blueprint.blueprint_id}.")
        raise HTTPException(status_code=501, detail=f"Crew '{blueprint.name}' is not implemented or configured in the backend.")
    
    # TODO: Validate crew_request.inputs against blueprint.input_schema
    new_task = agent_task_service.create_task(user_id=task_user_id, task_name=f"Crew Run: {blueprint.name}", input_parameters=crew_request.model_dump())
    background_tasks.add_task(run_crew_background, task_id=new_task.task_id, crew_to_run=selected_crew, crew_inputs=crew_request.inputs, user_id_str=crew_request.user_id, blueprint_name=blueprint.name)
    return CrewRunResponse(task_id=new_task.task_id, status="PENDING", message=f"Crew run for '{blueprint.name}' initiated.")

# Agent CRUD, Memory, Task Status, Cancel, Config Endpoints... (Keep existing ones)
# ... (previous Agent CRUD, Memory, Task Status, Cancel, Config endpoints remain here) ...

# --- HIL Approval Endpoints ---
@app.post("/tasks/{task_id}/approve_trade", response_model=AgentTask)
async def approve_trade_signal(task_id: uuid.UUID, user_id: str = Query(...)):
    if not agent_task_service or not simulated_trade_executor or not supabase_client or not agent_service_instance:
        raise HTTPException(status_code=503, detail="Core services not available.")
    
    try: user_uuid = uuid.UUID(user_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid user_id format.")

    task = agent_task_service.get_task(task_id)
    if not task: raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    if task.user_id != user_uuid: raise HTTPException(status_code=403, detail="User not authorized for this task.")
    if task.status != AgentTaskStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=400, detail=f"Task is not awaiting approval (current status: {task.status}).")

    if not task.results or "proposed_trade_signal" not in task.results:
        agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message="Proposed trade signal missing from task results during approval.")
        raise HTTPException(status_code=400, detail="No proposed trade signal found in task results.")

    try:
        proposed_signal_dict = task.results["proposed_trade_signal"]
        if isinstance(proposed_signal_dict.get("timestamp"), str):
            proposed_signal_dict["timestamp"] = datetime.fromisoformat(proposed_signal_dict["timestamp"].replace("Z", "+00:00"))
        proposed_signal = ProposedTradeSignal(**proposed_signal_dict)

        if not task.agent_id: 
            agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message="Agent ID missing in task, cannot execute trade.")
            raise HTTPException(status_code=500, detail="Agent ID not found in task, cannot determine trade quantity.")
        
        agent_details = agent_service_instance.get_agent_details(agent_id=task.agent_id, user_id=user_uuid)
        if not agent_details:
             agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message=f"User {user_uuid} not authorized for agent {task.agent_id}.")
             raise HTTPException(status_code=403, detail=f"User not authorized to command agent {task.agent_id}.")

        agent_config_params = agent_details.get('configuration_parameters', {})
        quantity_to_trade = float(agent_config_params.get('quantity', 1.0)) 

        trade_execution_result = simulated_trade_executor.execute_trade(
            agent_id=str(task.agent_id), user_id=str(user_uuid), symbol=proposed_signal.symbol,
            direction=proposed_signal.action, quantity=quantity_to_trade, price=proposed_signal.execution_price,
            strategy_id=task.task_name, 
            notes=f"Trade executed after HIL approval for task {task_id}. Proposal ID: {proposed_signal.signal_id}. Rationale: {proposed_signal.rationale}"
        )
        
        updated_results = task.results.copy()
        updated_results["simulated_trade_outcome"] = trade_execution_result
        
        final_status = AgentTaskStatus.COMPLETED if trade_execution_result.get("status") != "failed" else AgentTaskStatus.FAILED
        error_msg = trade_execution_result.get("reason") if final_status == AgentTaskStatus.FAILED else None
        
        updated_task = agent_task_service.update_task_status(task_id, final_status, results=updated_results, error_message=error_msg)

        _emit_agui_thought(str(task_id), str(task_id), f"Trade approved and executed. Outcome: {trade_execution_result.get('status')}")
        custom_event_name = "trade.executed" if final_status == AgentTaskStatus.COMPLETED else "trade.execution_failed"
        custom_event_payload = {"type": "custom", "name": custom_event_name, "runId": str(task_id), "threadId": str(task_id), "timestamp": datetime.now(timezone.utc).isoformat(), "value": trade_execution_result}
        schedule_broadcast(str(task_id), json.dumps(custom_event_payload))
        schedule_broadcast(str(task_id), RunFinished(runId=str(task_id), threadId=str(task_id), timestamp=datetime.now(timezone.utc).isoformat(), result=updated_results).model_dump_json())
        return updated_task
    except Exception as e:
        logger.error(f"Error during trade approval for task {task_id}: {e}", exc_info=True)
        if agent_task_service: agent_task_service.update_task_status(task_id, AgentTaskStatus.FAILED, error_message=f"Error during trade approval: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing trade approval: {str(e)}")

@app.post("/tasks/{task_id}/reject_trade", response_model=AgentTask)
async def reject_trade_signal(task_id: uuid.UUID, user_id: str = Query(...)):
    if not agent_task_service: raise HTTPException(status_code=503, detail="AgentTaskService not available.")
    try: user_uuid = uuid.UUID(user_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid user_id format.")

    task = agent_task_service.get_task(task_id)
    if not task: raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    if task.user_id != user_uuid: raise HTTPException(status_code=403, detail="User not authorized for this task.")
    if task.status != AgentTaskStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=400, detail=f"Task is not awaiting approval (current status: {task.status}).")

    try:
        rejection_reason = "Trade proposal rejected by user."
        updated_results = task.results.copy() if task.results else {}
        if "proposed_trade_signal" in updated_results:
             updated_results["proposed_trade_signal"]["approval_status"] = "REJECTED" 
             updated_results["proposed_trade_signal"]["rejection_timestamp"] = datetime.now(timezone.utc).isoformat()
        updated_results["trade_rejection"] = {"reason": rejection_reason, "timestamp": datetime.now(timezone.utc).isoformat()}
        
        updated_task = agent_task_service.update_task_status(task_id, AgentTaskStatus.COMPLETED, results=updated_results, error_message=rejection_reason)

        _emit_agui_thought(str(task_id), str(task_id), rejection_reason)
        custom_event_payload = {"type": "custom", "name": "trade.rejected", "runId": str(task_id), "threadId": str(task_id), "timestamp": datetime.now(timezone.utc).isoformat(), "value": {"reason": rejection_reason}}
        schedule_broadcast(str(task_id), json.dumps(custom_event_payload))
        schedule_broadcast(str(task_id), RunFinished(runId=str(task_id), threadId=str(task_id), timestamp=datetime.now(timezone.utc).isoformat(), result=updated_results).model_dump_json())
        return updated_task
    except Exception as e:
        logger.error(f"Error during trade rejection for task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing trade rejection: {str(e)}")

# --- Agent Memory Endpoint ---
@app.get("/agents/{agent_id_context}/memory", response_model=List[AgentMemoryResponseItem])
async def get_agent_memories_endpoint(agent_id_context: uuid.UUID, user_id: str = Query(...), query: Optional[str] = Query("*"), limit: Optional[int] = Query(20, ge=1, le=100)):
    if not supabase_client: raise HTTPException(status_code=503, detail="Core services not available.")
    try:
        user_uuid = uuid.UUID(user_id)
        if agent_service_instance:
            agent_details = agent_service_instance.get_agent_details(agent_id=agent_id_context, user_id=user_uuid)
            if not agent_details: raise HTTPException(status_code=404, detail=f"Agent {agent_id_context} not found or user not authorized.")
        else: raise HTTPException(status_code=503, detail="Agent service is not available for authorization.")
    except ValueError:
        logger.warning(f"Invalid user_id format for get_agent_memories: {user_id}", exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid user_id format.")
    except AgentRecordNotFoundError:
         raise HTTPException(status_code=404, detail=f"Agent {agent_id_context} not found or user not authorized.")
    except Exception as auth_e:
        logger.error(f"Authorization error for agent {agent_id_context}, user {user_id}: {auth_e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error during agent authorization.")

    try:
        memory_service = MemoryService(user_id=user_uuid, agent_id_context=agent_id_context)
        memories_data = await memory_service.list_memories(query=query, limit=limit)
        return memories_data
    except MemoryInitializationError as mem_init_e:
        logger.error(f"MemoryService initialization failed for agent {agent_id_context}: {mem_init_e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Memory service not available for agent {agent_id_context}: {str(mem_init_e)}")
    except Exception as e:
        logger.error(f"Error fetching memories for agent {agent_id_context}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching memories: {str(e)}")

# --- Task Status and Cancellation Endpoints ---
@app.post("/tasks/{task_id}/cancel", response_model=AgentTask)
async def cancel_agent_task(task_id: uuid.UUID, user_id: str = Query(...)):
    if not agent_task_service: raise HTTPException(status_code=503, detail="AgentTaskService not available.")
    try: user_uuid = uuid.UUID(user_id)
    except ValueError:
        logger.warning(f"Invalid user_id format for cancel_agent_task: {user_id}", exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid user_id format.")
    task = agent_task_service.get_task(task_id)
    if not task: raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    if task.user_id != user_uuid:
        logger.warning(f"User {user_uuid} not authorized to cancel task {task_id} owned by {task.user_id}.")
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found or not authorized.")
    if task.status not in [AgentTaskStatus.PENDING, AgentTaskStatus.RUNNING, AgentTaskStatus.AWAITING_APPROVAL]: # Added AWAITING_APPROVAL
        logger.info(f"Attempt to cancel task {task_id} which is already in terminal state: {task.status}.")
        raise HTTPException(status_code=400, detail=f"Task is already in a terminal or non-cancellable state: {task.status}")
    try:
        error_msg_for_cancel = "Task cancelled by user."
        cancelled_task = agent_task_service.update_task_status(task_id, AgentTaskStatus.CANCELLED, error_message=error_msg_for_cancel)
        timestamp = datetime.now(timezone.utc).isoformat()
        run_id = str(task_id); thread_id_for_agui = str(task_id)
        _emit_agui_thought(thread_id_for_agui, run_id, f"Task cancellation requested. Status set to CANCELLED.")
        schedule_broadcast(thread_id_for_agui, RunError(runId=run_id, threadId=thread_id_for_agui, message=error_msg_for_cancel, code="USER_CANCELLED", timestamp=timestamp).model_dump_json())
        if not cancelled_task:
            logger.error(f"Failed to update task {task_id} to CANCELLED after passing checks.")
            raise HTTPException(status_code=500, detail="Failed to update task status to cancelled.")
        return cancelled_task
    except Exception as e:
        logger.error(f"Unexpected error cancelling task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while cancelling the task: {str(e)}")

@app.get("/tasks/{task_id}", response_model=Optional[AgentTask])
async def get_agent_task_status(task_id: uuid.UUID, user_id: Optional[str] = Query(None)):
    if not agent_task_service: raise HTTPException(status_code=503, detail="AgentTaskService not available.")
    if not user_id: raise HTTPException(status_code=400, detail="user_id query parameter is required.")
    try: user_uuid = uuid.UUID(user_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid user_id format.")
    task = agent_task_service.get_task(task_id=task_id)
    if task:
        if task.user_id != user_uuid:
            raise HTTPException(status_code=403, detail="User not authorized to access this task or task not found.")
        return task
    else: raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

# --- Configuration Endpoints ---
@app.get("/config/llms", response_model=List[str])
async def list_available_llms_endpoint():
    try: return get_available_llm_identifiers()
    except Exception as e:
        logger.error(f"Error fetching available LLMs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve available LLMs.")

@app.get("/crew-blueprints", response_model=List[CrewBlueprint])
async def list_crew_blueprints_endpoint():
    if not supabase_client: raise HTTPException(status_code=503, detail="Supabase client not available.")
    try:
        response = supabase_client.table("crew_blueprints").select("*").order("name").execute()
        if response.error:
            logger.error(f"Supabase error fetching crew_blueprints: {response.error.message}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch crew blueprints: {response.error.message}")
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching crew blueprints: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# --- Root Endpoint ---
@app.get("/")
async def root():
    llm_status = "OK"
    if LLM_ERROR_MSG: llm_status = f"Error: {LLM_ERROR_MSG}"
    elif not get_llm(): llm_status = "Not initialized or error during init."
    return {"message": "Python AI Services with CrewAI is running.", "supabase_client_initialized": supabase_client is not None, "agent_task_service_initialized": agent_task_service is not None, "llm_status": llm_status}
    
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PYTHON_API_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)