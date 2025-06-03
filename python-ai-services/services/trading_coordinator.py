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
from ..models.event_bus_models import TradeSignalEventPayload, Event, MarketConditionEventPayload # Updated imports
from datetime import timezone, datetime
import uuid

# Service imports
from .trade_history_service import TradeHistoryService
from .risk_manager_service import RiskManagerService
from .agent_management_service import AgentManagementService
from .event_bus_service import EventBusService
from .dex_execution_service import DEXExecutionService, DEXExecutionServiceError
from .regulatory_compliance_service import RegulatoryComplianceService
from .learning_data_logger_service import LearningDataLoggerService # Added
from ..models.compliance_models import ComplianceCheckRequest
from ..models.agent_models import AgentConfigOutput
from ..models.learning_models import LearningLogEntry # Added
from typing import List # Added for List in _log_learning_event type hint


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
                 simulated_trade_executor: SimulatedTradeExecutor,
                 hyperliquid_execution_service: Optional[HyperliquidExecutionService] = None,
                 dex_execution_service: Optional[DEXExecutionService] = None,
                 trade_history_service: Optional[TradeHistoryService] = None,
                 event_bus_service: EventBusService,
                 compliance_service: Optional[RegulatoryComplianceService] = None,
                 learning_logger_service: Optional[LearningDataLoggerService] = None # Added
                ):
        self.agent_id = agent_id # ID of this TradingCoordinator agent itself
        self.agent_management_service = agent_management_service
        self.risk_manager_service = risk_manager_service
        self.compliance_service = compliance_service
        self.learning_logger_service = learning_logger_service # Store it
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.simulated_trade_executor = simulated_trade_executor
        self.hyperliquid_execution_service = hyperliquid_execution_service
        self.dex_execution_service = dex_execution_service
        self.trade_history_service = trade_history_service
        self.event_bus_service = event_bus_service
        self.trade_execution_mode: str = "paper" # Default

        self.base_url = "http://localhost:3000/api/agents/trading"
        logger.info(f"TradingCoordinator instance {self.agent_id} initialized.")
        if self.simulated_trade_executor: logger.info("SimulatedTradeExecutor: Available")
        if self.hyperliquid_execution_service: logger.info("HyperliquidExecutionService: Available")
        if self.dex_execution_service: logger.info(f"DEXExecutionService: Available")
        if self.compliance_service: logger.info(f"RegulatoryComplianceService: Available")
        else: logger.warning(f"RegulatoryComplianceService: Not Available. Compliance checks will be skipped.")
        if self.learning_logger_service: logger.info(f"LearningDataLoggerService: Available")
        else: logger.warning(f"LearningDataLoggerService: Not Available. Learning logs will be skipped.")
        logger.info(f"Default trade execution mode: {self.trade_execution_mode}")

    async def _log_learning_event(
        self,
        event_type: str,
        data_snapshot: Dict,
        primary_agent_id: Optional[str] = None,
        outcome: Optional[Dict] = None,
        triggering_event_id: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None
    ):
        if self.learning_logger_service:
            entry = LearningLogEntry(
                primary_agent_id=primary_agent_id if primary_agent_id else self.agent_id, # Default to TC's own ID if no specific agent context
                source_service=self.__class__.__name__, # TradingCoordinator
                event_type=event_type,
                triggering_event_id=triggering_event_id,
                data_snapshot=data_snapshot,
                outcome_or_result=outcome,
                notes=notes,
                tags=tags if tags else []
            )
            await self.learning_logger_service.log_entry(entry)

    async def set_trade_execution_mode(self, mode: str) -> Dict[str, str]:
        """Sets the trade execution mode for the TradingCoordinator."""
        # Updated to include "dex" as an allowed mode.
        # Note: "live" previously referred to Hyperliquid. Consider renaming "live" to "live_cxl" (Centralized Exchange Live)
        # and "dex" to "live_dex" for clarity, or just use "hyperliquid" and "dex".
        # For this change, let's assume "live" means Hyperliquid and "dex" is the new mode.
        allowed_modes = ["paper", "hyperliquid", "dex"] # Changed "live" to "hyperliquid"

        mode_lower = mode.lower()
        if mode_lower == "live": # Map "live" to "hyperliquid" for backward compatibility if needed
            logger.warning("Received 'live' execution mode, interpreting as 'hyperliquid'. Consider using 'hyperliquid' or 'dex' explicitly.")
            mode_lower = "hyperliquid"

        if mode_lower not in allowed_modes:
            logger.error(f"Attempted to set invalid trade execution mode: {mode_lower}")
            raise ValueError(f"Invalid trade execution mode '{mode_lower}'. Allowed modes are: {', '.join(allowed_modes)}")

        self.trade_execution_mode = mode_lower
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

                # Attempt to fetch and record actual fills if trade was placed successfully
                if main_order_result.oid is not None and self.hyperliquid_execution_service and self.trade_history_service:
                    agent_wallet_address = user_id # Assuming user_id IS the wallet address for this agent for HLES calls

                    # A small delay to allow fills to be potentially registered by the exchange
                    await asyncio.sleep(2) # Configurable delay, e.g., 2 seconds

                    logger.info(f"TC ({self.agent_id}): Attempting to fetch actual fills for order OID {main_order_result.oid} for agent wallet {agent_wallet_address}.")
                    try:
                        actual_fill_dicts = await self.hyperliquid_execution_service.get_fills_for_order(
                            user_address=agent_wallet_address,
                            oid=main_order_result.oid
                        )

                        if actual_fill_dicts:
                            logger.info(f"TC ({self.agent_id}): Found {len(actual_fill_dicts)} actual fills for order {main_order_result.oid}.")
                            for fill_dict in actual_fill_dicts:
                                try:
                                    # Map Hyperliquid fill fields to TradeFillData
                                    # HL fill fields example: {'cloid': None, 'coin': 'ETH', 'dir': 'Open Long', 'px': '3000.0', 'qty': '0.001', 'time': 1678886400000, 'hash': '0x...', 'fee': '0.003', 'oid': 12345, 'tid': 'HLTradeID123'}

                                    raw_dir = fill_dict.get("dir", "")
                                    # More robust side mapping based on common HL 'dir' values
                                    if "long" in raw_dir.lower():
                                        mapped_side = "buy" if "open" in raw_dir.lower() else "sell"
                                    elif "short" in raw_dir.lower():
                                        mapped_side = "sell" if "open" in raw_dir.lower() else "buy"
                                    elif raw_dir.upper() == "B": mapped_side = "buy"
                                    elif raw_dir.upper() == "S": mapped_side = "sell"
                                    else: # Fallback if 'dir' is not recognized or missing
                                        logger.warning(f"TC ({self.agent_id}): Unrecognized fill direction '{raw_dir}' for OID {main_order_result.oid}. Defaulting based on order params if possible, or skipping side.")
                                        # Fallback to original order's side; this assumes fills are for the main order direction
                                        # This part might need more sophisticated logic if fills can be against the order direction (e.g. complex reduce_only)
                                        original_order_is_buy = main_order_hl_params.is_buy # Assuming main_order_hl_params is in scope
                                        mapped_side = "buy" if original_order_is_buy else "sell"

                                    fill_data_obj = TradeFillData(
                                        agent_id=user_id, # Internal agent_id, not necessarily wallet address
                                        asset=str(fill_dict["coin"]),
                                        side=mapped_side, # type: ignore
                                        quantity=float(fill_dict["qty"]),
                                        price=float(fill_dict["px"]),
                                        timestamp=datetime.fromtimestamp(int(fill_dict["time"]) / 1000, tz=timezone.utc),
                                        fee=float(fill_dict.get("fee", 0.0)),
                                        fee_currency="USD", # Hyperliquid typically denominates fees in a USD-stablecoin
                                        exchange_order_id=str(fill_dict.get("oid", main_order_result.oid)),
                                        exchange_trade_id=str(fill_dict.get("tid", uuid.uuid4())) # tid is Hyperliquid's trade ID
                                    )
                                    logger.info(f"TC ({self.agent_id}): Recording actual fill for agent {user_id} (wallet: {agent_wallet_address}): {fill_data_obj.model_dump_json(exclude_none=True)}")
                                    await self.trade_history_service.record_fill(fill_data_obj)
                                except KeyError as ke:
                                    logger.error(f"TC ({self.agent_id}): KeyError mapping Hyperliquid fill: {fill_dict}. Missing key: {ke}", exc_info=True)
                                except Exception as e_map:
                                    logger.error(f"TC ({self.agent_id}): Error mapping or recording fill: {fill_dict}. Error: {e_map}", exc_info=True)
                        else:
                            logger.info(f"TC ({self.agent_id}): No actual fills found immediately for order {main_order_result.oid}.")
                    except HyperliquidExecutionServiceError as e_fetch_fills:
                        logger.error(f"TC ({self.agent_id}): Error fetching fills for order {main_order_result.oid}: {e_fetch_fills}", exc_info=True)
                    except Exception as e_fills_processing:
                        logger.error(f"TC ({self.agent_id}): Unexpected error during fill processing for order {main_order_result.oid}: {e_fills_processing}", exc_info=True)

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

        elif self.trade_execution_mode == "dex":
            if not self.dex_execution_service:
                logger.warning("DEX trade mode selected, but DEXExecutionService is not available.")
                return {"status": "dex_skipped", "reason": "DEX service unavailable."}

            logger.info(f"Attempting DEX trade execution via DEXExecutionService for agent {user_id}.")
            # Conceptual placeholder for parameter mapping and execution
            # In a full implementation, this would involve:
            # 1. Fetching agent's full dex_config (e.g., via self.agent_management_service.get_agent(user_id))
            #    agent_dex_config = (await self.agent_management_service.get_agent(user_id)).dex_config
            # 2. Parsing symbol (e.g., "WETH/USDC") from trade_params["symbol"] into token_in_address and token_out_address
            #    using agent_dex_config.token_mappings.
            # 3. Fetching decimals for token_in (e.g., using self.dex_execution_service.get_token_balance or a dedicated get_token_info).
            # 4. Converting trade_params["quantity"] (amount_in) to wei using token_in decimals.
            # 5. Calculating min_amount_out_wei:
            #    - If trade_params["price"] (limit price) is available: (amount_in_tokens * limit_price) * (1 - slippage_tolerance_from_config)
            #    - Convert this to token_out_wei using token_out decimals.
            #    - If no limit price, use 0 for market-like order (or a very low value).
            # 6. Getting fee_tier (e.g., from agent_dex_config.operational_parameters or a default).
            # 7. Handling native ETH (e.g., if token_in is ETH, use WETH address and pass value in transaction).

            logger.info(f"DEX Trade conceptual mapping for agent {user_id}:")
            logger.info(f"  Original trade_params: {trade_params}")

            # --- Placeholder mapping ---
            symbol_pair = trade_params.get("symbol", "UNKNOWN/UNKNOWN")
            token_in_symbol, token_out_symbol = symbol_pair.split('/', 1) if '/' in symbol_pair else (symbol_pair, "UNKNOWN")

            # These would be looked up from agent_config.dex_config.token_mappings
            mock_token_in_address = f"0xTOKEN_IN_ADDRESS_FOR_{token_in_symbol}"
            mock_token_out_address = f"0xTOKEN_OUT_ADDRESS_FOR_{token_out_symbol}"

            # This would involve fetching decimals and converting
            mock_amount_in_wei = int(float(trade_params.get("quantity", 0)) * (10**18)) # Assuming 18 decimals for token_in

            # This would involve price, slippage, and token_out decimals
            mock_min_amount_out_wei = 0 # For market-like, or calculated from price for limit
            if trade_params.get("price") and trade_params.get("order_type", "").lower() == "limit":
                 # Simplified: assume price is for token_out per token_in.
                 # (token_in_quantity * price_of_token_out_per_token_in) * (1-slippage)
                 # This needs token_out decimals as well.
                 mock_min_amount_out_wei = int(mock_amount_in_wei * float(trade_params["price"]) * 0.995 / (10**(18-6))) # Example: 18dec in, 6dec out, 0.5% slippage

            mock_fee_tier = 3000 # Would come from config

            logger.info(f"  Conceptual mapped params: token_in={mock_token_in_address}, token_out={mock_token_out_address}, amount_in_wei={mock_amount_in_wei}, min_amount_out_wei={mock_min_amount_out_wei}, fee_tier={mock_fee_tier}")

            try:
                # Conceptual call to the actual service method
                # result = await self.dex_execution_service.place_swap_order(
                #     token_in_address=mock_token_in_address,
                #     token_out_address=mock_token_out_address,
                #     amount_in_wei=mock_amount_in_wei,
                #     min_amount_out_wei=mock_min_amount_out_wei,
                #     fee_tier=mock_fee_tier
                # )
                # logger.info(f"DEXExecutionService.place_swap_order call conceptually made. Mocked result: {result}")

                # For this subtask, return a mocked success for the placeholder
                mock_dex_result = {
                    "tx_hash": f"0xMOCK_DEX_SWAP_{uuid.uuid4().hex}",
                    "status": "success_mocked_dex",
                    "error": None,
                    "amount_out_wei_actual": mock_min_amount_out_wei, # Simulate actual = minimum for mock
                    "amount_out_wei_minimum_requested": mock_min_amount_out_wei,
                    "amount_in_wei": mock_amount_in_wei,
                    "token_in": mock_token_in_address,
                    "token_out": mock_token_out_address
                }
                logger.info(f"DEX trade conceptually executed for agent {user_id}. Mocked result: {mock_dex_result}")

                # Conceptual fill recording for DEX:
                # Would involve creating two TradeFillData objects:
                # 1. Debit token_in from agent's balance (e.g., -amount_in_wei of token_in_address)
                # 2. Credit token_out to agent's balance (e.g., +amount_out_wei_actual of token_out_address)
                # These would be recorded using self.trade_history_service.record_fill()
                # This part is complex due to different assets and requires careful handling of prices for P&L.
                if self.trade_history_service:
                    logger.info(f"DEX Conceptual: Would record fills for token_in ({token_in_symbol}) and token_out ({token_out_symbol}) here.")
                    # Example conceptual fill for token_out (credit)
                    fill_timestamp = datetime.now(timezone.utc)
                    conceptual_fill_out = TradeFillData(
                        agent_id=user_id,
                        timestamp=fill_timestamp,
                        asset=token_out_symbol, # Or use address
                        side=TradeSide.BUY, # Receiving token_out
                        quantity=float(mock_dex_result["amount_out_wei_actual"]) / (10**6), # Assuming 6 decimals for mock USDC
                        price=float(trade_params.get("price", 0)), # Price of token_out in terms of token_in, or overall USD price
                        fee=0.0, fee_currency="ETH", # Example fee
                        exchange_order_id=mock_dex_result["tx_hash"],
                        exchange_trade_id=f"DEX_FILL_{uuid.uuid4().hex}"
                    )
                    # await self.trade_history_service.record_fill(conceptual_fill_out)
                    logger.debug(f"DEX Conceptual Fill (token_out): {conceptual_fill_out.model_dump_json(indent=2)}")

                return {"status": "dex_executed_placeholder", "details": mock_dex_result}

            except DEXExecutionServiceError as e:
                logger.error(f"DEX trade execution failed for agent {user_id}: {e}", exc_info=True)
                return {"status": "dex_failed", "error": str(e)}
            except Exception as e:
                logger.error(f"Unexpected error during DEX trade placeholder execution for agent {user_id}: {e}", exc_info=True)
                return {"status": "dex_failed_unexpected", "error": str(e)}
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
                    agent_id_of_proposer = user_id # user_id is the agent for whom the decision is made
                    await self._log_learning_event(
                        event_type="InternalSignalGenerated",
                        data_snapshot=signal_payload.model_dump(),
                        primary_agent_id=agent_id_of_proposer,
                        notes="Signal generated from crew analysis"
                    )

                    # --- Compliance Check ---
                    current_agent_config = await self.agent_management_service.get_agent(agent_id_of_proposer)
                    if not current_agent_config:
                        logger.error(f"TC ({self.agent_id}): Could not retrieve agent config for {agent_id_of_proposer} for compliance check. Skipping trade.")
                        await self._log_learning_event("ComplianceCheckSkipped", {"reason": "Agent config not found"}, primary_agent_id=agent_id_of_proposer)
                        return

                    compliance_result_dict: Optional[Dict] = None
                    if self.compliance_service:
                        compliance_request = ComplianceCheckRequest(
                            agent_id=agent_id_of_proposer,
                            agent_type=current_agent_config.agent_type,
                            action_type="place_order",
                            trade_signal_payload=signal_payload
                        )
                        logger.debug(f"TC ({self.agent_id}): Performing compliance check for agent {agent_id_of_proposer}: {compliance_request.model_dump_json(exclude={'trade_signal_payload'})}")
                        compliance_result = await self.compliance_service.check_action_compliance(compliance_request)
                        compliance_result_dict = compliance_result.model_dump()
                        await self._log_learning_event("ComplianceCheckResult", data_snapshot=compliance_request.model_dump(), outcome=compliance_result_dict, primary_agent_id=agent_id_of_proposer)

                        if not compliance_result.is_compliant:
                            logger.warning(f"TC ({self.agent_id}): Trade for agent {agent_id_of_proposer}, symbol {signal_payload.symbol} REJECTED by ComplianceService. Reasons: {compliance_result.violated_rules}")
                            return
                        logger.info(f"TC ({self.agent_id}): Compliance check PASSED for agent {agent_id_of_proposer}, symbol {signal_payload.symbol}.")
                    else:
                        logger.warning(f"TC ({self.agent_id}): ComplianceService not available. Skipping compliance check for agent {agent_id_of_proposer}.")
                        await self._log_learning_event("ComplianceCheckSkipped", {"reason": "ComplianceService not available"}, primary_agent_id=agent_id_of_proposer)

                    # --- Risk Assessment ---
                    logger.info(f"TC ({self.agent_id}): Assessing risk for agent {agent_id_of_proposer}, signal: {signal_payload.model_dump_json(indent=2)}")
                    assessment_result = await self.risk_manager_service.assess_trade_risk(
                        agent_id_of_proposer=agent_id_of_proposer,
                        trade_signal=signal_payload
                    )
                    await self._log_learning_event("RiskAssessmentResult", data_snapshot={"trade_signal": signal_payload.model_dump(), "proposer_agent_id": agent_id_of_proposer}, outcome=assessment_result.model_dump(), primary_agent_id=agent_id_of_proposer)

                    if assessment_result.signal_approved:
                        logger.info(f"TC ({self.agent_id}): Risk assessment approved for agent {agent_id_of_proposer}. Proceeding with execution.")
                        execution_outcome = await self._execute_trade_decision(trade_params, user_id=agent_id_of_proposer)
                        await self._log_learning_event("TradeExecutionAttempt", data_snapshot={"trade_params": trade_params, "executing_agent_id": agent_id_of_proposer}, outcome=execution_outcome, primary_agent_id=agent_id_of_proposer)
                    else:
                        logger.warning(f"TC ({self.agent_id}): Trade for agent {agent_id_of_proposer}, symbol {trade_params['symbol']} rejected by RiskManagerService: {assessment_result.rejection_reason}")

                else: # action_lower not in buy/sell/hold
                    logger.warning(f"Unknown action '{action_str}' in crew result for agent {user_id}. No trade execution.")
            else: # Missing essential params
                logger.warning(f"Essential trade parameters (action, symbol, quantity) not found in crew result for agent {user_id}: {data}")

        except Exception as e:
            logger.error(f"Error parsing crew result or initiating trade execution for agent {user_id}: {e}", exc_info=True)

    async def setup_event_subscriptions(self):
        if not self.event_bus_service:
            # This case should ideally not be hit if EventBusService is required in __init__
            logger.error(f"TradingCoordinator ({self.agent_id}): EventBusService not provided. Cannot set up subscriptions.")
            return
        await self.event_bus_service.subscribe("TradeSignalEvent", self.handle_external_trade_signal)
        await self.event_bus_service.subscribe("MarketConditionEvent", self.handle_market_condition_event)
        logger.info(f"TradingCoordinator ({self.agent_id}): Subscribed to TradeSignalEvent and MarketConditionEvent.")

    async def handle_external_trade_signal(self, event: Event):
        logger.info(f"TradingCoordinator ({self.agent_id}): Received external TradeSignalEvent (ID: {event.event_id}) from agent {event.publisher_agent_id}.")
        if not isinstance(event.payload, dict):
            logger.error(f"TC ({self.agent_id}): Invalid payload type in TradeSignalEvent: {type(event.payload)}")
            return
        try:
            signal_payload = TradeSignalEventPayload(**event.payload)
        except Exception as e:
            logger.error(f"TC ({self.agent_id}): Failed to parse TradeSignalEventPayload: {e}. Payload: {event.payload}", exc_info=True)
            return

        agent_id_of_proposer = event.publisher_agent_id
        trigger_event_id_for_logs = event.event_id

        await self._log_learning_event(
            event_type="ExternalSignalReceived",
            data_snapshot=signal_payload.model_dump(),
            primary_agent_id=agent_id_of_proposer,
            triggering_event_id=trigger_event_id_for_logs
        )

        if not self.risk_manager_service: # Risk manager is essential, compliance is optional enhancement
            logger.error(f"TC ({self.agent_id}): RiskManagerService not available. Cannot assess trade for external signal.")
            await self._log_learning_event("ProcessingError", {"reason": "RiskManagerService not available"}, primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)
            return

        # --- Compliance Check ---
        current_agent_config = await self.agent_management_service.get_agent(agent_id_of_proposer)
        if not current_agent_config:
            logger.error(f"TC ({self.agent_id}): Could not retrieve agent config for {agent_id_of_proposer} for compliance check on external signal. Skipping trade.")
            await self._log_learning_event("ComplianceCheckSkipped", {"reason": "Agent config not found for external signal"}, primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)
            return

        compliance_result_dict: Optional[Dict] = None
        if self.compliance_service:
            compliance_request = ComplianceCheckRequest(
                agent_id=agent_id_of_proposer,
                agent_type=current_agent_config.agent_type,
                action_type="place_order",
                trade_signal_payload=signal_payload
            )
            logger.debug(f"TC ({self.agent_id}): Performing compliance check for external signal from agent {agent_id_of_proposer}: {compliance_request.model_dump_json(exclude={'trade_signal_payload'})}")
            compliance_result = await self.compliance_service.check_action_compliance(compliance_request)
            compliance_result_dict = compliance_result.model_dump()
            await self._log_learning_event("ComplianceCheckResult", data_snapshot=compliance_request.model_dump(), outcome=compliance_result_dict, primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)

            if not compliance_result.is_compliant:
                logger.warning(f"TC ({self.agent_id}): External trade signal from agent {agent_id_of_proposer}, symbol {signal_payload.symbol} REJECTED by ComplianceService. Reasons: {compliance_result.violated_rules}")
                return
            logger.info(f"TC ({self.agent_id}): Compliance check PASSED for external signal from agent {agent_id_of_proposer}, symbol {signal_payload.symbol}.")
        else:
            logger.warning(f"TC ({self.agent_id}): ComplianceService not available. Skipping compliance check for external signal from agent {agent_id_of_proposer}.")
            await self._log_learning_event("ComplianceCheckSkipped", {"reason": "ComplianceService not available for external signal"}, primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)

        # --- Risk Assessment ---
        logger.info(f"TC ({self.agent_id}): Assessing risk for external signal from agent {agent_id_of_proposer}, signal: {signal_payload.model_dump_json(indent=2)}")
        assessment_result = await self.risk_manager_service.assess_trade_risk(
            agent_id_of_proposer=agent_id_of_proposer,
            trade_signal=signal_payload
        )
        await self._log_learning_event("RiskAssessmentResult", data_snapshot={"trade_signal": signal_payload.model_dump(), "proposer_agent_id": agent_id_of_proposer}, outcome=assessment_result.model_dump(), primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)

        if assessment_result.signal_approved:
            logger.info(f"TC ({self.agent_id}): External signal from {agent_id_of_proposer} for {signal_payload.symbol} APPROVED by RiskManager.")

            if signal_payload.quantity is None:
                logger.error(f"TC ({self.agent_id}): TradeSignalEvent from {agent_id_of_proposer} for {signal_payload.symbol} has no quantity even after Pydantic. Rejecting execution.")
                return

            trade_params = {
                "action": signal_payload.action,
                "symbol": signal_payload.symbol,
                "quantity": signal_payload.quantity,
                "order_type": "limit" if signal_payload.price_target else "market",
                "price": signal_payload.price_target,
                "stop_loss_price": signal_payload.stop_loss,
                "take_profit_price": None,
                "strategy_name": signal_payload.strategy_name,
                "confidence": signal_payload.confidence
            }
            execution_outcome = await self._execute_trade_decision(trade_params, user_id=agent_id_of_proposer)
            await self._log_learning_event("TradeExecutionAttempt", data_snapshot={"trade_params": trade_params, "executing_agent_id": agent_id_of_proposer}, outcome=execution_outcome, primary_agent_id=agent_id_of_proposer, triggering_event_id=trigger_event_id_for_logs)
        else:
            logger.warning(f"TC ({self.agent_id}): External signal from {agent_id_of_proposer} for {signal_payload.symbol} REJECTED by RiskManager: {assessment_result.rejection_reason}")

    async def handle_market_condition_event(self, event: Event):
        logger.info(f"TradingCoordinator ({self.agent_id}): Received MarketConditionEvent (ID: {event.event_id}) from agent {event.publisher_agent_id}.")
        if not isinstance(event.payload, dict):
            logger.error(f"TC ({self.agent_id}): Invalid payload type in MarketConditionEvent: {type(event.payload)}")
            return
        try:
            condition_payload = MarketConditionEventPayload(**event.payload)
            logger.debug(f"TC ({self.agent_id}): Market Condition for {condition_payload.symbol}: {condition_payload.regime}, Confidence: {condition_payload.confidence_score}. Data: {condition_payload.supporting_data}")
            # TODO: Implement logic for TC to react to market conditions,
            # e.g., adjust internal parameters, influence CrewAI tasks, or inform a meta-strategy.
        except Exception as e:
            logger.error(f"TC ({self.agent_id}): Failed to parse MarketConditionEventPayload: {e}. Payload: {event.payload}", exc_info=True)


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