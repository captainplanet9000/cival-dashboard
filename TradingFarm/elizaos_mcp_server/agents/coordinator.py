"""
Multi-Agent Coordinator Module for ElizaOS Trading Farm

This module handles cross-chain coordination among specialized agent groups,
enabling complex trading strategies that operate across multiple blockchains.
"""
import os
import json
import time
import logging
import asyncio
import threading
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta

from ..config import ELIZAOS_CONFIG, CHAIN_CONFIGS, RISK_CONFIG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("coordinator")

class AgentMessage:
    """Represents a message between agents in the system"""
    
    def __init__(self, sender_id: str, message_type: str, content: Dict[str, Any], 
                 recipient_id: Optional[str] = None, priority: int = 1):
        self.id = f"msg_{int(time.time() * 1000)}_{sender_id[-8:]}"
        self.timestamp = datetime.now().isoformat()
        self.sender_id = sender_id
        self.recipient_id = recipient_id  # None = broadcast
        self.message_type = message_type
        self.content = content
        self.priority = priority  # 1-5, with 5 being highest
        self.processed = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "message_type": self.message_type,
            "content": self.content,
            "priority": self.priority,
            "processed": self.processed
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentMessage':
        """Create from dictionary after deserialization"""
        message = cls(
            sender_id=data["sender_id"],
            message_type=data["message_type"],
            content=data["content"],
            recipient_id=data.get("recipient_id"),
            priority=data.get("priority", 1)
        )
        message.id = data["id"]
        message.timestamp = data["timestamp"]
        message.processed = data.get("processed", False)
        return message


