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

# Add imports for PaperTradeOrder and related enums
from ..models.paper_trading_models import PaperTradeOrder, PaperTradeFill
from ..models.trading_history_models import TradeSide, OrderType as PaperOrderType
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
                 simulated_trade_executor: SimulatedTradeExecutor # Added
                ):
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.simulated_trade_executor = simulated_trade_executor # Added
        self.base_url = "http://localhost:3000/api/agents/trading"
        logger.info("TradingCoordinator initialized with SimulatedTradeExecutor. Analysis will be delegated to trading_analysis_crew.")

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
            return result
        except Exception as e:
            logger.error(f"Error during trading_analysis_crew kickoff via TradingCoordinator: {e}", exc_info=True)
            # Depending on desired error handling, could raise a custom service exception here.
            # For now, re-raising a generic Exception to be caught by the main API handler.
            raise Exception(f"Failed to analyze trading opportunity due to crew execution error: {e}")