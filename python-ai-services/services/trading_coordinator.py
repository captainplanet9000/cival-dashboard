"""
Enhanced Trading Coordinator with execution capabilities
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from loguru import logger
import httpx
import json

from ..utils.google_sdk_bridge import GoogleSDKBridge
from ..utils.a2a_protocol import A2AProtocol
from ..types.trading_types import *


class TradingCoordinator:
    """Enhanced Trading Coordinator with PydanticAI intelligence"""
    
    def __init__(self, google_bridge: GoogleSDKBridge, a2a_protocol: A2AProtocol):
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.base_url = "http://localhost:3000/api/agents/trading"
        
        # Initialize the PydanticAI agent
        self.agent = Agent(
            'google-gla:gemini-1.5-pro',
            system_prompt="""You are an expert trading coordinator responsible for:
            1. Analyzing market conditions and opportunities
            2. Making informed trading decisions based on multiple data sources
            3. Managing risk and position sizing
            4. Coordinating with other specialized agents
            5. Executing trades through the trading API
            
            Always prioritize risk management and follow strict position limits.""",
            retries=3
        )
        
        # Register tools
        self._register_tools()
        
    def _register_tools(self):
        """Register agent tools for trading operations"""
        
        @self.agent.tool
        async def analyze_market_conditions(
            ctx: RunContext[Dict],
            symbol: str,
            timeframe: str = "1h"
        ) -> MarketAnalysis:
            """Analyze current market conditions for a symbol"""
            # Communicate with market analyst agent
            response = await self.a2a_protocol.send_message(
                to_agent="market-analyst",
                message_type="analyze_request",
                payload={
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "indicators": ["RSI", "MACD", "BB", "EMA"]
                }
            )
            
            return MarketAnalysis(**response.payload)
            
        @self.agent.tool
        async def check_risk_limits(
            ctx: RunContext[Dict],
            portfolio_id: str,
            proposed_trade: Dict
        ) -> RiskAssessment:
            """Check if proposed trade meets risk limits"""
            # Communicate with risk monitor agent
            response = await self.a2a_protocol.send_message(
                to_agent="risk-monitor",
                message_type="risk_check",
                payload={
                    "portfolio_id": portfolio_id,
                    "proposed_trade": proposed_trade
                }
            )
            
            return RiskAssessment(**response.payload)
    
    async def execute_trade(self, trade_request: Dict) -> Dict:
        """Execute a trade through the Next.js API"""
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
                        "agent_id": trade_request.get("agentId"),
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
            logger.error(f"Unexpected error executing trade: {str(e)}")
            raise
    
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
            logger.error(f"Unexpected error registering agent: {str(e)}")
            raise
    
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
            logger.error(f"Unexpected error getting agent status: {str(e)}")
            raise
    
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
            logger.error(f"Unexpected error getting agent trading history: {str(e)}")
            raise
            
    async def analyze_trading_opportunity(self, request: TradingAnalysisRequest) -> Dict:
        """Analyze trading opportunity with PydanticAI intelligence"""
        try:
            # Get market analysis
            market_analysis = await self.agent.tools.analyze_market_conditions(
                symbol=request.symbol,
                timeframe=request.context.get("timeframe", "1h") if request.context else "1h"
            )
            
            # Formulate trading decision request
            prompt = f"""
            Analyze this trading opportunity:
            
            Symbol: {request.symbol}
            Market Condition: {market_analysis.condition}
            Trend Direction: {market_analysis.trend_direction}
            Trend Strength: {market_analysis.trend_strength}
            Support Levels: {market_analysis.support_levels}
            Resistance Levels: {market_analysis.resistance_levels}
            Technical Indicators: {json.dumps(market_analysis.indicators)}
            
            Additional Context:
            {json.dumps(request.context) if request.context else "No additional context"}
            
            Recommend a trading action (buy, sell, hold) with:
            1. Clear reasoning
            2. Position size recommendation
            3. Risk assessment
            4. Entry price (if applicable)
            5. Stop loss and take profit levels
            """
            
            # Get AI trading decision
            decision = await self.agent.run(prompt)
            
            # Check if proposed trade meets risk limits
            if request.account_id and ("buy" in decision.lower() or "sell" in decision.lower()):
                proposed_trade = {
                    "symbol": request.symbol,
                    "action": "buy" if "buy" in decision.lower() else "sell",
                    "account_id": request.account_id
                }
                
                risk_assessment = await self.agent.tools.check_risk_limits(
                    portfolio_id=request.account_id,
                    proposed_trade=proposed_trade
                )
                
                # Include risk assessment in response
                return {
                    "symbol": request.symbol,
                    "analysis": market_analysis.dict(),
                    "decision": decision,
                    "risk_assessment": risk_assessment.dict(),
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Return analysis without risk assessment
            return {
                "symbol": request.symbol,
                "analysis": market_analysis.dict(),
                "decision": decision,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trading opportunity: {str(e)}")
            raise