"""
Enhanced Trading Coordinator that leverages CrewAI for analysis.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger
import httpx
import json
import asyncio # Added

# Local imports
from ..utils.google_sdk_bridge import GoogleSDKBridge
from ..utils.a2a_protocol import A2AProtocol
# Use TradingAnalysisCrewRequest from api_models.py for consistency with new API endpoint
from ..models.api_models import TradingAnalysisCrewRequest
# Import the crew
from ..agents.crew_setup import trading_analysis_crew
# The original TradingAnalysisRequest and other types from trading_types might still be used by other methods
# or might need to be reconciled. For analyze_trading_opportunity, we use TradingAnalysisCrewRequest.
from ..types.trading_types import TradingAnalysisRequest as OriginalTradingAnalysisRequest

# Add import for SimulatedTradeExecutor for type hinting
from .simulated_trade_executor import SimulatedTradeExecutor
from .hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError # Added for Hyperliquid

# Add imports for PaperTradeOrder and related enums
from ..models.paper_trading_models import PaperTradeOrder, PaperTradeFill
# Make sure PaperTradeSide is available, if not, import it or use TradeSide consistently
from ..models.trading_history_models import TradeSide, OrderType as PaperOrderType, TradeFillData
from ..models.hyperliquid_models import HyperliquidPlaceOrderParams
from ..models.event_bus_models import TradeSignalEventPayload # Added for risk assessment
from datetime import timezone, datetime
import uuid

# Service imports
from .trade_history_service import TradeHistoryService
from .risk_manager_service import RiskManagerService # Added
from .agent_management_service import AgentManagementService # Added for fetching TC's own config if needed


class TradingCoordinator:
    """
    Coordinates trading analysis by leveraging specialized CrewAI crews,
    performing risk assessment, and then executing trades.
    """
    
    def __init__(self,
                 agent_id: str, # ID for this TradingCoordinator instance
                 agent_management_service: AgentManagementService, # To fetch its own config or other agents'
                 risk_manager_service: RiskManagerService, # For pre-trade risk checks
                 google_bridge: GoogleSDKBridge, # Existing dependency
                 a2a_protocol: A2AProtocol, # Existing dependency
                 simulated_trade_executor: SimulatedTradeExecutor, # Existing dependency
                 hyperliquid_execution_service: Optional[HyperliquidExecutionService] = None,
                 trade_history_service: Optional[TradeHistoryService] = None,
                 event_bus_service: Optional[Any] = None # Placeholder for EventBusService
                ):
        self.agent_id = agent_id # Own ID, can be used as default proposer_agent_id
        self.agent_management_service = agent_management_service
        self.risk_manager_service = risk_manager_service
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.simulated_trade_executor = simulated_trade_executor
        self.hyperliquid_execution_service = hyperliquid_execution_service
        self.trade_history_service = trade_history_service
        self.event_bus_service = event_bus_service # Store, though not used in this step
        self.trade_execution_mode: str = "paper"

        self.base_url = "http://localhost:3000/api/agents/trading"
        logger.info(f"TradingCoordinator instance {self.agent_id} initialized.")
        if self.simulated_trade_executor:
            logger.info("SimulatedTradeExecutor is available.")
        if self.hyperliquid_execution_service:
            logger.info("HyperliquidExecutionService is available.")
        logger.info(f"Default trade execution mode: {self.trade_execution_mode}")

    async def set_trade_execution_mode(self, mode: str) -> Dict[str, str]:
        """Sets the trade execution mode for the TradingCoordinator."""
        allowed_modes = ["paper", "live"]
        if mode.lower() not in allowed_modes:
            logger.error(f"Attempted to set invalid trade execution mode: {mode}")
            raise ValueError(f"Invalid trade execution mode '{mode}'. Allowed modes are: {', '.join(allowed_modes)}")

        self.trade_execution_mode = mode.lower()
        logger.info(f"Trade execution mode set to: {self.trade_execution_mode}")
        return {"status": "success", "message": f"Trade execution mode set to {self.trade_execution_mode}"}

    async def get_trade_execution_mode(self) -> Dict[str, str]:
        """Gets the current trade execution mode."""
        logger.debug(f"Current trade execution mode is: {self.trade_execution_mode}")
        return {"current_mode": self.trade_execution_mode}

    async def _execute_trade_decision(self, trade_params: Dict[str, Any], user_id: str) -> Dict:
        """
        Executes a trade decision based on the current trade_execution_mode.
        """
        logger.info(f"Executing trade decision for user {user_id} with params: {trade_params}")
        logger.info(f"Current trade execution mode: {self.trade_execution_mode}")

        if self.trade_execution_mode == "live":
            if not self.hyperliquid_execution_service:
                logger.warning("Live trade mode selected, but HyperliquidExecutionService is not available.")
                return {"status": "live_skipped", "reason": "Hyperliquid service unavailable."}

            logger.info("Attempting LIVE trade execution via HyperliquidExecutionService.")
            main_order_result_dict = None
            sl_order_result_dict_or_error = None
            tp_order_result_dict_or_error = None
            risk_percentage = 0.01 # Configurable: 1% risk per trade

            try:
                # 1. Account Balance Check & Position Sizing Information
                margin_summary = await self.hyperliquid_execution_service.get_account_margin_summary()
                if not margin_summary or not margin_summary.account_value:
                    logger.error("Failed to fetch account margin summary or account_value is missing.")
                    return {"status": "live_failed", "error": "Failed to fetch account balance for risk management."}

                account_value_float = 0.0
                try:
                    account_value_float = float(margin_summary.account_value)
                except ValueError:
                    logger.error(f"Could not convert account_value '{margin_summary.account_value}' to float.")
                    return {"status": "live_failed", "error": "Invalid account_value format for risk management."}

                logger.info(f"Account value for risk check: {account_value_float} USD")

                entry_price_for_sizing = trade_params.get("price") # This is limit_px for limit, or estimated market price
                stop_loss_price_for_sizing = trade_params.get("stop_loss_price")

                if entry_price_for_sizing is not None and stop_loss_price_for_sizing is not None:
                    risk_per_unit = abs(float(entry_price_for_sizing) - float(stop_loss_price_for_sizing))
                    if risk_per_unit > 0:
                        max_allowed_risk_usd = account_value_float * risk_percentage
                        max_position_size_units = max_allowed_risk_usd / risk_per_unit
                        logger.info(f"Informational Position Sizing: risk_per_unit={risk_per_unit}, max_allowed_risk_usd={max_allowed_risk_usd}, max_position_size_units={max_position_size_units:.8f}")
                        if float(trade_params["quantity"]) > max_position_size_units:
                            logger.warning(f"Requested quantity {trade_params['quantity']} exceeds SL-based max size {max_position_size_units:.8f}")
                    else:
                        logger.info("SL-based position sizing skipped: risk_per_unit is zero (entry and SL price are the same).")
                else:
                    logger.info("SL-based position sizing skipped: stop_loss_price or entry price not available in trade_params.")

                # 2. Main Order Placement
                is_buy = trade_params["action"].lower() == "buy"
                order_type_params: Dict[str, Any]
                if trade_params["order_type"].lower() == "limit":
                    if "price" not in trade_params or trade_params["price"] is None:
                        raise ValueError("Price is required for limit order.")
                    order_type_params = {"limit": {"tif": "Gtc"}}
                    limit_px_for_sdk = trade_params["price"]
                elif trade_params["order_type"].lower() == "market":
                    order_type_params = {"market": {"tif": "Ioc"}}
                    # Use a valid price for market orders if required by Pydantic model (ge=0),
                    # or the entry_price_for_sizing if available, else 0.0
                    limit_px_for_sdk = float(entry_price_for_sizing if entry_price_for_sizing is not None else 0.0)
                else:
                    raise ValueError(f"Unsupported order type for Hyperliquid: {trade_params['order_type']}")

                main_order_hl_params = HyperliquidPlaceOrderParams(
                    asset=trade_params["symbol"].upper(),
                    is_buy=is_buy,
                    sz=float(trade_params["quantity"]),
                    limit_px=float(limit_px_for_sdk),
                    order_type=order_type_params,
                    reduce_only=False # Main order is not reduce_only
                )

                logger.debug(f"Constructed Main Order HyperliquidPlaceOrderParams: {main_order_hl_params.model_dump_json()}")
                main_order_result = await self.hyperliquid_execution_service.place_order(main_order_hl_params)
                main_order_result_dict = main_order_result.model_dump()
                logger.info(f"Main live trade executed. Response: {main_order_result_dict}")

                # Record simulated fills if available and TradeHistoryService is configured
                # --- START OF (SIMULATED) FILL RECORDING ---
                # This section processes fills provided by HyperliquidExecutionService.
                # Currently, HyperliquidExecutionService generates *simulated* fills for market orders
                # or orders that are immediately marked as "filled" by the (mocked) SDK response.
                # When HyperliquidExecutionService is updated to provide real fill data (e.g., from
                # WebSocket streams or by parsing immediate execution data from SDK responses),
                # this logic in TradingCoordinator should seamlessly process those real fills
                # as long as they are provided in the 'simulated_fills' field (which might then be renamed
                # to 'actual_fills' or similar in HyperliquidOrderResponseData).
                # The TradeFillData model is designed to hold data from actual exchange fills.
                if self.trade_history_service and main_order_result.simulated_fills:
                    logger.info(f"Processing {len(main_order_result.simulated_fills)} (simulated) fills for main order.")
                    for fill_dict in main_order_result.simulated_fills:
                        try:
                            # Convert timestamp string to datetime object
                            fill_timestamp_str = fill_dict.get("timestamp")
                            fill_timestamp = datetime.fromisoformat(fill_timestamp_str) if fill_timestamp_str else datetime.now(timezone.utc)

                            fill_data_obj = TradeFillData(
                                agent_id=user_id, # user_id is agent_id in this context
                                # fill_id is auto-generated by TradeFillData model
                                timestamp=fill_timestamp,
                                asset=str(fill_dict.get("asset")),
                                side=str(fill_dict.get("side")).lower(), # type: ignore
                                quantity=float(fill_dict.get("quantity", 0.0)),
                                price=float(fill_dict.get("price", 0.0)),
                                fee=float(fill_dict.get("fee", 0.0)),
                                fee_currency=str(fill_dict.get("fee_currency")) if fill_dict.get("fee_currency") else None,
                                exchange_order_id=str(fill_dict.get("exchange_order_id")) if fill_dict.get("exchange_order_id") else None,
                                exchange_trade_id=str(fill_dict.get("exchange_trade_id")) if fill_dict.get("exchange_trade_id") else None
                            )
                            logger.info(f"Recording simulated fill for agent {user_id}: {fill_data_obj.model_dump_json(indent=2)}")
                            await self.trade_history_service.record_fill(fill_data_obj)
                        except Exception as e_fill:
                            logger.error(f"Error processing or recording (simulated) fill for agent {user_id}: {e_fill}", exc_info=True)
                            # Continue to SL/TP placement even if fill recording fails for one fill
                # --- END OF (SIMULATED) FILL RECORDING ---


                # 3. Stop-Loss (SL) and Take-Profit (TP) Order Placement
                # Check if main order was successful enough to place SL/TP (e.g. "resting", "filled", or general "ok")
                # HyperliquidOrderResponseData has 'status' (e.g. "resting") and 'oid'
                if main_order_result.oid is not None and main_order_result.status in ["resting", "filled", "ok"]: # "ok" might be a general success status
                    stop_loss_price = trade_params.get("stop_loss_price")
                    if stop_loss_price is not None:
                        try:
                            sl_params = HyperliquidPlaceOrderParams(
                                asset=trade_params["symbol"].upper(),
                                is_buy=not is_buy, # Opposite side
                                sz=float(trade_params["quantity"]),
                                limit_px=float(stop_loss_price),
                                order_type={"limit": {"tif": "Gtc"}}, # Could be other types e.g. stop market
                                reduce_only=True
                            )
                            logger.info(f"Attempting to place Stop-Loss order: {sl_params.model_dump_json()}")
                            sl_order_result = await self.hyperliquid_execution_service.place_order(sl_params)
                            sl_order_result_dict_or_error = sl_order_result.model_dump()
                            logger.info(f"Stop-Loss order placed successfully: {sl_order_result_dict_or_error}")
                        except (HyperliquidExecutionServiceError, ValueError) as e:
                            logger.error(f"Failed to place Stop-Loss order: {e}", exc_info=True)
                            sl_order_result_dict_or_error = {"error": str(e)}
                        except Exception as e:
                            logger.error(f"Unexpected error placing Stop-Loss order: {e}", exc_info=True)
                            sl_order_result_dict_or_error = {"error": f"Unexpected SL error: {str(e)}"}


                    take_profit_price = trade_params.get("take_profit_price")
                    if take_profit_price is not None:
                        try:
                            tp_params = HyperliquidPlaceOrderParams(
                                asset=trade_params["symbol"].upper(),
                                is_buy=not is_buy, # Opposite side
                                sz=float(trade_params["quantity"]),
                                limit_px=float(take_profit_price),
                                order_type={"limit": {"tif": "Gtc"}},
                                reduce_only=True
                            )
                            logger.info(f"Attempting to place Take-Profit order: {tp_params.model_dump_json()}")
                            tp_order_result = await self.hyperliquid_execution_service.place_order(tp_params)
                            tp_order_result_dict_or_error = tp_order_result.model_dump()
                            logger.info(f"Take-Profit order placed successfully: {tp_order_result_dict_or_error}")
                        except (HyperliquidExecutionServiceError, ValueError) as e:
                            logger.error(f"Failed to place Take-Profit order: {e}", exc_info=True)
                            tp_order_result_dict_or_error = {"error": str(e)}
                        except Exception as e:
                            logger.error(f"Unexpected error placing Take-Profit order: {e}", exc_info=True)
                            tp_order_result_dict_or_error = {"error": f"Unexpected TP error: {str(e)}"}
                else:
                    logger.warning(f"Main order was not successful (status: {main_order_result.status}, oid: {main_order_result.oid}). Skipping SL/TP placement.")

                return {
                    "status": "live_executed_with_risk_management",
                    "details": {
                        "main_order": main_order_result_dict,
                        "stop_loss_order": sl_order_result_dict_or_error,
                        "take_profit_order": tp_order_result_dict_or_error
                    }
                }

            except (HyperliquidExecutionServiceError, ValueError) as e:
                logger.error(f"Live trade execution process failed: {e}", exc_info=True)
                # Ensure main_order_result_dict exists for consistent return structure if error happens post main order but pre SL/TP
                return {
                    "status": "live_failed",
                    "error": str(e),
                    "details": { # Partial details if main order was attempted
                        "main_order": main_order_result_dict,
                        "stop_loss_order": sl_order_result_dict_or_error,
                        "take_profit_order": tp_order_result_dict_or_error
                    }
                }
            except Exception as e:
                logger.error(f"Unexpected error during live trade execution process: {e}", exc_info=True)
                return {
                    "status": "live_failed",
                    "error": f"Unexpected error: {str(e)}",
                    "details": {
                         "main_order": main_order_result_dict,
                         "stop_loss_order": sl_order_result_dict_or_error,
                         "take_profit_order": tp_order_result_dict_or_error
                    }
                }
            # else: # This was removed because the check for hyperliquid_execution_service is now at the top
            #     logger.warning("Live trade mode selected, but HyperliquidExecutionService is not available.")
                return {"status": "live_skipped", "reason": "Hyperliquid service unavailable."}

        elif self.trade_execution_mode == "paper":
            if self.simulated_trade_executor:
                logger.info("Attempting PAPER trade execution via SimulatedTradeExecutor.")
                try:
                    paper_order_side = TradeSide.BUY if trade_params["action"].lower() == "buy" else TradeSide.SELL

                    paper_order_type_str = trade_params["order_type"].lower()
                    if paper_order_type_str == "market":
                        paper_order_type_enum = PaperOrderType.MARKET
                    elif paper_order_type_str == "limit":
                        paper_order_type_enum = PaperOrderType.LIMIT
                    else:
                        logger.warning(f"Unsupported paper order type '{paper_order_type_str}', defaulting to MARKET.")
                        paper_order_type_enum = PaperOrderType.MARKET

                    paper_order = PaperTradeOrder(
                        user_id=uuid.UUID(user_id),
                        symbol=trade_params["symbol"],
                        side=paper_order_side,
                        order_type=paper_order_type_enum,
                        quantity=float(trade_params["quantity"]),
                        limit_price=float(trade_params["price"]) if paper_order_type_enum == PaperOrderType.LIMIT and trade_params.get("price") is not None else None,
                        created_at=datetime.now(timezone.utc)
                    )

                    logger.debug(f"Constructed PaperTradeOrder: {paper_order.model_dump_json()}")
                    updated_order, fills = await self.simulated_trade_executor.submit_paper_order(paper_order)
                    logger.info(f"Paper trade executed. Order: {updated_order.order_id}, Fills: {len(fills)}")
                    return {"status": "paper_executed", "details": {"order": updated_order.model_dump(), "fills": [f.model_dump() for f in fills]}}
                except Exception as e:
                    logger.error(f"Paper trade execution failed: {e}", exc_info=True)
                    return {"status": "paper_failed", "error": str(e)}
            else:
                logger.warning("Paper trade mode selected, but SimulatedTradeExecutor is not available.")
                return {"status": "paper_skipped", "reason": "Simulated executor unavailable."}
        else:
            logger.warning(f"Unknown trade execution mode: {self.trade_execution_mode}")
            return {"status": "error", "reason": "Unknown trade execution mode."}

    async def _parse_crew_result_and_execute(self, crew_result: Any, user_id: str):
        """
        Parses the result from a CrewAI crew and, if actionable, triggers a trade decision.
        """
        logger.info(f"Parsing crew result for user {user_id}. Result snippet: {str(crew_result)[:300]}")

        trade_params: Optional[Dict[str, Any]] = None

        try:
            if isinstance(crew_result, str):
                try:
                    data = json.loads(crew_result)
                except json.JSONDecodeError:
                    logger.warning(f"Crew result is a string but not valid JSON: {crew_result}")
                    data = {} # Treat as empty dict if not parsable
            elif isinstance(crew_result, dict):
                data = crew_result
            else:
                logger.warning(f"Crew result is of unexpected type: {type(crew_result)}. Cannot parse for trade action.")
                return

            # Placeholder parsing logic - adapt based on actual crew output structure
            # Example: Crew might output a dict with 'action', 'symbol', 'quantity', 'order_type', 'price', 'stop_loss_price', etc.
            action_str = data.get("action", data.get("trading_decision", {}).get("action"))
            symbol_str = data.get("symbol", data.get("trading_decision", {}).get("symbol"))
            quantity_val = data.get("quantity", data.get("trading_decision", {}).get("quantity"))
            order_type_str = data.get("order_type", data.get("trading_decision", {}).get("order_type", "market"))
            price_val = data.get("price", data.get("trading_decision", {}).get("price")) # For limit orders or as target/entry for market
            stop_loss_price_val = data.get("stop_loss_price", data.get("trading_decision", {}).get("stop_loss_price"))
            take_profit_price_val = data.get("take_profit_price", data.get("trading_decision", {}).get("take_profit_price"))
            strategy_name_val = data.get("strategy_name", "crew_default_strategy") # Get strategy name from crew or default
            confidence_val = data.get("confidence", 0.75) # Default confidence if not provided

            if action_str and symbol_str and quantity_val:
                action_lower = action_str.lower()
                if action_lower in ["buy", "sell", "hold"]: # Include "hold" for clarity
                    if action_lower == "hold":
                        logger.info(f"Crew decision is 'hold' for {symbol_str}. No trade execution. User ID: {user_id}")
                        return # Exit if action is hold

                    # Prepare trade_params for _execute_trade_decision (existing format)
                    trade_params = {
                        "action": action_lower,
                        "symbol": symbol_str,
                        "quantity": float(quantity_val),
                        "order_type": order_type_str.lower(),
                        # Price is crucial for limit orders, also used for risk sizing if available
                        "price": float(price_val) if price_val is not None else None,
                        "stop_loss_price": float(stop_loss_price_val) if stop_loss_price_val is not None else None,
                        "take_profit_price": float(take_profit_price_val) if take_profit_price_val is not None else None
                    }
                    logger.info(f"Extracted trade parameters for agent {user_id}: {trade_params}")

                    # Construct TradeSignalEventPayload for RiskManagerService
                    # 'price_target' in TradeSignalEventPayload is the entry/limit price.
                    # 'price' in trade_params is used for this.
                    if trade_params["price"] is None and trade_params["order_type"] == "limit":
                        logger.error(f"Limit order for agent {user_id}, symbol {symbol_str} is missing price. Aborting.")
                        return

                    signal_payload = TradeSignalEventPayload(
                        symbol=trade_params["symbol"],
                        action=trade_params["action"], # type: ignore # Literal should match
                        quantity=trade_params["quantity"],
                        price_target=trade_params["price"], # Using 'price' from trade_params as the target/entry for signal
                        stop_loss=trade_params["stop_loss_price"],
                        # strategy_name needs to be sourced, e.g. from agent config or crew output
                        strategy_name=strategy_name_val,
                        confidence=float(confidence_val)
                    )

                    logger.info(f"TradingCoordinator: Assessing risk for agent {user_id}, signal: {signal_payload.model_dump_json(indent=2)}")

                    # The agent_id for risk assessment is user_id (agent for whom decision is made)
                    assessment_result = await self.risk_manager_service.assess_trade_risk(
                        agent_id_of_proposer=user_id,
                        trade_signal=signal_payload
                    )

                    if assessment_result.signal_approved:
                        logger.info(f"TradingCoordinator: Risk assessment approved for agent {user_id}. Proceeding with execution.")
                        # Pass the original trade_params (which includes SL/TP if provided by crew)
                        await self._execute_trade_decision(trade_params, user_id=user_id)
                    else:
                        logger.warning(f"TradingCoordinator: Trade for agent {user_id}, symbol {trade_params['symbol']} rejected by RiskManagerService: {assessment_result.rejection_reason}")

                else: # action_lower not in buy/sell/hold
                    logger.warning(f"Unknown action '{action_str}' in crew result for agent {user_id}. No trade execution.")
            else: # Missing essential params
                logger.warning(f"Essential trade parameters (action, symbol, quantity) not found in crew result for agent {user_id}: {data}")

        except Exception as e:
            logger.error(f"Error parsing crew result or initiating trade execution for agent {user_id}: {e}", exc_info=True)


    async def execute_trade(self, trade_request: Dict) -> Dict: # This method seems to be for external calls, not used by crew flow
        logger.info(f"Executing trade: {trade_request}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/execute",
                    json=trade_request,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Log successful trade execution
                logger.info(f"Trade executed successfully: {result}")
                
                # Broadcast trade execution to other agents
                await self.a2a_protocol.broadcast_message(
                    message_type="trade_executed",
                    payload={
                        "agent_id": trade_request.get("agentId", trade_request.get("agent_id")),
                        "trade": result,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error executing trade: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Trade execution failed: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error executing trade: {str(e)}")
            raise Exception(f"Trade execution request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error executing trade: {str(e)}", exc_info=True)
            raise Exception(f"An unexpected error occurred during trade execution: {str(e)}")

    async def register_agent(self, agent_config: Dict) -> Dict:
        """Register agent with trading permissions"""
        logger.info(f"Registering agent: {agent_config}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/register",
                    json=agent_config,
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Agent registered successfully: {result}")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error registering agent: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Agent registration failed: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error registering agent: {str(e)}")
            raise Exception(f"Agent registration request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error registering agent: {str(e)}", exc_info=True)
            raise Exception(f"An unexpected error occurred during agent registration: {str(e)}")

    async def get_agent_status(self, agent_id: str) -> Dict:
        """Get agent status"""
        logger.info(f"Getting status for agent: {agent_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/status?agentId={agent_id}",
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Retrieved agent status: {result}")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent status: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Failed to get agent status: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error getting agent status: {str(e)}")
            raise Exception(f"Agent status request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error getting agent status: {str(e)}", exc_info=True)
            raise Exception(f"An unexpected error occurred while fetching agent status: {str(e)}")

    async def get_agent_trading_history(self, agent_id: str) -> Dict:
        """Get agent trading history"""
        logger.info(f"Getting trading history for agent: {agent_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/history?agentId={agent_id}",
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Retrieved agent trading history: {len(result.get('trades', []))} trades")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent trading history: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Failed to get agent trading history: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error getting agent trading history: {str(e)}")
            raise Exception(f"Agent trading history request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error getting agent trading history: {str(e)}", exc_info=True)
            raise Exception(f"An unexpected error occurred while fetching agent trading history: {str(e)}")
            
    async def analyze_trading_opportunity(self, request: TradingAnalysisCrewRequest) -> Any:
        """
        Analyzes a trading opportunity by kicking off the trading_analysis_crew.
        The request should conform to TradingAnalysisCrewRequest.
        """
        logger.info(f"TradingCoordinator: Received request to analyze trading opportunity for symbol: {request.symbol}")

        inputs_for_crew = {
            "symbol": request.symbol,
            "market_event_description": request.market_event_description,
            "additional_context": request.additional_context,
            "user_id": request.user_id,
            # crew_run_id could be generated here or expected in request if needed by crew directly
            # For now, crew_setup.py's example kickoff didn't strictly require it in inputs if tasks are general
        }

        # CrewAI's kickoff is a synchronous (blocking) call.
        # Since this service method is async, we must run kickoff in an executor.
        try:
            logger.info(f"Delegating analysis to trading_analysis_crew with inputs: {inputs_for_crew}")
            
            loop = asyncio.get_event_loop()
            # Using lambda to correctly pass inputs to kickoff in the executor
            result = await loop.run_in_executor(None, lambda: trading_analysis_crew.kickoff(inputs=inputs_for_crew))

            logger.info(f"Trading_analysis_crew execution completed. Result snippet: {str(result)[:500]}")
            # The structure of 'result' depends on the output of the last task in trading_analysis_crew.
            # For now, we return it directly. It might need mapping to a specific Pydantic response model.

            # After getting the result, parse it and potentially execute a trade
            # This call is fire-and-forget for now from the perspective of analyze_trading_opportunity's return value
            await self._parse_crew_result_and_execute(result, request.user_id) # request.user_id is str

            return result
        except Exception as e:
            logger.error(f"Error during trading_analysis_crew kickoff via TradingCoordinator: {e}", exc_info=True)
            # Depending on desired error handling, could raise a custom service exception here.
            # For now, re-raising a generic Exception to be caught by the main API handler.
            raise Exception(f"Failed to analyze trading opportunity due to crew execution error: {e}")