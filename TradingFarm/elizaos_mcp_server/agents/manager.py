"""
ElizaOS Agent Manager for Trading Farm

This module provides a service layer between the dashboard and the multi-agent coordination system.
It handles agent creation, command processing, and response formatting for the UI.
"""
import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from .coordinator import get_coordinator, AgentMessage
from ..config import ELIZAOS_CONFIG, CHAIN_CONFIGS, RISK_CONFIG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("agent_manager")

class ElizaOSAgentManager:
    """
    Manages ElizaOS agents and provides an interface for the dashboard to
    communicate with the multi-agent system.
    """
    
    def __init__(self):
        self.coordinator = get_coordinator()
        self.simulation_mode = ELIZAOS_CONFIG.get("simulation_mode", True)
        self.command_history = []
        self.response_cache = {}
        
        # Start the coordinator if not already running
        if not self.coordinator.active:
            self.coordinator.start()
            logger.info("Started multi-agent coordinator")
    
    async def process_command(self, command: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a command from the dashboard and return a response.
        
        Args:
            command: The command string from the ElizaOS AI Command Console
            parameters: Optional parameters for the command
            
        Returns:
            Dict containing the command response
        """
        # Store command in history
        command_entry = {
            "timestamp": datetime.now().isoformat(),
            "command": command,
            "parameters": parameters or {}
        }
        self.command_history.append(command_entry)
        
        # Log the command
        logger.info(f"Processing command: {command} with params: {parameters}")
        
        # Parse the command to determine the intent
        try:
            response = await self._route_command(command, parameters or {})
            
            # Add command ID for dashboard to reference
            response["command_id"] = f"cmd_{int(time.time())}"
            response["simulation_mode"] = self.simulation_mode
            
            # Cache the response
            self.response_cache[response["command_id"]] = response
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing command: {str(e)}")
            return {
                "command_id": f"cmd_{int(time.time())}",
                "status": "error",
                "message": f"Error processing command: {str(e)}",
                "simulation_mode": self.simulation_mode
            }
    
    async def _route_command(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Route the command to the appropriate handler"""
        command_lower = command.lower()
        
        # Basic command routing logic
        if any(k in command_lower for k in ["analyze", "market", "price"]):
            return await self._handle_market_analysis(command, parameters)
            
        elif any(k in command_lower for k in ["trade", "buy", "sell", "order"]):
            return await self._handle_trade_execution(command, parameters)
            
        elif any(k in command_lower for k in ["risk", "assess", "portfolio"]):
            return await self._handle_risk_assessment(command, parameters)
            
        elif any(k in command_lower for k in ["optimize", "strategy", "backtest"]):
            return await self._handle_strategy_optimization(command, parameters)
            
        elif any(k in command_lower for k in ["status", "system", "health"]):
            return await self._handle_system_status(command, parameters)
            
        elif any(k in command_lower for k in ["cross", "arbitrage", "opportunity"]):
            return await self._handle_cross_chain(command, parameters)
            
        else:
            # Default to general query
            return await self._handle_general_query(command, parameters)
    
    async def _handle_market_analysis(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle market analysis commands"""
        # Extract market and timeframe from command if not in parameters
        if "market" not in parameters:
            # Simple parsing logic - in production, this would use NLP
            words = command.split()
            for i, word in enumerate(words):
                if word.upper() in self._get_all_assets():
                    parameters["market"] = word.upper()
                    break
        
        if "timeframe" not in parameters:
            # Look for common timeframes
            timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
            words = command.split()
            for word in words:
                if word in timeframes:
                    parameters["timeframe"] = word
                    break
            if "timeframe" not in parameters:
                parameters["timeframe"] = "1h"  # Default
        
        market = parameters.get("market", "ETH")
        timeframe = parameters.get("timeframe", "1h")
        
        # Send request to market analysis agents
        message = {
            "sender_id": "dashboard",
            "message_type": "market_analysis_request",
            "content": {
                "market": market,
                "timeframe": timeframe,
                "target_specialization": "market_analysis"
            }
        }
        
        message_id = self.coordinator.send_message(message)
        logger.info(f"Sent market analysis request with ID {message_id}")
        
        # In a real implementation, we would wait for agent responses
        # For now, simulate a response after a short delay
        await asyncio.sleep(1)
        
        # Simulated response
        return {
            "status": "success",
            "message_type": "market_analysis",
            "message": f"Market analysis for {market} on {timeframe} timeframe",
            "data": {
                "market": market,
                "timeframe": timeframe,
                "trend": "bullish" if hash(f"{market}_{timeframe}_{datetime.now().hour}") % 2 == 0 else "bearish",
                "confidence": 0.7 + (hash(f"{market}_{datetime.now().minute}") % 30) / 100,
                "indicators": {
                    "rsi": 65 + (hash(market) % 20),
                    "macd": "positive_crossover" if hash(f"{market}_{datetime.now().minute}") % 2 == 0 else "negative_crossover",
                    "support": f"${100 - (hash(market) % 10)}",
                    "resistance": f"${100 + (hash(market) % 20)}"
                },
                "recommendation": "buy" if hash(f"{market}_{timeframe}_{datetime.now().hour}") % 3 != 0 else "sell",
                "analysis": f"{market} is showing {'strong' if hash(market) % 2 == 0 else 'moderate'} momentum. "
                           f"Volume is {'increasing' if hash(f'{market}_{datetime.now().minute}') % 2 == 0 else 'stable'}, "
                           f"and sentiment analysis indicates {'positive' if hash(f'{market}_{datetime.now().hour}') % 2 == 0 else 'mixed'} market perception."
            }
        }
    
    async def _handle_trade_execution(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle trade execution commands"""
        # Extract trade parameters
        if "market" not in parameters:
            words = command.split()
            for i, word in enumerate(words):
                if word.upper() in self._get_all_assets():
                    parameters["market"] = word.upper()
                    break
        
        if "side" not in parameters:
            if any(k in command.lower() for k in ["buy", "long"]):
                parameters["side"] = "buy"
            elif any(k in command.lower() for k in ["sell", "short"]):
                parameters["side"] = "sell"
        
        if "size" not in parameters:
            # Simple parsing - look for numbers followed by market name
            words = command.split()
            for i, word in enumerate(words):
                try:
                    size = float(word)
                    if i+1 < len(words) and words[i+1].upper() in self._get_all_assets():
                        parameters["size"] = size
                        if "market" not in parameters:
                            parameters["market"] = words[i+1].upper()
                        break
                except (ValueError, TypeError):
                    continue
        
        if "chain" not in parameters:
            # Try to determine chain from command
            for chain in CHAIN_CONFIGS.keys():
                if chain.lower() in command.lower():
                    parameters["chain"] = chain
                    break
            
            # If still not found, find a chain that supports the market
            if "chain" not in parameters and "market" in parameters:
                market = parameters["market"]
                for chain, config in CHAIN_CONFIGS.items():
                    if market in config.get("assets", []):
                        parameters["chain"] = chain
                        break
        
        # Set defaults if still missing
        market = parameters.get("market", "ETH")
        side = parameters.get("side", "buy")
        size = parameters.get("size", 0.1)
        chain = parameters.get("chain", "hyperliquid")
        
        # Perform risk check before execution
        risk_check = {
            "sender_id": "dashboard",
            "message_type": "risk_assessment_request",
            "content": {
                "trade_info": {
                    "market": market,
                    "side": side,
                    "size": size,
                    "chain": chain,
                    "trade_id": f"trade_{int(time.time())}"
                },
                "target_specialization": "risk_management"
            }
        }
        
        risk_message_id = self.coordinator.send_message(risk_check)
        logger.info(f"Sent risk assessment request with ID {risk_message_id}")
        
        # In a real implementation, we would wait for risk assessment response
        # For simulation, add a delay and proceed
        await asyncio.sleep(1)
        
        # Simulate risk check - usually always approve in simulation mode
        risk_acceptable = True
        risk_notes = []
        
        # If risk is acceptable, execute the trade
        if risk_acceptable:
            execute_request = {
                "sender_id": "dashboard",
                "message_type": "trade_execution_request",
                "content": {
                    "trade_details": {
                        "market": market,
                        "side": side,
                        "size": size,
                        "chain": chain,
                        "order_type": parameters.get("order_type", "market")
                    },
                    "target_specialization": "execution",
                    "target_chain": chain
                }
            }
            
            execution_message_id = self.coordinator.send_message(execute_request)
            logger.info(f"Sent trade execution request with ID {execution_message_id}")
            
            # Simulate execution response
            await asyncio.sleep(1)
            
            execution_price = 100 + (hash(f"{market}_{datetime.now().minute}") % 10)
            
            return {
                "status": "success",
                "message_type": "trade_execution",
                "message": f"Executed {side.upper()} order for {size} {market} on {chain}",
                "data": {
                    "trade_id": f"trade_{int(time.time())}_{market}",
                    "market": market,
                    "side": side.upper(),
                    "size": size,
                    "execution_price": execution_price,
                    "total_value": size * execution_price,
                    "chain": chain,
                    "timestamp": datetime.now().isoformat(),
                    "status": "filled",
                    "fees": size * execution_price * 0.001,
                    "risk_notes": risk_notes
                }
            }
        else:
            return {
                "status": "error",
                "message_type": "trade_execution",
                "message": "Trade execution blocked by risk management",
                "data": {
                    "market": market,
                    "side": side.upper(),
                    "size": size,
                    "chain": chain,
                    "reason": "Risk management rules violated",
                    "risk_notes": risk_notes
                }
            }
    
    async def _handle_risk_assessment(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle risk assessment commands"""
        # Determine what to assess
        assessment_type = "portfolio"  # Default
        
        if "type" in parameters:
            assessment_type = parameters["type"]
        elif "position" in command.lower() or any(asset.lower() in command.lower() for asset in self._get_all_assets()):
            assessment_type = "position"
            
            # Try to extract the asset
            for asset in self._get_all_assets():
                if asset.lower() in command.lower():
                    parameters["market"] = asset
                    break
        
        # Generate portfolio risk assessment
        if assessment_type == "portfolio":
            # In a real implementation, we would gather data from all chain adapters
            # For simulation, generate a portfolio summary
            
            # Simulated portfolio data
            portfolio = {
                "total_value": 10000 + (hash(str(datetime.now().date())) % 5000),
                "positions": [
                    {
                        "market": "ETH",
                        "size": 1.5,
                        "value": 4500,
                        "unrealized_pnl_percent": 5.2,
                        "chain": "hyperliquid"
                    },
                    {
                        "market": "BTC",
                        "size": 0.12,
                        "value": 3600,
                        "unrealized_pnl_percent": -2.1,
                        "chain": "arbitrum"
                    },
                    {
                        "market": "SOL",
                        "size": 20,
                        "value": 1800,
                        "unrealized_pnl_percent": 12.3,
                        "chain": "solana"
                    }
                ]
            }
            
            # Calculate risk metrics
            max_position_size = max(position["value"] for position in portfolio["positions"])
            max_position_percent = (max_position_size / portfolio["total_value"]) * 100
            
            # Compared to risk limits
            max_allowed_position = RISK_CONFIG["max_position_size_percent"]
            position_size_risk = max_position_percent > max_allowed_position
            
            # Concentration risk - if top position is more than half the portfolio
            concentration_risk = max_position_percent > 50
            
            return {
                "status": "success",
                "message_type": "risk_assessment",
                "message": "Portfolio risk assessment",
                "data": {
                    "portfolio_value": f"${portfolio['total_value']}",
                    "risk_metrics": {
                        "var_95": f"${portfolio['total_value'] * 0.05}",  # 5% VaR
                        "max_drawdown": f"{3.5}%",
                        "sharpe_ratio": 1.2,
                        "largest_position_percent": f"{max_position_percent:.1f}%",
                        "correlation_risk": "medium",
                        "volatility": "medium"
                    },
                    "risk_flags": [
                        "Position size exceeds recommended limit" if position_size_risk else None,
                        "High concentration in a single asset" if concentration_risk else None
                    ],
                    "recommendations": [
                        "Consider reducing ETH position size" if max_position_percent > max_allowed_position else None,
                        "Diversify into more assets" if concentration_risk else None,
                        "Set stop-loss orders on large positions"
                    ]
                }
            }
        else:
            # Position-specific risk assessment
            market = parameters.get("market", "ETH")
            chain = parameters.get("chain", "hyperliquid")
            
            # Simulated position data
            position_size = 1.5 if market == "ETH" else 0.1
            position_value = position_size * (3000 if market == "ETH" else 30000)  # Simulated price
            
            # Risk metrics
            liquidation_price = position_value * 0.8  # 20% down
            stop_loss_recommended = position_value * 0.95  # 5% down
            
            return {
                "status": "success",
                "message_type": "risk_assessment",
                "message": f"Risk assessment for {market} position",
                "data": {
                    "market": market,
                    "position_size": position_size,
                    "position_value": f"${position_value}",
                    "chain": chain,
                    "risk_metrics": {
                        "liquidation_price": f"${liquidation_price}",
                        "stop_loss_recommended": f"${stop_loss_recommended}",
                        "position_size_percent": f"{(position_value / 10000) * 100:.1f}%",
                        "risk_reward_ratio": 1.5,
                        "expected_drawdown": f"{5.0}%"
                    },
                    "recommendations": [
                        f"Set stop-loss at ${stop_loss_recommended}",
                        "Consider partial take-profit at resistance levels",
                        f"Maximum recommended position: {position_size * 1.2} {market}"
                    ]
                }
            }
    
    async def _handle_strategy_optimization(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle strategy optimization commands"""
        # Extract strategy name if not in parameters
        if "strategy" not in parameters:
            # Look for quoted strategy name
            import re
            match = re.search(r'"([^"]*)"', command)
            if match:
                parameters["strategy"] = match.group(1)
            else:
                # Default strategy
                parameters["strategy"] = "Mean Reversion ETH"
        
        strategy_name = parameters.get("strategy", "Mean Reversion ETH")
        
        # Simulated optimization results
        optimization_results = {
            "strategy_name": strategy_name,
            "current_metrics": {
                "sharpe_ratio": 1.8,
                "win_rate": 58,
                "profit_factor": 1.5,
                "max_drawdown": "7.2%"
            },
            "optimized_parameters": {
                "entry_threshold": 0.4,
                "exit_threshold": 0.7,
                "stop_loss_percent": 2.5,
                "take_profit_percent": 5.0,
                "moving_average_period": 14
            },
            "optimized_metrics": {
                "sharpe_ratio": 2.2,
                "win_rate": 62,
                "profit_factor": 1.8,
                "max_drawdown": "5.8%"
            },
            "improvement": {
                "sharpe_ratio": "+22%",
                "win_rate": "+4%",
                "profit_factor": "+20%",
                "max_drawdown": "-19%"
            }
        }
        
        return {
            "status": "success",
            "message_type": "strategy_optimization",
            "message": f"Optimization results for strategy: {strategy_name}",
            "data": optimization_results
        }
    
    async def _handle_system_status(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle system status commands"""
        # Get agent status from coordinator
        agent_status = self.coordinator.get_agent_status()
        
        # Simulated system status
        system_status = {
            "elizaos_version": "2.1.0",
            "simulation_mode": self.simulation_mode,
            "agent_system": {
                "total_agents": agent_status["total_agents"],
                "agents_by_chain": agent_status["agents_by_chain"],
                "agents_by_specialization": agent_status["agents_by_specialization"]
            },
            "connected_chains": {
                chain: {
                    "status": "connected" if hash(f"{chain}_{datetime.now().minute}") % 10 != 0 else "reconnecting",
                    "latency_ms": hash(chain) % 100 + 50
                }
                for chain in CHAIN_CONFIGS.keys()
            },
            "memory_usage": {
                "total_memory_entries": sum(len(agent.memory) for agent in self.coordinator.agents.values()),
                "command_history_size": len(self.command_history)
            },
            "uptime": "1d 5h 32m", # Simulated
            "system_load": f"{hash(str(datetime.now().minute)) % 30 + 10}%"
        }
        
        return {
            "status": "success",
            "message_type": "system_status",
            "message": "ElizaOS system status report",
            "data": system_status
        }
    
    async def _handle_cross_chain(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cross-chain opportunity commands"""
        # For simplicity, return a list of current cross-chain opportunities
        # In a real implementation, this would query the coordinator for active opportunities
        
        # Simulate finding 1-3 opportunities
        num_opportunities = hash(str(datetime.now().minute)) % 3 + 1
        opportunities = []
        
        common_assets = self._get_common_assets()
        
        for i in range(num_opportunities):
            # Pick an asset that exists on multiple chains
            if not common_assets:
                break
                
            asset = common_assets[hash(f"{i}_{datetime.now().minute}") % len(common_assets)]
            
            # Pick two chains that support this asset
            supporting_chains = []
            for chain, config in CHAIN_CONFIGS.items():
                if asset in config.get("assets", []):
                    supporting_chains.append(chain)
            
            if len(supporting_chains) < 2:
                continue
                
            source_chain = supporting_chains[hash(f"{asset}_{i}") % len(supporting_chains)]
            remaining_chains = [c for c in supporting_chains if c != source_chain]
            target_chain = remaining_chains[hash(f"{asset}_{i}_{source_chain}") % len(remaining_chains)]
            
            # Simulate price difference
            price_diff_percent = hash(f"{asset}_{source_chain}_{target_chain}_{datetime.now().hour}") % 3 + 0.5
            
            opportunities.append({
                "id": f"opportunity_{int(time.time())}_{i}_{asset}",
                "type": "arbitrage",
                "asset": asset,
                "source_chain": source_chain,
                "target_chain": target_chain,
                "price_difference_percent": f"{price_diff_percent:.2f}%",
                "estimated_profit": f"{price_diff_percent * 0.8:.2f}%",
                "trade_size_recommendation": f"{hash(asset) % 10 + 1} {asset}",
                "risk_level": "low" if price_diff_percent < 1 else "medium" if price_diff_percent < 2 else "high",
                "confidence": f"{hash(f'{asset}_{datetime.now().minute}') % 20 + 70}%"
            })
        
        return {
            "status": "success",
            "message_type": "cross_chain_opportunities",
            "message": f"Found {len(opportunities)} cross-chain opportunities",
            "data": {
                "opportunities": opportunities,
                "cross_chain_enabled": ELIZAOS_CONFIG["cross_chain_enabled"],
                "last_scan": datetime.now().isoformat(),
                "scan_frequency": f"{ELIZAOS_CONFIG['cross_chain_coordination_interval_seconds']} seconds"
            }
        }
    
    async def _handle_general_query(self, command: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle general queries that don't match specific categories"""
        # In a real implementation, this would use a more advanced NLP system
        # or pass the query to a general AI model
        
        return {
            "status": "success",
            "message_type": "general_response",
            "message": "Processing your request...",
            "data": {
                "response": f"I've received your command: '{command}'. "
                           f"Could you please be more specific about what you'd like me to do? "
                           f"You can ask for market analysis, execute trades, check risks, optimize strategies, "
                           f"or look for cross-chain opportunities."
            }
        }
    
    def _get_all_assets(self) -> List[str]:
        """Get all supported assets across all chains"""
        all_assets = []
        for config in CHAIN_CONFIGS.values():
            all_assets.extend(config.get("assets", []))
        return list(set(all_assets))  # Remove duplicates
    
    def _get_common_assets(self) -> List[str]:
        """Get assets that exist on multiple chains"""
        assets_by_chain = {chain: config.get("assets", []) for chain, config in CHAIN_CONFIGS.items()}
        
        # Count asset occurrences
        asset_counts = {}
        for assets in assets_by_chain.values():
            for asset in assets:
                asset_counts[asset] = asset_counts.get(asset, 0) + 1
        
        # Return assets that exist on at least 2 chains
        return [asset for asset, count in asset_counts.items() if count >= 2]


# Singleton instance
agent_manager = ElizaOSAgentManager()

def get_agent_manager() -> ElizaOSAgentManager:
    """Get the global agent manager instance"""
    return agent_manager


if __name__ == "__main__":
    # Example usage
    async def test():
        mgr = get_agent_manager()
        
        # Process a market analysis command
        response = await mgr.process_command("analyze market ETH 4h")
        print(json.dumps(response, indent=2))
        
        # Process a trade execution command
        response = await mgr.process_command("buy 0.1 ETH on hyperliquid")
        print(json.dumps(response, indent=2))
        
        # Process a risk assessment command
        response = await mgr.process_command("assess portfolio risk")
        print(json.dumps(response, indent=2))
    
    import asyncio
    asyncio.run(test())
