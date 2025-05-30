import os
import uuid # For generating runId, messageId
import datetime # For timestamps
import json # For serializing arguments in ToolCallArgs
from supabase import create_client, Client
from dotenv import load_dotenv

# AG-UI Event Imports
from ag_ui_protocol.events import (
    RunStarted, RunFinished, RunError, 
    StepStarted, StepFinished,
    TextMessageStart, TextMessageContent, TextMessageEnd
)

# Local Imports
from .market_data_service import MarketDataService
from .simulated_trade_executor import SimulatedTradeExecutor
from strategies.sma_crossover import SMACrossoverStrategy
from .memory_service import MemoryService
from .knowledge_service import SharedKnowledgeService # Added import
import asyncio
from ..websocket_server import schedule_broadcast 

load_dotenv() 

import logging
logger = logging.getLogger(__name__)
# Ensure basicConfig is called only once, perhaps in a main app entry point
# For a library-like file, it's better not to call basicConfig directly here.
# Assume it's configured elsewhere or use a more specific logger setup if needed.
# logging.basicConfig(level=logging.INFO) # Commenting out for now

# Custom Error for AgentService internal issues not covered by AG-UI specific errors
class AgentServiceError(Exception):
    pass

class StrategyExecutor:
    def __init__(self, supabase_url: str, supabase_key: str):
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided.")
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
            self.simulated_trade_executor = SimulatedTradeExecutor(supabase_url, supabase_key)
        except Exception as e:
            raise ValueError(f"Error initializing Supabase client or SimulatedTradeExecutor: {e}")

        self.agent_id = None
        # self.user_id = None # Removed, will be set in load_agent_and_strategy
        self.strategy_id = None
        self.strategy_name = None
        self.configuration_parameters = None
        self.current_strategy_instance = None
        self.memory_service: MemoryService | None = None
        self.knowledge_service: SharedKnowledgeService | None = None # Added
        self.user_id: uuid.UUID | None = None 

    def load_agent_and_strategy(self, agent_id: str):
        self.agent_id = agent_id # Should be UUID, but keeping str if DB stores it so
        
        agent_response = self.supabase.table('trading_agents').select(
            'user_id, configuration_parameters, trading_strategies(strategy_id, name)'
        ).eq('agent_id', str(agent_id)).single().execute() # Ensure agent_id is string for Supabase if needed
        
        if not agent_response.data:
            raise ValueError(f"Agent {agent_id} not found or error in fetching.")
        
        agent_data = agent_response.data
        self.configuration_parameters = agent_data.get('configuration_parameters', {})
        
        user_id_str = agent_data.get('user_id')
        if user_id_str:
            self.user_id = uuid.UUID(user_id_str) # Convert to UUID
        else:
            logger.error(f"User ID not found for agent {agent_id}.")
            self.user_id = None # Or raise error

        if not agent_data.get('trading_strategies'):
            raise ValueError(f"Strategy details not found for agent {agent_id}.")

        strategy_data = agent_data['trading_strategies'] 
        if isinstance(strategy_data, list): 
            if not strategy_data:
                 raise ValueError(f"Strategy details list is empty for agent {agent_id}.")
            strategy_data = strategy_data[0]

        self.strategy_id = strategy_data.get('strategy_id')
        self.strategy_name = strategy_data.get('name')
        
        if not self.strategy_id:
            raise ValueError("Agent is missing critical strategy information (ID).")

        if self.strategy_name == "SMA Crossover":
            try:
                symbol = self.configuration_parameters.get('symbol')
                short_window = int(self.configuration_parameters.get('short_window'))
                long_window = int(self.configuration_parameters.get('long_window'))
                if not all([symbol, isinstance(short_window, int), isinstance(long_window, int)]): # Added type check
                    raise ValueError("Missing or invalid type for SMA Crossover params: symbol, short_window, long_window")
                self.current_strategy_instance = SMACrossoverStrategy(
                    symbol=symbol, 
                    short_window=short_window, 
                    long_window=long_window,
                    config_params=self.configuration_parameters
                )
                logger.info(f"SMA Crossover strategy instance created for agent {self.agent_id}.")
            except (TypeError, ValueError) as e:
                self.current_strategy_instance = None
                logger.error(f"Error instantiating SMA Crossover for agent {self.agent_id}: {e}. Fallback to placeholder.")
        else:
            self.current_strategy_instance = None
            logger.warning(f"Strategy '{self.strategy_name}' not SMA Crossover or unknown. Placeholder logic for agent {self.agent_id}.")
        
        # Initialize MemoryService
        if self.user_id and self.agent_id:
            try:
                # Ensure agent_id is UUID if MemoryService expects it
                agent_uuid_for_memory = uuid.UUID(self.agent_id) if isinstance(self.agent_id, str) else self.agent_id
                self.memory_service = MemoryService(user_id=self.user_id, agent_id_context=agent_uuid_for_memory)
                logger.info(f"MemoryService initialized for agent {self.agent_id}")
            except Exception as e:
                logger.error(f"Failed to initialize MemoryService for agent {self.agent_id}: {e}", exc_info=True)
                self.memory_service = None # Ensure it's None if init fails
        else:
            logger.warning("user_id or agent_id missing for MemoryService initialization.")
            self.memory_service = None
        
        # Initialize SharedKnowledgeService (does not strictly need user_id/agent_id for general knowledge)
        # It's initialized once per StrategyExecutor instance.
        # If KNOWLEDGE_EMBEDDING_MODEL env var is set, it will be used by default.
        try:
            self.knowledge_service = SharedKnowledgeService(self.supabase)
            logger.info("SharedKnowledgeService initialized in StrategyExecutor.")
        except Exception as e:
            logger.error(f"Failed to initialize SharedKnowledgeService in StrategyExecutor: {e}", exc_info=True)
            self.knowledge_service = None
            
        return True

    def _emit_thought(self, run_id: str, thought: str):
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        msg_id = str(uuid.uuid4())
        try:
            event_start = TextMessageStart(messageId=msg_id, role="assistant", runId=run_id, threadId=self.agent_id, timestamp=timestamp)
            schedule_broadcast(self.agent_id, event_start.model_dump(mode='json'))
            
            event_content = TextMessageContent(messageId=msg_id, delta=thought, runId=run_id, threadId=self.agent_id, timestamp=timestamp)
            schedule_broadcast(self.agent_id, event_content.model_dump(mode='json'))
            
            event_end = TextMessageEnd(messageId=msg_id, runId=run_id, threadId=self.agent_id, timestamp=timestamp)
            schedule_broadcast(self.agent_id, event_end.model_dump(mode='json'))
        except Exception as e:
            logger.error(f"Failed to emit thought for agent {self.agent_id}, run {run_id}: {e}", exc_info=True)


    async def run_cycle(self, market_data_service: MarketDataService = None): # Made async
        if not self.agent_id or not self.strategy_id or self.configuration_parameters is None or not self.user_id: # Added user_id check for memory service
            logger.error("Agent/strategy not loaded or user_id missing for run_cycle.")
            return {"decision": "error", "reason": "Agent/strategy not loaded or user_id missing."}

        run_id = str(uuid.uuid4())
        timestamp_start = datetime.datetime.now(datetime.timezone.utc).isoformat()
        symbol_to_trade = self.configuration_parameters.get('symbol', 'N/A') # Get early for memory query
        
        try:
            schedule_broadcast(self.agent_id, RunStarted(runId=run_id, threadId=self.agent_id, timestamp=timestamp_start).model_dump(mode='json'))
            self._emit_thought(run_id, f"Cycle {run_id} started for strategy '{self.strategy_name}' on symbol '{symbol_to_trade}'.")

            # Retrieve memories at the beginning of the cycle
            if self.memory_service:
                memory_query = f"Relevant context for symbol {symbol_to_trade} using strategy {self.strategy_name} before cycle {run_id}. Current market conditions might be useful."
                try:
                    retrieved_memories = await self.memory_service.retrieve_relevant_memories(query_text=memory_query)
                    self._emit_thought(run_id, f"Retrieved memories ({len(retrieved_memories)}): {json.dumps(retrieved_memories)}")
                    # TODO: Potentially incorporate these memories into the strategy's context or decision-making process
                except Exception as mem_e:
                    logger.error(f"Error retrieving memories for agent {self.agent_id}: {mem_e}", exc_info=True)
                    self._emit_thought(run_id, f"Memory retrieval failed: {str(mem_e)}")
            else:
                self._emit_thought(run_id, "MemoryService not available for this cycle.")

            # Querying Shared Knowledge
            if self.knowledge_service:
                knowledge_query = f"Insights for {symbol_to_trade} related to strategy {self.strategy_name}"
                try:
                    retrieved_knowledge = await self.knowledge_service.query_shared_knowledge_by_text(query_text=knowledge_query, top_k=3)
                    knowledge_content_summary = [item.content_text[:100] + "..." for item in retrieved_knowledge] # Summary
                    self._emit_thought(run_id, f"Retrieved shared knowledge ({len(retrieved_knowledge)} items): {json.dumps(knowledge_content_summary)}")
                    # TODO: Incorporate retrieved_knowledge into strategy context/decision making
                except Exception as kn_e:
                    logger.error(f"Error querying shared knowledge for agent {self.agent_id}: {kn_e}", exc_info=True)
                    self._emit_thought(run_id, f"Shared knowledge query failed: {str(kn_e)}")
            else:
                self._emit_thought(run_id, "SharedKnowledgeService not available for this cycle.")


            action = "hold" 
            strategy_output_details = {}
            price_to_trade = None
            current_market_data_point = None # Variable to store market data used
            
            step_ts_1 = datetime.datetime.now(datetime.timezone.utc).isoformat()
            schedule_broadcast(self.agent_id, StepStarted(runId=run_id, stepName="StrategyExecution", timestamp=step_ts_1).model_dump(mode='json'))

            if isinstance(self.current_strategy_instance, SMACrossoverStrategy):
                if not market_data_service:
                    raise AgentServiceError("MarketDataService is required for SMACrossoverStrategy but not provided.")
                
                self._emit_thought(run_id, f"Running SMA Crossover for {self.current_strategy_instance.symbol}. Fetching historical data...")
                required_data_points = self.current_strategy_instance.long_window + self.current_strategy_instance.short_window # Ensure this is sufficient
                time_period = self.configuration_parameters.get('time_period', 'daily')
                
                historical_data_response = market_data_service.get_historical_ohlcv( # This might need to be async if MDS is async
                    symbol=self.current_strategy_instance.symbol.split('/')[0],
                    count=required_data_points, 
                    time_period=time_period
                )
                current_market_data_point = historical_data_response # Store for observation

                if historical_data_response.get("error") or not historical_data_response.get("quotes"):
                    err_msg = f"Error/insufficient OHLCV data for {self.current_strategy_instance.symbol}: {historical_data_response.get('error', 'No quotes')}"
                    self._emit_thought(run_id, err_msg)
                    strategy_output_details = {"signal": "HOLD", "reason": err_msg}
                    action = "hold"
                else:
                    historical_klines = historical_data_response["quotes"]
                    self._emit_thought(run_id, f"Historical data fetched ({len(historical_klines)} points). Executing SMA strategy logic...")
                    strategy_output = self.current_strategy_instance.execute(historical_klines)
                    action = strategy_output.get("signal", "hold").lower() 
                    symbol_to_trade = strategy_output.get("symbol", symbol_to_trade)
                    price_to_trade = strategy_output.get("latest_close")
                    strategy_output_details = strategy_output
                    self._emit_thought(run_id, f"SMA Strategy signal: {action.upper()}. Details: {strategy_output_details}")
            else:
                self._emit_thought(run_id, f"No specific strategy instance or not SMA Crossover. Using placeholder logic.")
                action = self.configuration_parameters.get('action_to_take', 'hold').lower()
                # symbol_to_trade already fetched
                if market_data_service and symbol_to_trade != 'N/A':
                    base_symbol = symbol_to_trade.split('/')[0].upper()
                    fetched_data_dict = market_data_service.get_price_quotes(symbols=[base_symbol]) # This might need to be async
                    current_market_data_point = fetched_data_dict # Store for observation
                    if fetched_data_dict and not fetched_data_dict.get("error") and fetched_data_dict.get(base_symbol):
                        price_to_trade = fetched_data_dict[base_symbol].get('price')
                strategy_output_details = {"signal": action, "reason": "Placeholder logic."}
                self._emit_thought(run_id, f"Placeholder logic signal: {action.upper()}.")

            step_ts_2 = datetime.datetime.now(datetime.timezone.utc).isoformat()
            schedule_broadcast(self.agent_id, StepFinished(runId=run_id, stepName="StrategyExecution", timestamp=step_ts_2).model_dump(mode='json'))
            
            quantity_to_trade = float(self.configuration_parameters.get('quantity', 1.0))
            price_info = f"at price {price_to_trade}" if price_to_trade is not None else "at unknown price"
            decision_log = f"Final Decision: Agent {self.agent_id} intends to {action.upper()} for {symbol_to_trade} {price_info}."
            self._emit_thought(run_id, decision_log) 
            logger.info(decision_log) # Changed print to logger.info

            trade_result = None
            if action in ['buy', 'sell']:
                step_ts_3 = datetime.datetime.now(datetime.timezone.utc).isoformat()
                schedule_broadcast(self.agent_id, StepStarted(runId=run_id, stepName="TradeSimulation", timestamp=step_ts_3).model_dump(mode='json'))
                if price_to_trade is not None:
                    self._emit_thought(run_id, f"Attempting simulated trade: {action.upper()} {quantity_to_trade} {symbol_to_trade} @ {price_to_trade}")
                    trade_result = self.simulated_trade_executor.execute_trade( # This might need to be async
                        agent_id=self.agent_id, user_id=str(self.user_id), symbol=symbol_to_trade, # Ensure user_id is str
                        direction=action, quantity=quantity_to_trade, price=price_to_trade,
                        strategy_id=self.strategy_id,
                        notes=f"Simulated trade from '{self.strategy_name}'. Signal: {strategy_output_details.get('signal', action).upper()}"
                    )
                    self._emit_thought(run_id, f"Simulated trade result: {trade_result}")
                else:
                    self._emit_thought(run_id, f"Trade action '{action.upper()}' for {symbol_to_trade} skipped: unavailable market price.")
                    self.simulated_trade_executor.log_simulated_trade( 
                        agent_id=self.agent_id, symbol=symbol_to_trade, direction=action, 
                        quantity=quantity_to_trade, entry_price=None, status='failed', 
                        notes="Trade skipped due to unavailable market price for trade execution.", strategy_id=self.strategy_id
                    )
                    trade_result = {"status": "skipped", "reason": "Unavailable market price for trade execution"}
                step_ts_4 = datetime.datetime.now(datetime.timezone.utc).isoformat()
                schedule_broadcast(self.agent_id, StepFinished(runId=run_id, stepName="TradeSimulation", timestamp=step_ts_4).model_dump(mode='json'))
            
            log_notes_details = (
                f"Strategy: '{self.strategy_name}' on symbol '{symbol_to_trade}'. "
                f"Signal: {action.upper()}. Price considered: {price_to_trade if price_to_trade is not None else 'N/A'}. "
                f"Strategy Output: {json.dumps(strategy_output_details)}. Trade Result: {json.dumps(trade_result)}. "
                f"Market Data Point: {json.dumps(current_market_data_point)}"
            )
            
            # Add observation to MemoryService (MemGPT) at the end of the cycle
            if self.memory_service and self.user_id: # user_id is required for MemoryService context
                observation_memgpt = (
                    f"Cycle {run_id} for strategy '{self.strategy_name}' on symbol '{symbol_to_trade}'. "
                    f"Config: {json.dumps(self.configuration_parameters)}. "
                    f"Strategy output: {json.dumps(strategy_output_details)}. "
                    f"Market data considered: {json.dumps(current_market_data_point)}. "
                    f"Decision: {action.upper()}. Price: {price_to_trade if price_to_trade is not None else 'N/A'}. "
                    f"Trade result: {json.dumps(trade_result)}. Final log: {decision_log}."
                )
                try:
                    add_obs_result = await self.memory_service.add_observation(observation_text=observation_memgpt)
                    self._emit_thought(run_id, f"MemGPT observation result: {json.dumps(add_obs_result)}")
                except Exception as mem_e:
                    logger.error(f"Error adding MemGPT observation for agent {self.agent_id}: {mem_e}", exc_info=True)
                    self._emit_thought(run_id, f"MemGPT observation failed: {str(mem_e)}")
            
            # Contribute to SharedKnowledgeService
            if self.knowledge_service:
                knowledge_to_add = None
                knowledge_type = None
                tags = [self.strategy_name, symbol_to_trade]
                confidence = strategy_output_details.get('confidence') # May be None

                if action in ["buy", "sell"] and trade_result and trade_result.get("status") == "success":
                    knowledge_content = (
                        f"Trade executed for {symbol_to_trade}: {action.upper()} {quantity_to_trade} @ {price_to_trade}. "
                        f"Strategy: {self.strategy_name}. Rationale: {strategy_output_details.get('rationale', 'N/A')}. "
                        f"Run ID: {run_id}."
                    )
                    knowledge_type = "trade_execution_outcome"
                    tags.extend([action.upper(), "trade", "success"])
                    knowledge_to_add = {
                        "content_text": knowledge_content, "knowledge_type": knowledge_type, "tags": tags,
                        "confidence_score": confidence, "metadata": {"trade_id": trade_result.get("trade_id"), "run_id": run_id}
                    }
                elif action == "hold" and isinstance(confidence, (float, int)) and confidence > 0.7: # Strong HOLD
                    knowledge_content = (
                        f"Strong HOLD signal for {symbol_to_trade} based on {self.strategy_name}. "
                        f"Confidence: {confidence:.2f}. Rationale: {strategy_output_details.get('rationale', 'N/A')}. Run ID: {run_id}."
                    )
                    knowledge_type = "market_signal_assessment"
                    tags.extend(["HOLD", "strong_signal"])
                    knowledge_to_add = {
                        "content_text": knowledge_content, "knowledge_type": knowledge_type, "tags": tags,
                        "confidence_score": confidence, "metadata": {"run_id": run_id}
                    }

                if knowledge_to_add:
                    try:
                        agent_uuid_for_knowledge = uuid.UUID(self.agent_id) if isinstance(self.agent_id, str) else self.agent_id
                        # user_id for knowledge can be self.user_id or None if more generic
                        await self.knowledge_service.add_knowledge_item(
                            content_text=knowledge_to_add["content_text"],
                            source_agent_id=agent_uuid_for_knowledge,
                            # user_id=self.user_id, # Optional: if knowledge should be user-scoped too
                            tags=knowledge_to_add["tags"],
                            symbols_referenced=[symbol_to_trade],
                            knowledge_type=knowledge_to_add["knowledge_type"],
                            confidence_score=knowledge_to_add["confidence_score"],
                            metadata=knowledge_to_add["metadata"]
                        )
                        self._emit_thought(run_id, f"Contributed to shared knowledge: {knowledge_type} for {symbol_to_trade}")
                    except Exception as kn_add_e:
                        logger.error(f"Error contributing to shared knowledge for agent {self.agent_id}: {kn_add_e}", exc_info=True)
                        self._emit_thought(run_id, f"Failed to contribute to shared knowledge: {str(kn_add_e)}")

            try:
                log_entry = {"agent_id": self.agent_id, "metric_name": "cycle_executed", "metric_value": action.upper(), "notes": log_notes_details}
                db_log_response = self.supabase.table('agent_performance_logs').insert(log_entry).execute()
                if db_log_response.data: 
                    logger.info(f"Successfully logged cycle execution for agent {self.agent_id}.")
                else: 
                    error_msg = "Unknown DB logging error"
                    if hasattr(db_log_response, 'error') and db_log_response.error:
                        error_msg = db_log_response.error.message if hasattr(db_log_response.error, 'message') else str(db_log_response.error)
                    elif not db_log_response.data : 
                         error_msg = "No data returned from insert operation."
                    logger.error(f"Error logging performance for agent {self.agent_id}: {error_msg}")
            except Exception as e:
                logger.error(f"Exception during DB performance logging for agent {self.agent_id}: {e}", exc_info=True)

            schedule_broadcast(self.agent_id, RunFinished(runId=run_id, threadId=self.agent_id, timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()).model_dump(mode='json'))
            return {"decision": action, "symbol": symbol_to_trade, "strategy_details": strategy_output_details, "trade_execution_result": trade_result, "log": decision_log, "run_id": run_id}

        except Exception as e:
            logger.error(f"Error in agent {self.agent_id} run_cycle {run_id}: {e}", exc_info=True)
            timestamp_end = datetime.datetime.now(datetime.timezone.utc).isoformat()
            schedule_broadcast(self.agent_id, RunError(runId=run_id, threadId=self.agent_id, message=str(e), code="AGENT_CYCLE_ERROR", timestamp=timestamp_end).model_dump(mode='json'))
            return {"decision": "error", "reason": str(e), "run_id": run_id}

```