class Agent:
    """Base agent class for all specialized agents in the system"""
    
    def __init__(self, agent_id: str, chain: str, specialization: str):
        self.agent_id = agent_id
        self.chain = chain
        self.specialization = specialization
        self.status = "initializing"
        self.last_active = datetime.now()
        self.memory = []  # Simple memory storage for this agent
        self.message_queue = []
        self.model = ELIZAOS_CONFIG["specialized_models"].get(
            specialization, 
            ELIZAOS_CONFIG["default_model"]
        )
        
        # For real implementation, these would be integrated with actual AI models
        self.confidence_threshold = ELIZAOS_CONFIG["decision_framework"]["confidence_threshold"]
        
        logger.info(f"Agent {agent_id} initialized for {chain} with specialization: {specialization}")
    
    def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process an incoming message and optionally return a response"""
        self.last_active = datetime.now()
        self.message_queue.append(message)
        
        # In a real implementation, this would run the message through the agent's AI model
        # For simulation, we'll just log and return a mock response
        logger.info(f"Agent {self.agent_id} received message of type {message.message_type}")
        
        # Store in agent memory
        self.memory.append({
            "timestamp": datetime.now().isoformat(),
            "message_id": message.id,
            "message_type": message.message_type,
            "content_summary": str(message.content)[:100] + "..."
        })
        
        # Create a simulated response based on message type
        if message.message_type == "market_analysis_request":
            return self._handle_market_analysis(message)
        elif message.message_type == "risk_assessment_request":
            return self._handle_risk_assessment(message)
        elif message.message_type == "trade_execution_request":
            return self._handle_trade_execution(message)
        elif message.message_type == "cross_chain_opportunity":
            return self._handle_cross_chain_opportunity(message)
        else:
            logger.warning(f"Agent {self.agent_id} received unknown message type: {message.message_type}")
            return None
    
    def _handle_market_analysis(self, message: AgentMessage) -> AgentMessage:
        """Handle a market analysis request"""
        if self.specialization != "market_analysis":
            return AgentMessage(
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="error_response",
                content={"error": "Not a market analysis agent", "original_request": message.content}
            )
        
        # Simulate analysis result
        market = message.content.get("market", "unknown")
        timeframe = message.content.get("timeframe", "1h")
        
        return AgentMessage(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            message_type="market_analysis_response",
            content={
                "market": market,
                "timeframe": timeframe,
                "trend": "bullish" if hash(f"{market}_{timeframe}_{datetime.now().hour}") % 2 == 0 else "bearish",
                "confidence": 0.7 + (hash(f"{market}_{self.agent_id}") % 30) / 100,
                "indicators": {
                    "rsi": 65 + (hash(market) % 20),
                    "macd": "positive_crossover" if hash(f"{market}_{datetime.now().minute}") % 2 == 0 else "negative_crossover",
                    "support": 100 - (hash(market) % 10),
                    "resistance": 100 + (hash(market) % 20)
                },
                "recommendation": "buy" if hash(f"{market}_{timeframe}_{datetime.now().hour}") % 3 != 0 else "sell"
            }
        )
    
    def _handle_risk_assessment(self, message: AgentMessage) -> AgentMessage:
        """Handle a risk assessment request"""
        if self.specialization != "risk_management":
            return AgentMessage(
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="error_response",
                content={"error": "Not a risk management agent", "original_request": message.content}
            )
        
        # Extract trade information
        trade_info = message.content.get("trade_info", {})
        
        # Calculate simulated risk metrics
        position_size = trade_info.get("size", 0)
        market = trade_info.get("market", "unknown")
        
        # Apply risk management rules from config
        max_position_size = RISK_CONFIG["max_position_size_percent"] / 100
        current_exposure = 0.1 + (hash(f"{market}_{datetime.now().minute}") % 10) / 100  # Simulated current exposure
        
        risk_acceptable = (current_exposure + (position_size * 0.01)) <= max_position_size
        
        return AgentMessage(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            message_type="risk_assessment_response",
            content={
                "trade_id": trade_info.get("trade_id", "unknown"),
                "risk_acceptable": risk_acceptable,
                "risk_metrics": {
                    "position_size_percent": position_size * 0.01,
                    "current_exposure": current_exposure,
                    "max_allowed_exposure": max_position_size,
                    "var_1d_95": position_size * 0.05,
                    "expected_drawdown": position_size * 0.02,
                    "portfolio_impact": "low" if position_size < 10 else "medium"
                },
                "recommendations": [] if risk_acceptable else ["reduce_position_size", "add_stop_loss"]
            }
        )
    
    def _handle_trade_execution(self, message: AgentMessage) -> AgentMessage:
        """Handle a trade execution request"""
        if self.specialization != "execution":
            return AgentMessage(
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="error_response",
                content={"error": "Not an execution agent", "original_request": message.content}
            )
        
        # Extract trade details
        trade_details = message.content.get("trade_details", {})
        market = trade_details.get("market", "unknown")
        side = trade_details.get("side", "buy")
        size = trade_details.get("size", 0)
        
        # Simulate execution result
        success = hash(f"{market}_{side}_{size}_{datetime.now().minute}") % 10 != 0  # 90% success rate
        
        execution_price = 100 + (hash(f"{market}_{datetime.now().minute}") % 10)
        
        return AgentMessage(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            message_type="trade_execution_response",
            content={
                "trade_id": f"trade_{int(time.time())}_{market}",
                "success": success,
                "market": market,
                "side": side,
                "size": size,
                "execution_price": execution_price,
                "timestamp": datetime.now().isoformat(),
                "fees": size * execution_price * 0.001,
                "error": None if success else "Insufficient liquidity"
            }
        )
    
    def _handle_cross_chain_opportunity(self, message: AgentMessage) -> AgentMessage:
        """Handle a cross-chain opportunity notification"""
        if self.specialization != "cross_chain_arbitrage":
            return AgentMessage(
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="error_response",
                content={"error": "Not a cross-chain arbitrage agent", "original_request": message.content}
            )
        
        opportunity = message.content.get("opportunity", {})
        
        # Simulate opportunity analysis
        profit_potential = opportunity.get("estimated_profit", 0)
        risk_level = opportunity.get("risk_level", "high")
        
        # Decision based on risk level and profit potential
        execute = (
            profit_potential > 0.5 and risk_level == "low" or
            profit_potential > 1.0 and risk_level == "medium" or
            profit_potential > 2.0 and risk_level == "high"
        )
        
        return AgentMessage(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            message_type="cross_chain_opportunity_response",
            content={
                "opportunity_id": opportunity.get("id", "unknown"),
                "execute": execute,
                "confidence": 0.6 + (profit_potential / 10),
                "execution_plan": {
                    "steps": [
                        {
                            "chain": opportunity.get("source_chain"),
                            "action": "sell",
                            "market": opportunity.get("source_market"),
                            "size": opportunity.get("trade_size")
                        },
                        {
                            "chain": opportunity.get("target_chain"),
                            "action": "buy",
                            "market": opportunity.get("target_market"),
                            "size": opportunity.get("trade_size")
                        }
                    ]
                } if execute else None,
                "reasoning": f"Profit potential: {profit_potential}%, Risk level: {risk_level}"
            }
        )


class MultiAgentCoordinator:
    """
    Coordinates multiple agents across different chains to enable
    complex trading strategies and cross-chain opportunities.
    """
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.message_bus: List[AgentMessage] = []
        self.active = False
        self.last_cross_chain_check = datetime.now() - timedelta(minutes=10)  # Force initial check
        self.cross_chain_strategies = ELIZAOS_CONFIG["cross_chain_strategies"]
        self.cross_chain_interval = ELIZAOS_CONFIG["cross_chain_coordination_interval_seconds"]
        self.consensus_required = ELIZAOS_CONFIG["decision_framework"]["consensus_required"]
        
        self._initialize_agents()
        
        # Start background coordination thread
        self.coordinator_thread = threading.Thread(target=self._coordination_loop, daemon=True)
    
    def _initialize_agents(self):
        """Initialize agents for each chain and specialization"""
        agent_id_prefix = ELIZAOS_CONFIG["agent_id_prefix"]
        specializations = ELIZAOS_CONFIG["agent_specializations"]
        max_agents_per_chain = ELIZAOS_CONFIG["max_agents_per_chain"]
        
        # Create a diverse set of agents across chains and specializations
        for chain in CHAIN_CONFIGS.keys():
            # Not all specializations need to be on every chain
            chain_specializations = specializations.copy()
            
            # Ensure we have at least one of each core specialization
            for i, specialization in enumerate(chain_specializations[:3]):  # First 3 are core
                agent_id = f"{agent_id_prefix}{chain}_{specialization}"
                self.agents[agent_id] = Agent(agent_id, chain, specialization)
            
            # Randomly assign remaining specializations based on max_agents_per_chain
            remaining_slots = max_agents_per_chain - 3
            if remaining_slots > 0:
                for specialization in chain_specializations[3:]:
                    if remaining_slots <= 0:
                        break
                    agent_id = f"{agent_id_prefix}{chain}_{specialization}"
                    self.agents[agent_id] = Agent(agent_id, chain, specialization)
                    remaining_slots -= 1
        
        logger.info(f"Initialized {len(self.agents)} agents across {len(CHAIN_CONFIGS)} chains")
    
    def start(self):
        """Start the coordinator"""
        if not self.active:
            self.active = True
            self.coordinator_thread.start()
            logger.info("Multi-Agent Coordinator started")
    
    def stop(self):
        """Stop the coordinator"""
        self.active = False
        logger.info("Multi-Agent Coordinator stopping...")
    
    def _coordination_loop(self):
        """Main coordination loop that runs in background thread"""
        logger.info("Coordination loop started")
        
        while self.active:
            try:
                # Process message bus
                self._process_messages()
                
                # Check for cross-chain opportunities
                self._check_cross_chain_opportunities()
                
                # Sleep to avoid CPU hogging
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in coordination loop: {e}")
                time.sleep(5)  # Sleep longer on error
    
    def _process_messages(self):
        """Process all messages in the message bus"""
        if not self.message_bus:
            return
        
        # Sort messages by priority (higher first)
        self.message_bus.sort(key=lambda m: m.priority, reverse=True)
        
        # Process each message
        for message in self.message_bus[:]:  # Copy to avoid modification during iteration
            if message.processed:
                continue
                
            if message.recipient_id:
                # Directed message
                if message.recipient_id in self.agents:
                    recipient = self.agents[message.recipient_id]
                    response = recipient.process_message(message)
                    if response:
                        self.message_bus.append(response)
                    message.processed = True
            else:
                # Broadcast message - gather responses
                responses = []
                for agent_id, agent in self.agents.items():
                    if agent.chain == message.content.get("target_chain") and \
                       agent.specialization == message.content.get("target_specialization"):
                        response = agent.process_message(message)
                        if response:
                            responses.append(response)
                
                # Add responses to bus
                self.message_bus.extend(responses)
                message.processed = True
            
        # Remove processed messages
        self.message_bus = [m for m in self.message_bus if not m.processed]
    
    def _check_cross_chain_opportunities(self):
        """Periodically check for cross-chain opportunities"""
        now = datetime.now()
        if (now - self.last_cross_chain_check).total_seconds() < self.cross_chain_interval:
            return
        
        self.last_cross_chain_check = now
        logger.info("Checking for cross-chain opportunities...")
        
        # Find price differences across chains
        # This is a simplified simulation
        for asset in self._get_common_assets():
            prices = self._get_asset_prices_across_chains(asset)
            
            # Find min and max prices
            if not prices:
                continue
                
            min_price = min(prices.items(), key=lambda x: x[1])
            max_price = max(prices.items(), key=lambda x: x[1])
            
            # Calculate potential profit percentage
            price_diff_percent = ((max_price[1] - min_price[1]) / min_price[1]) * 100
            
            # If difference is significant, create opportunity
            if price_diff_percent > 1.0:  # More than 1% difference
                source_chain = min_price[0]
                target_chain = max_price[0]
                
                opportunity = {
                    "id": f"opportunity_{int(time.time())}_{asset}",
                    "type": "arbitrage",
                    "asset": asset,
                    "source_chain": source_chain,
                    "target_chain": target_chain,
                    "source_price": min_price[1],
                    "target_price": max_price[1],
                    "price_difference_percent": price_diff_percent,
                    "estimated_profit": price_diff_percent * 0.8,  # 80% of theoretical due to fees, etc.
                    "source_market": f"{asset}-USDC",
                    "target_market": f"{asset}-USDC",
                    "risk_level": "medium",
                    "trade_size": 10  # Simulated size
                }
                
                # Notify cross-chain arbitrage agents
                self._notify_arbitrage_agents(opportunity)
    
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
    
    def _get_asset_prices_across_chains(self, asset: str) -> Dict[str, float]:
        """Simulate getting asset prices across chains"""
        prices = {}
        
        for chain, config in CHAIN_CONFIGS.items():
            if asset in config.get("assets", []):
                # Simulate different prices on different chains
                # In a real implementation, this would call each chain's API
                base_price = 100.0  # Base price for simulation
                variance = (hash(f"{chain}_{asset}_{datetime.now().hour}") % 20) / 100.0  # ±10% variance
                chain_price = base_price * (1 + variance)
                prices[chain] = chain_price
        
        return prices
    
    def _notify_arbitrage_agents(self, opportunity: Dict[str, Any]):
        """Notify agents specialized in cross-chain arbitrage"""
        message = AgentMessage(
            sender_id="coordinator",
            recipient_id=None,  # Will be filtered by target_specialization in _process_messages
            message_type="cross_chain_opportunity",
            content={
                "opportunity": opportunity,
                "target_specialization": "cross_chain_arbitrage"
            }
        )
        
        self.message_bus.append(message)
    
    def send_message(self, message: Union[AgentMessage, Dict[str, Any]]) -> str:
        """
        Send a message to the message bus.
        Returns the message ID for tracking.
        """
        if isinstance(message, dict):
            # Convert dict to AgentMessage
            required_keys = ["sender_id", "message_type", "content"]
            if not all(k in message for k in required_keys):
                raise ValueError(f"Message dict must contain keys: {required_keys}")
            
            message = AgentMessage(
                sender_id=message["sender_id"],
                message_type=message["message_type"],
                content=message["content"],
                recipient_id=message.get("recipient_id"),
                priority=message.get("priority", 1)
            )
        
        self.message_bus.append(message)
        return message.id
    
    def get_agent_status(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Get status of all agents or a specific agent"""
        if agent_id:
            if agent_id not in self.agents:
                return {"error": f"Agent {agent_id} not found"}
            
            agent = self.agents[agent_id]
            return {
                "agent_id": agent.agent_id,
                "chain": agent.chain,
                "specialization": agent.specialization,
                "status": agent.status,
                "last_active": agent.last_active.isoformat(),
                "memory_size": len(agent.memory),
                "message_queue_size": len(agent.message_queue)
            }
        else:
            return {
                "total_agents": len(self.agents),
                "agents_by_chain": {
                    chain: sum(1 for a in self.agents.values() if a.chain == chain)
                    for chain in CHAIN_CONFIGS.keys()
                },
                "agents_by_specialization": {
                    spec: sum(1 for a in self.agents.values() if a.specialization == spec)
                    for spec in ELIZAOS_CONFIG["agent_specializations"]
                },
                "active_messages": len(self.message_bus)
            }


# Singleton instance
coordinator = MultiAgentCoordinator()

def get_coordinator() -> MultiAgentCoordinator:
    """Get the global coordinator instance"""
    return coordinator


if __name__ == "__main__":
    # Example usage
    coord = get_coordinator()
    coord.start()
    
    # Send a test message
    message_id = coord.send_message({
        "sender_id": "test_client",
        "message_type": "market_analysis_request",
        "content": {
            "market": "BTC",
            "timeframe": "1h",
            "target_specialization": "market_analysis"
        }
    })
    
    print(f"Sent message with ID: {message_id}")
    
    # Let the coordinator process the message
    time.sleep(5)
    
    # Check status
    status = coord.get_agent_status()
    print(json.dumps(status, indent=2))
    
    coord.stop()
