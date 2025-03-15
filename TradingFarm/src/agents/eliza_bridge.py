"""
ElizaOS Bridge for TradingFarm - integrates the ElizaOS AI agent framework with trading agents
"""
import os
import sys
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Union
import subprocess
from pathlib import Path
import uuid
from datetime import datetime

# Add ElizaOS to the path
ELIZA_PATH = Path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..", "eliza"))
sys.path.append(str(ELIZA_PATH))

from .hyperliquid_agent_manager import HyperliquidAgentManager
from ..strategies.base import BaseStrategy
from ..database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

class ElizaAgentBridge:
    """Bridge between ElizaOS and TradingFarm to create autonomous AI trading agents."""
    
    def __init__(
        self,
        agent_manager: HyperliquidAgentManager,
        db_path: str = "data/trading_farm.db",
        eliza_path: str = None
    ):
        """
        Initialize the ElizaOS bridge.
        
        Args:
            agent_manager: The HyperliquidAgentManager instance to bridge with ElizaOS
            db_path: Path to the SQLite database file
            eliza_path: Path to the ElizaOS directory (defaults to "../../eliza")
        """
        self.agent_manager = agent_manager
        self.db = DatabaseManager(db_path=db_path)
        self.eliza_path = eliza_path or str(ELIZA_PATH)
        self.agents = {}
        self.eliza_processes = {}
        self.character_configs = {}
        self.commands = {}
        self.eliza_api_client = None
        
        # Create the ElizaOS integration directory if it doesn't exist
        self.eliza_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                                  "../..", "eliza_integrations")
        os.makedirs(self.eliza_dir, exist_ok=True)
        
        # Load character configs from the character directory
        self._load_character_configs()
    
    def _load_character_configs(self):
        """Load available ElizaOS character configurations."""
        characters_dir = os.path.join(self.eliza_path, "characters")
        if not os.path.exists(characters_dir):
            logger.warning(f"ElizaOS characters directory not found at: {characters_dir}")
            return
            
        for file in os.listdir(characters_dir):
            if file.endswith('.json'):
                try:
                    with open(os.path.join(characters_dir, file), 'r') as f:
                        character = json.load(f)
                        self.character_configs[file] = character
                        logger.info(f"Loaded ElizaOS character: {file}")
                except Exception as e:
                    logger.error(f"Failed to load character {file}: {str(e)}")
    
    async def create_trading_agent(
        self,
        agent_name: str,
        symbols: List[str],
        timeframes: List[str],
        character_template: str = "trading_agent.json",
        model_provider: str = "anthropic",
        model_name: str = "claude-3-opus",
        risk_per_trade: float = 0.02,
        max_leverage: float = 5.0,
        strategy_type: str = "AIStrategy"
    ) -> str:
        """
        Create a new AI-powered trading agent using ElizaOS.
        
        Args:
            agent_name: Name for the new agent
            symbols: List of symbols to trade
            timeframes: List of timeframes to analyze
            character_template: ElizaOS character template to use
            model_provider: AI model provider (anthropic, openai, etc.)
            model_name: Specific model to use
            risk_per_trade: Percentage of account balance to risk per trade
            max_leverage: Maximum leverage to use
            strategy_type: Type of strategy to employ
            
        Returns:
            Agent ID string
        """
        # Create agent character configuration
        agent_config = {
            "name": agent_name,
            "symbols": symbols,
            "timeframes": timeframes,
            "risk": risk_per_trade,
            "leverage": max_leverage,
            "model_provider": model_provider,
            "model_name": model_name,
            "strategy": strategy_type
        }
        
        # Create a custom character file for this trading agent
        character_path = self._create_agent_character(agent_name, agent_config, character_template)
        
        # Set up the strategy for this agent
        strategy = self._create_ai_strategy(strategy_type, agent_name, symbols, timeframes)
        
        # Register with the agent manager
        agent_id = await self.agent_manager.register_agent(
            strategy=strategy,
            symbols=symbols,
            timeframes=timeframes,
            max_leverage=max_leverage,
            risk_per_trade=risk_per_trade,
            agent_config={"eliza_character": character_path},
            agent_name=agent_name
        )
        
        # Store the agent information
        self.agents[agent_id] = {
            "id": agent_id,
            "name": agent_name,
            "character_path": character_path,
            "config": agent_config,
            "eliza_process": None,
            "running": False
        }
        
        return agent_id
    
    def _create_agent_character(
        self, 
        agent_name: str, 
        agent_config: Dict[str, Any],
        template_name: str
    ) -> str:
        """
        Create a custom ElizaOS character file for a trading agent.
        
        Args:
            agent_name: Name of the agent
            agent_config: Configuration for the agent
            template_name: Name of the character template to use
            
        Returns:
            Path to the created character file
        """
        # Load template if it exists or use default
        template = None
        if template_name in self.character_configs:
            template = self.character_configs[template_name]
        else:
            # Create a basic trading agent template
            template = {
                "name": "Trading Agent",
                "description": "An AI agent specialized in cryptocurrency trading",
                "model": {
                    "provider": "anthropic",
                    "model": "claude-3-opus",
                    "temperature": 0.1,
                    "maxTokens": 4000
                },
                "memory": {
                    "type": "buffer",
                    "maxTokens": 100000
                },
                "personality": "I am a professional cryptocurrency trading agent. I analyze market data, identify patterns, and execute trades with precision. I carefully manage risk and optimize for consistent returns.",
                "instructions": [
                    "Analyze market data to identify trading opportunities",
                    "Execute trades with proper risk management",
                    "Monitor open positions and adjust as necessary",
                    "Keep detailed records of all trading activities",
                    "Continuously learn from past trades to improve performance"
                ],
                "clients": [],
                "plugins": [
                    "@elizaos/plugin-core",
                    "@elizaos/plugin-datasources",
                    "@elizaos/plugin-trading"
                ]
            }
        
        # Customize the template for this specific agent
        character = template.copy()
        character["name"] = agent_name
        character["description"] = f"Trading agent for {', '.join(agent_config['symbols'])}"
        
        # Set the model provider and name
        character["model"]["provider"] = agent_config.get("model_provider", "anthropic")
        character["model"]["model"] = agent_config.get("model_name", "claude-3-opus")
        
        # Add trading specific information
        character["trading"] = {
            "symbols": agent_config["symbols"],
            "timeframes": agent_config["timeframes"],
            "risk_per_trade": agent_config["risk"],
            "max_leverage": agent_config["leverage"],
            "strategy": agent_config["strategy"]
        }
        
        # Save the character file
        character_file = f"{agent_name.lower().replace(' ', '_')}.json"
        character_path = os.path.join(self.eliza_dir, character_file)
        
        with open(character_path, 'w') as f:
            json.dump(character, f, indent=2)
            
        logger.info(f"Created agent character file: {character_path}")
        return character_path
    
    def _create_ai_strategy(
        self,
        strategy_type: str,
        agent_name: str,
        symbols: List[str],
        timeframes: List[str]
    ) -> BaseStrategy:
        """
        Create an AI strategy that integrates with ElizaOS.
        
        Args:
            strategy_type: Type of AI strategy to create
            agent_name: Name of the agent
            symbols: List of symbols to trade
            timeframes: List of timeframes to analyze
            
        Returns:
            A BaseStrategy instance configured to work with ElizaOS
        """
        # Import the appropriate strategy class
        from ..strategies.ai_strategy import AIStrategy
        
        # Create and return the strategy
        return AIStrategy(
            name=agent_name,
            symbols=symbols,
            timeframes=timeframes,
            eliza_bridge=self
        )
    
    async def start_eliza_agent(self, agent_id: str) -> bool:
        """
        Start an ElizaOS agent process.
        
        Args:
            agent_id: ID of the agent to start
            
        Returns:
            True if started successfully, False otherwise
        """
        if agent_id not in self.agents:
            logger.error(f"Agent {agent_id} not found")
            return False
        
        agent = self.agents[agent_id]
        if agent["running"]:
            logger.info(f"Agent {agent_id} is already running")
            return True
        
        # Start the ElizaOS process
        try:
            character_path = agent["character_path"]
            eliza_cmd = [
                "pnpm", "start",
                "--characters", character_path
            ]
            
            process = subprocess.Popen(
                eliza_cmd,
                cwd=self.eliza_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            agent["eliza_process"] = process
            agent["running"] = True
            
            # Start a task to monitor the process
            asyncio.create_task(self._monitor_process(agent_id, process))
            
            logger.info(f"Started ElizaOS agent: {agent['name']} (ID: {agent_id})")
            
            # Now start the agent in the hyperliquid manager
            await self.agent_manager.start_agent(agent_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start ElizaOS agent {agent_id}: {str(e)}")
            return False
    
    async def stop_eliza_agent(self, agent_id: str) -> bool:
        """
        Stop an ElizaOS agent process.
        
        Args:
            agent_id: ID of the agent to stop
            
        Returns:
            True if stopped successfully, False otherwise
        """
        if agent_id not in self.agents:
            logger.error(f"Agent {agent_id} not found")
            return False
        
        agent = self.agents[agent_id]
        if not agent["running"]:
            logger.info(f"Agent {agent_id} is not running")
            return True
        
        # Stop the ElizaOS process
        try:
            process = agent["eliza_process"]
            if process:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                
            agent["eliza_process"] = None
            agent["running"] = False
            
            # Now stop the agent in the hyperliquid manager
            await self.agent_manager.stop_agent(agent_id)
            
            logger.info(f"Stopped ElizaOS agent: {agent['name']} (ID: {agent_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop ElizaOS agent {agent_id}: {str(e)}")
            return False
    
    async def _monitor_process(self, agent_id: str, process):
        """Monitor the ElizaOS process and capture output."""
        try:
            while True:
                output = await asyncio.to_thread(process.stdout.readline)
                if not output:
                    break
                logger.info(f"[ElizaAgent:{agent_id}] {output.strip()}")
                
                # Check for agent responses that need to trigger actions
                if "TRADE_SIGNAL" in output:
                    await self._process_trade_signal(agent_id, output)
        except Exception as e:
            logger.error(f"Error monitoring ElizaOS process for agent {agent_id}: {str(e)}")
        finally:
            if agent_id in self.agents:
                self.agents[agent_id]["running"] = False
    
    async def _process_trade_signal(self, agent_id: str, output: str):
        """Process a trade signal from the ElizaOS agent."""
        try:
            # Extract the JSON signal data
            signal_start = output.find('{')
            signal_end = output.rfind('}') + 1
            signal_json = output[signal_start:signal_end]
            
            signal_data = json.loads(signal_json)
            
            # Forward the signal to the agent manager
            await self.agent_manager.submit_manual_signal(
                agent_id=agent_id,
                symbol=signal_data["symbol"],
                side=signal_data["side"],
                size=signal_data.get("size"),
                reason=signal_data.get("reason", "ElizaOS AI Signal"),
                take_profit=signal_data.get("take_profit"),
                stop_loss=signal_data.get("stop_loss")
            )
            
            logger.info(f"Processed trade signal from ElizaOS agent {agent_id}: {signal_data}")
        
        except Exception as e:
            logger.error(f"Failed to process trade signal for agent {agent_id}: {str(e)}")
    
    async def start_all_agents(self) -> Dict[str, bool]:
        """
        Start all ElizaOS agents.
        
        Returns:
            Dictionary mapping agent IDs to success status
        """
        results = {}
        for agent_id in self.agents:
            results[agent_id] = await self.start_eliza_agent(agent_id)
        return results
    
    async def stop_all_agents(self) -> Dict[str, bool]:
        """
        Stop all ElizaOS agents.
        
        Returns:
            Dictionary mapping agent IDs to success status
        """
        results = {}
        for agent_id in self.agents:
            results[agent_id] = await self.stop_eliza_agent(agent_id)
        return results
    
    async def send_data_to_agent(self, agent_id: str, data: Dict[str, Any]) -> bool:
        """
        Send market data or other information to an ElizaOS agent.
        
        Args:
            agent_id: ID of the agent to send data to
            data: Data to send
            
        Returns:
            True if data was sent successfully, False otherwise
        """
        if agent_id not in self.agents or not self.agents[agent_id]["running"]:
            logger.error(f"Agent {agent_id} not found or not running")
            return False
        
        # In a real implementation, this would interact with ElizaOS API
        # For now, we'll log the data
        logger.info(f"Sending data to ElizaOS agent {agent_id}: {data}")
        return True
    
    async def create_agent(
        self,
        agent_id: str,
        name: str,
        symbols: List[str],
        timeframes: List[str],
        character_template: str = "crypto_trader.json",
        model_provider: str = "anthropic",
        model_name: str = "claude-3-opus",
        risk_per_trade: float = 0.02,
        max_leverage: float = 3.0,
        is_controller: bool = False
    ) -> str:
        """
        Create a new ElizaOS agent.
        
        Args:
            agent_id: Agent ID (UUID string)
            name: Agent name
            symbols: List of symbols to trade
            timeframes: List of timeframes to analyze
            character_template: Name of character template file
            model_provider: Model provider (anthropic, openai, google)
            model_name: Model name to use
            risk_per_trade: Risk per trade (0.0-1.0)
            max_leverage: Maximum leverage to use
            is_controller: Whether this is a controller agent
            
        Returns:
            Agent ID string
        """
        try:
            # Build character path
            character_path = os.path.join(self.eliza_dir, character_template)
            
            # Ensure character template exists
            if not os.path.exists(character_path):
                logger.error(f"Character template {character_path} not found")
                return None
            
            # Create agent configuration
            agent_config = {
                "id": agent_id,
                "name": name,
                "symbols": symbols,
                "timeframes": timeframes,
                "strategy_type": "AIStrategy",
                "eliza_character": character_template,
                "model_provider": model_provider,
                "model_name": model_name,
                "risk_per_trade": risk_per_trade,
                "max_leverage": max_leverage,
                "is_controller": is_controller
            }
            
            # Add agent to agent manager
            self.agent_manager.agents[agent_id] = {
                "id": agent_id,
                "name": name,
                "symbols": symbols,
                "timeframes": timeframes,
                "config": agent_config,
                "active": False,
                "created_at": datetime.now().isoformat(),
                "last_active": None
            }
            
            # Save agent configuration
            self.agent_manager.save_agents()
            
            # Add to internal tracking
            self.agents[agent_id] = {
                "config": agent_config,
                "active": False,
                "created_at": datetime.now().isoformat(),
                "last_active": None
            }
            
            return agent_id
        except Exception as e:
            logger.error(f"Error creating agent: {str(e)}")
            return None
    
    async def start_agent(self, agent_id: str) -> bool:
        """
        Start an ElizaOS agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            True if started successfully, False otherwise
        """
        try:
            if agent_id not in self.agents:
                logger.error(f"Agent {agent_id} not found")
                return False
            
            # Mark agent as active
            self.agents[agent_id]["active"] = True
            self.agents[agent_id]["last_active"] = datetime.now().isoformat()
            
            # Update agent manager
            if agent_id in self.agent_manager.agents:
                self.agent_manager.agents[agent_id]["active"] = True
                self.agent_manager.agents[agent_id]["last_active"] = datetime.now().isoformat()
                self.agent_manager.save_agents()
            
            return True
        except Exception as e:
            logger.error(f"Error starting agent {agent_id}: {str(e)}")
            return False
    
    async def stop_agent(self, agent_id: str) -> bool:
        """
        Stop an ElizaOS agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            True if stopped successfully, False otherwise
        """
        try:
            if agent_id not in self.agents:
                logger.error(f"Agent {agent_id} not found")
                return False
            
            # Mark agent as inactive
            self.agents[agent_id]["active"] = False
            
            # Update agent manager
            if agent_id in self.agent_manager.agents:
                self.agent_manager.agents[agent_id]["active"] = False
                self.agent_manager.save_agents()
            
            return True
        except Exception as e:
            logger.error(f"Error stopping agent {agent_id}: {str(e)}")
            return False
    
    async def list_agents(self) -> Dict[str, Any]:
        """
        List all ElizaOS agents.
        
        Returns:
            Dict of agent IDs to agent details
        """
        return self.agents
    
    async def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get agent details.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent details or None if not found
        """
        return self.agents.get(agent_id)
    
    async def start_all_agents(self):
        """Start all ElizaOS agents."""
        for agent_id in self.agents:
            await self.start_agent(agent_id)
    
    async def stop_all_agents(self):
        """Stop all ElizaOS agents."""
        for agent_id in self.agents:
            await self.stop_agent(agent_id)
    
    async def delete_agent(self, agent_id: str) -> bool:
        """
        Delete an ElizaOS agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if agent_id not in self.agents:
                logger.error(f"Agent {agent_id} not found")
                return False
            
            # Remove agent from tracking
            del self.agents[agent_id]
            
            # Remove from agent manager
            if agent_id in self.agent_manager.agents:
                del self.agent_manager.agents[agent_id]
                self.agent_manager.save_agents()
            
            return True
        except Exception as e:
            logger.error(f"Error deleting agent {agent_id}: {str(e)}")
            return False
    
    async def get_agent_metrics(self, agent_id: str) -> Dict[str, Any]:
        """
        Get agent metrics.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dict of agent metrics
        """
        try:
            if agent_id not in self.agents:
                logger.error(f"Agent {agent_id} not found")
                return None
            
            # In a real implementation, we would fetch metrics from the agent
            # For now, return some mock metrics
            import random
            
            return {
                "agent_id": agent_id,
                "name": self.agents[agent_id]["config"]["name"],
                "signals_count": random.randint(10, 100),
                "trades_count": random.randint(5, 50),
                "win_rate": random.uniform(0.5, 0.8),
                "pnl": random.uniform(-10, 50),
                "performance": random.uniform(-5, 20)
            }
        except Exception as e:
            logger.error(f"Error getting agent metrics: {str(e)}")
            return None
    
    async def send_command_to_agent(self, agent_id: str, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a command to an agent.
        
        Args:
            agent_id: Agent ID
            command: Command to send
            
        Returns:
            Command result
        """
        try:
            if agent_id not in self.agents:
                logger.error(f"Agent {agent_id} not found")
                return {"status": "error", "message": f"Agent {agent_id} not found"}
            
            if not self.agents[agent_id]["active"]:
                logger.error(f"Agent {agent_id} is not active")
                return {"status": "error", "message": f"Agent {agent_id} is not active"}
            
            # Generate command ID
            command_id = str(uuid.uuid4())
            
            # Store command
            self.commands[command_id] = {
                "id": command_id,
                "agent_id": agent_id,
                "command": command,
                "status": "processing",
                "created_at": datetime.now().isoformat(),
                "completed_at": None,
                "result": None
            }
            
            # In a real implementation, we would send the command to the agent
            # and get the result. For now, simulate a result after a delay.
            await asyncio.sleep(0.5)
            
            # Simulate command result
            if command.get("name") == "get_market_overview":
                result = self._simulate_market_overview()
            elif command.get("name") == "get_agent_performance":
                result = self._simulate_agent_performance(command.get("agent_id"))
            elif command.get("name") == "adjust_risk_level":
                result = self._simulate_adjust_risk_level(command.get("risk_level"))
            elif command.get("name") == "allocate_capital":
                result = self._simulate_allocate_capital(command.get("allocations", {}))
            else:
                result = {"status": "success", "message": f"Command {command.get('name')} executed"}
            
            # Update command with result
            self.commands[command_id]["status"] = "completed"
            self.commands[command_id]["completed_at"] = datetime.now().isoformat()
            self.commands[command_id]["result"] = result
            
            return result
        except Exception as e:
            logger.error(f"Error sending command to agent: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _simulate_market_overview(self) -> Dict[str, Any]:
        """Simulate market overview result."""
        import random
        
        # Generate random market data for major cryptocurrencies
        markets = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD", "DOGE-USD"]
        market_data = {}
        
        for market in markets:
            price = random.uniform(100, 50000) if market == "BTC-USD" else random.uniform(1, 5000)
            market_data[market] = {
                "price": price,
                "24h_change": random.uniform(-5, 5),
                "24h_volume": random.uniform(1000000, 10000000),
                "market_cap": price * random.uniform(10000000, 1000000000),
                "sentiment": random.choice(["bullish", "neutral", "bearish"])
            }
        
        # Overall market sentiment
        overall_sentiment = random.choice(["bullish", "neutral", "bearish"])
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "overall_sentiment": overall_sentiment,
            "markets": market_data,
            "notes": f"Market appears to be {overall_sentiment} with {random.randint(60, 90)}% confidence"
        }
    
    def _simulate_agent_performance(self, specific_agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Simulate agent performance result."""
        import random
        
        # Get agents to report on
        agents = []
        if specific_agent_id:
            if specific_agent_id in self.agents:
                agents = [specific_agent_id]
            else:
                return {"status": "error", "message": f"Agent {specific_agent_id} not found"}
        else:
            agents = list(self.agents.keys())
        
        # Generate performance data
        performance_data = {}
        for agent_id in agents:
            agent_config = self.agents[agent_id]["config"]
            performance_data[agent_id] = {
                "name": agent_config["name"],
                "trades_count": random.randint(5, 100),
                "win_rate": random.uniform(0.4, 0.8),
                "pnl": random.uniform(-20, 50),
                "pnl_percentage": random.uniform(-5, 15),
                "active": self.agents[agent_id]["active"],
                "symbols": agent_config["symbols"],
                "risk_level": agent_config.get("risk_per_trade", 0.02)
            }
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "agents": performance_data,
            "total_agents": len(agents),
            "active_agents": sum(1 for a in agents if self.agents[a]["active"]),
            "total_pnl": sum(a["pnl"] for a in performance_data.values()),
            "avg_win_rate": sum(a["win_rate"] for a in performance_data.values()) / len(agents) if agents else 0
        }
    
    def _simulate_adjust_risk_level(self, risk_level: float) -> Dict[str, Any]:
        """Simulate adjust risk level result."""
        if risk_level < 0 or risk_level > 1:
            return {"status": "error", "message": "Risk level must be between 0 and 1"}
        
        # Apply risk level to all agents
        for agent_id in self.agents:
            self.agents[agent_id]["config"]["risk_per_trade"] = risk_level
            
            # Update in agent manager
            if agent_id in self.agent_manager.agents:
                self.agent_manager.agents[agent_id]["config"]["risk_per_trade"] = risk_level
        
        # Save changes
        self.agent_manager.save_agents()
        
        return {
            "status": "success",
            "message": f"Risk level adjusted to {risk_level}",
            "affected_agents": len(self.agents)
        }
    
    def _simulate_allocate_capital(self, allocations: Dict[str, float]) -> Dict[str, Any]:
        """Simulate allocate capital result."""
        # Validate allocations
        total_allocation = sum(allocations.values())
        if total_allocation > 100:
            return {"status": "error", "message": "Total allocation exceeds 100%"}
        
        # Apply allocations to agents
        applied_allocations = {}
        for agent_id, allocation in allocations.items():
            if agent_id in self.agents:
                self.agents[agent_id]["config"]["capital_allocation"] = allocation
                applied_allocations[agent_id] = allocation
                
                # Update in agent manager
                if agent_id in self.agent_manager.agents:
                    self.agent_manager.agents[agent_id]["config"]["capital_allocation"] = allocation
        
        # Save changes
        self.agent_manager.save_agents()
        
        return {
            "status": "success",
            "message": f"Capital allocated to {len(applied_allocations)} agents",
            "applied_allocations": applied_allocations,
            "reserve_allocation": 100 - total_allocation,
            "total_allocation": total_allocation
        }

    def register_agent(self, agent):
        """
        Register an agent with ElizaOS
        
        Args:
            agent: Agent object to register
        """
        if not agent:
            return
        
        agent_id = getattr(agent, "agent_id", str(uuid.uuid4()))
        agent_type = getattr(agent, "agent_type", "unknown")
        
        if agent_id in self.agents:
            logger.warning(f"Agent already registered: {agent_id}")
            return
        
        self.agents[agent_id] = agent
        
        # Register agent type with ElizaOS
        if agent_type == "hyperliquid":
            self.register_hyperliquid_agent(agent)
        elif agent_type == "sonic":
            self.register_sonic_agent(agent)
        elif agent_type == "vertex":
            self.register_vertex_agent(agent)
        
        logger.info(f"Registered agent: {agent_id} ({agent_type})")

    def register_hyperliquid_agent(self, agent):
        """
        Register a Hyperliquid agent with ElizaOS
        
        Args:
            agent: HyperliquidAgent object
        """
        # Implementation for Hyperliquid agent registration
        pass
        
    def register_sonic_agent(self, agent):
        """
        Register a Sonic Protocol agent with ElizaOS
        
        Args:
            agent: SonicAgent object
        """
        # Implement Sonic agent registration
        try:
            # Convert agent to JSON serializable format
            agent_data = agent.to_dict()
            
            # Add agent to ElizaOS using its built-in agent management APIs
            # (This is a placeholder - implement according to ElizaOS API)
            if self.eliza_api_client:
                response = self.eliza_api_client.register_agent(
                    agent_type="sonic",
                    agent_id=agent.agent_id,
                    agent_name=agent.name,
                    agent_data=agent_data
                )
                logger.info(f"ElizaOS response for Sonic agent registration: {response}")
        except Exception as e:
            logger.error(f"Error registering Sonic agent with ElizaOS: {str(e)}")
    
    def register_vertex_agent(self, agent):
        """
        Register a Vertex Protocol agent with ElizaOS
        
        Args:
            agent: VertexAgent object
        """
        # Implement Vertex agent registration
        try:
            # Convert agent to JSON serializable format
            agent_data = agent.to_dict()
            
            # Add agent to ElizaOS using its built-in agent management APIs
            # (This is a placeholder - implement according to ElizaOS API)
            if self.eliza_api_client:
                response = self.eliza_api_client.register_agent(
                    agent_type="vertex",
                    agent_id=agent.agent_id,
                    agent_name=agent.name,
                    agent_data=agent_data
                )
                logger.info(f"ElizaOS response for Vertex agent registration: {response}")
        except Exception as e:
            logger.error(f"Error registering Vertex agent with ElizaOS: {str(e)}")

    def get_agent_by_type(self, agent_type):
        """
        Get all agents of a specific type
        
        Args:
            agent_type: Type of agent to retrieve
            
        Returns:
            List of agents matching the specified type
        """
        if not agent_type:
            return []
        
        return [agent for agent in self.agents.values() 
                if getattr(agent, "agent_type", "") == agent_type]
    
    def send_agent_status(self, status_data):
        """
        Send an agent status update to ElizaOS
        
        Args:
            status_data: Status data to send
        """
        try:
            agent_id = status_data.get("agent_id")
            agent_type = status_data.get("agent_type")
            
            if not agent_id or not agent_type:
                logger.warning(f"Invalid status data: {status_data}")
                return
            
            # Send status update to ElizaOS
            if self.eliza_api_client:
                response = self.eliza_api_client.update_agent_status(
                    agent_id=agent_id,
                    status_data=status_data
                )
                
                # Log response for debugging
                if "error" in response:
                    logger.error(f"Error sending status update to ElizaOS: {response['error']}")
                else:
                    logger.debug(f"Sent status update to ElizaOS for agent {agent_id} ({agent_type})")
        except Exception as e:
            logger.error(f"Error sending agent status update: {str(e)}")
