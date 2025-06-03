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
from ..models.trading_history_models import TradeSide, OrderType as PaperOrderType # Assuming TradeSide is the common one
from ..models.hyperliquid_models import HyperliquidPlaceOrderParams # Added
from datetime import timezone # Ensure timezone is available for datetime.now(timezone.utc)
import uuid


class TradingCoordinator:
    """
    Coordinates trading analysis by leveraging specialized CrewAI crews.
    Other functionalities like trade execution are delegated to external APIs or simulators.
    """
    
    def __init__(self,
                 google_bridge: GoogleSDKBridge,
                 a2a_protocol: A2AProtocol,
                 simulated_trade_executor: SimulatedTradeExecutor, # Existing
                 hyperliquid_execution_service: Optional[HyperliquidExecutionService] = None # Added
                ):
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.simulated_trade_executor = simulated_trade_executor
        self.hyperliquid_execution_service = hyperliquid_execution_service # Added
        self.trade_execution_mode: str = "paper" # Added, default to paper

        self.base_url = "http://localhost:3000/api/agents/trading" # This seems like a remnant, consider removing if not used
        logger.info("TradingCoordinator initialized.")
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
            if self.hyperliquid_execution_service:
                logger.info("Attempting LIVE trade execution via HyperliquidExecutionService.")
                try:
                    is_buy = trade_params["action"].lower() == "buy"

                    order_type_params: Dict[str, Any]
                    if trade_params["order_type"].lower() == "limit":
                        if "price" not in trade_params or trade_params["price"] is None:
                            raise ValueError("Price is required for limit order.")
                        order_type_params = {"limit": {"tif": "Gtc"}}
                        limit_px_for_sdk = trade_params["price"]
                    elif trade_params["order_type"].lower() == "market":
                        order_type_params = {"market": {"tif": "Ioc"}}
                        limit_px_for_sdk = trade_params.get("price", 0.0)
                    else:
                        raise ValueError(f"Unsupported order type for Hyperliquid: {trade_params['order_type']}")

                    hl_order_params = HyperliquidPlaceOrderParams(
                        asset=trade_params["symbol"].upper(),
                        is_buy=is_buy,
                        sz=float(trade_params["quantity"]),
                        limit_px=float(limit_px_for_sdk),
                        order_type=order_type_params,
                        reduce_only=False
                    )

                    logger.debug(f"Constructed HyperliquidPlaceOrderParams: {hl_order_params.model_dump_json()}")
                    result = await self.hyperliquid_execution_service.place_order(hl_order_params)
                    logger.info(f"Live trade executed via Hyperliquid. Response: {result.model_dump_json()}")
                    return {"status": "live_executed", "details": result.model_dump()}
                except (HyperliquidExecutionServiceError, ValueError) as e:
                    logger.error(f"Live trade execution failed: {e}", exc_info=True)
                    return {"status": "live_failed", "error": str(e)}
                except Exception as e:
                    logger.error(f"Unexpected error during live trade execution: {e}", exc_info=True)
                    return {"status": "live_failed", "error": f"Unexpected error: {str(e)}"}
            else:
                logger.warning("Live trade mode selected, but HyperliquidExecutionService is not available.")
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
            # Example: Crew might output a dict with 'action', 'symbol', 'quantity', 'order_type', 'price'
            action = data.get("action", data.get("trading_decision", {}).get("action"))
            symbol = data.get("symbol", data.get("trading_decision", {}).get("symbol"))
            quantity = data.get("quantity", data.get("trading_decision", {}).get("quantity"))
            order_type = data.get("order_type", data.get("trading_decision", {}).get("order_type", "market")) # Default to market
            price = data.get("price", data.get("trading_decision", {}).get("price")) # For limit orders

            if action and symbol and quantity:
                if action.lower() in ["buy", "sell"]:
                    trade_params = {
                        "action": action.lower(),
                        "symbol": symbol,
                        "quantity": float(quantity), # Ensure quantity is float
                        "order_type": order_type.lower(),
                    }
                    if order_type.lower() == "limit" and price is not None:
                        trade_params["price"] = float(price) # Ensure price is float

                    logger.info(f"Extracted trade parameters: {trade_params}")
                    await self._execute_trade_decision(trade_params, user_id)
                elif action.lower() == "hold":
                    logger.info(f"Crew decision is 'hold' for {symbol}. No trade execution.")
                else:
                    logger.warning(f"Unknown action '{action}' in crew result. No trade execution.")
            else:
                logger.warning(f"Essential trade parameters (action, symbol, quantity) not found in crew result: {data}")

        except Exception as e:
            logger.error(f"Error parsing crew result or initiating trade execution: {e}", exc_info=True)


    async def execute_trade(self, trade_request: Dict) -> Dict:
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