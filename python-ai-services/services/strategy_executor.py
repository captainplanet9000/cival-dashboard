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
# Corrected import path assuming websocket_server is in the parent directory of services/
# If services/ and strategies/ are subdirs of python-ai-services/, and websocket_server.py is also in python-ai-services/
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
        self.user_id = None
        self.strategy_id = None
        self.strategy_name = None
        self.configuration_parameters = None
        self.current_strategy_instance = None

    def load_agent_and_strategy(self, agent_id: str):
        # Loads the agent's details, its assigned strategy, and configuration.
        self.agent_id = agent_id
        
        agent_response = self.supabase.table('trading_agents').select(
            'user_id, configuration_parameters, trading_strategies(strategy_id, name)'
        ).eq('agent_id', agent_id).single().execute()
        
        if not agent_response.data:
            raise ValueError(f"Agent {agent_id} not found or error in fetching.")
        
        agent_data = agent_response.data
        self.configuration_parameters = agent_data.get('configuration_parameters', {})
        self.user_id = agent_data.get('user_id') 

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


    def run_cycle(self, market_data_service: MarketDataService = None): # Added type hint
        if not self.agent_id or not self.strategy_id or self.configuration_parameters is None:
            logger.error("Agent/strategy not loaded for run_cycle.")
            return {"decision": "error", "reason": "Agent/strategy not loaded"}

        run_id = str(uuid.uuid4())
        timestamp_start = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        try:
            schedule_broadcast(self.agent_id, RunStarted(runId=run_id, threadId=self.agent_id, timestamp=timestamp_start).model_dump(mode='json'))
            self._emit_thought(run_id, f"Cycle {run_id} started for strategy '{self.strategy_name}'.")

            action = "hold" 
            symbol_to_trade = self.configuration_parameters.get('symbol', 'N/A')
            strategy_output_details = {}
            price_to_trade = None
            
            step_ts_1 = datetime.datetime.now(datetime.timezone.utc).isoformat()
            schedule_broadcast(self.agent_id, StepStarted(runId=run_id, stepName="StrategyExecution", timestamp=step_ts_1).model_dump(mode='json'))

            if isinstance(self.current_strategy_instance, SMACrossoverStrategy):
                if not market_data_service:
                    raise AgentServiceError("MarketDataService is required for SMACrossoverStrategy but not provided.")
                
                self._emit_thought(run_id, f"Running SMA Crossover for {self.current_strategy_instance.symbol}. Fetching historical data...")
                required_data_points = self.current_strategy_instance.long_window + self.current_strategy_instance.short_window
                time_period = self.configuration_parameters.get('time_period', 'daily')
                
                historical_data_response = market_data_service.get_historical_ohlcv(
                    symbol=self.current_strategy_instance.symbol.split('/')[0],
                    count=required_data_points, 
                    time_period=time_period
                )

                if historical_data_response.get("error") or not historical_data_response.get("quotes"):
                    err_msg = f"Error/insufficient OHLCV data for {self.current_strategy_instance.symbol}: {historical_data_response.get('error', 'No quotes')}"
                    self._emit_thought(run_id, err_msg)
                    strategy_output_details = {"signal": "HOLD", "reason": err_msg}
                    action = "hold"
                else:
                    historical_klines = historical_data_response["quotes"]
                    self._emit_thought(run_id, f"Historical data fetched ({len(historical_klines)} points). Executing SMA strategy logic...")
                    strategy_output = self.current_strategy_instance.execute(historical_klines)
                    action = strategy_output.get("signal", "hold").lower() # ensure lowercase
                    symbol_to_trade = strategy_output.get("symbol", symbol_to_trade)
                    price_to_trade = strategy_output.get("latest_close")
                    strategy_output_details = strategy_output
                    self._emit_thought(run_id, f"SMA Strategy signal: {action.upper()}. Details: {strategy_output_details}")
            else:
                self._emit_thought(run_id, f"No specific strategy instance or not SMA Crossover. Using placeholder logic.")
                action = self.configuration_parameters.get('action_to_take', 'hold').lower() # ensure lowercase
                symbol_to_trade = self.configuration_parameters.get('symbol', 'N/A')
                if market_data_service and symbol_to_trade != 'N/A':
                    base_symbol = symbol_to_trade.split('/')[0].upper()
                    fetched_data_dict = market_data_service.get_price_quotes(symbols=[base_symbol])
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
            print(decision_log) # Keep console log for direct Python execution visibility

            trade_result = None
            if action in ['buy', 'sell']:
                step_ts_3 = datetime.datetime.now(datetime.timezone.utc).isoformat()
                schedule_broadcast(self.agent_id, StepStarted(runId=run_id, stepName="TradeSimulation", timestamp=step_ts_3).model_dump(mode='json'))
                if price_to_trade is not None:
                    self._emit_thought(run_id, f"Attempting simulated trade: {action.upper()} {quantity_to_trade} {symbol_to_trade} @ {price_to_trade}")
                    trade_result = self.simulated_trade_executor.execute_trade(
                        agent_id=self.agent_id, user_id=self.user_id, symbol=symbol_to_trade,
                        direction=action, quantity=quantity_to_trade, price=price_to_trade,
                        strategy_id=self.strategy_id,
                        notes=f"Simulated trade from '{self.strategy_name}'. Signal: {strategy_output_details.get('signal', action).upper()}"
                    )
                    self._emit_thought(run_id, f"Simulated trade result: {trade_result}")
                else:
                    self._emit_thought(run_id, f"Trade action '{action.upper()}' for {symbol_to_trade} skipped: unavailable market price.")
                    self.simulated_trade_executor.log_simulated_trade( # Log skipped trade
                        agent_id=self.agent_id, symbol=symbol_to_trade, direction=action, 
                        quantity=quantity_to_trade, entry_price=None, status='failed', 
                        notes="Trade skipped due to unavailable market price for trade execution.", strategy_id=self.strategy_id
                    )
                    trade_result = {"status": "skipped", "reason": "Unavailable market price for trade execution"}
                step_ts_4 = datetime.datetime.now(datetime.timezone.utc).isoformat()
                schedule_broadcast(self.agent_id, StepFinished(runId=run_id, stepName="TradeSimulation", timestamp=step_ts_4).model_dump(mode='json'))
            
            # Performance Logging to DB
            log_notes_details = (
                f"Strategy: '{self.strategy_name}' on symbol '{symbol_to_trade}'. "
                f"Signal: {action.upper()}. Price considered: {price_to_trade if price_to_trade is not None else 'N/A'}. "
                f"Strategy Output: {strategy_output_details}. Trade Result: {trade_result}"
            )
            # self._emit_thought(run_id, f"Performance log notes: {log_notes_details}") # This might be too verbose for AG-UI thought stream

            try:
                log_entry = {"agent_id": self.agent_id, "metric_name": "cycle_executed", "metric_value": action.upper(), "notes": log_notes_details}
                db_log_response = self.supabase.table('agent_performance_logs').insert(log_entry).execute()
                if db_log_response.data: # Check if data is present and not empty for success
                    logger.info(f"Successfully logged cycle execution for agent {self.agent_id}.")
                else: # Handle cases where data might be None or empty list, or if error attribute is present
                    error_msg = "Unknown DB logging error"
                    if hasattr(db_log_response, 'error') and db_log_response.error:
                        error_msg = db_log_response.error.message if hasattr(db_log_response.error, 'message') else str(db_log_response.error)
                    elif not db_log_response.data : # If no data and no explicit error
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
