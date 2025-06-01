"""
Dashboard agent management module to control trading agents.
"""
import os
import sys
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import threading
import uuid

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.agents.hyperliquid_agent_manager import HyperliquidAgentManager
from src.strategies.simple_trend import SimpleTrendStrategy
from src.strategies.base import BaseStrategy
from src.database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

class DashboardAgentManager:
    """Agent manager for the dashboard interface."""
    
    def __init__(self, config_path: str = None, db_path: str = "data/trading_farm.db"):
        """
        Initialize the agent manager.
        
        Args:
            config_path: Path to the configuration file
            db_path: Path to the SQLite database file
        """
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), 
            '..', '..', 
            'config', 
            'arbitrum_agent_config.json'
        )
        
        # Initialize database connection
        self.db = DatabaseManager(db_path=db_path)
        
        # Import legacy config if database is empty
        self._import_legacy_config()
        
        # Agent managers
        self.agent_managers = {}
        
        # Map of agent_id to manager_type
        self.agent_map = {}
        
        # Agent status information
        self.agent_status = {}
        
        # Available strategies
        self.available_strategies = {
            'simple_trend': SimpleTrendStrategy,
            # Add more strategies here
        }
        
        # Background task for running agents
        self.agent_tasks = {}
        self.agent_loops = {}
        
        # Cache of loaded configurations
        self.config_cache = {}
        
        # Lock for thread safety
        self.lock = threading.Lock()
    
    def _import_legacy_config(self):
        """Import legacy configuration from file if database is empty."""
        # Check if we have agents in the database
        agents = self.db.get_all_agent_configs()
        if not agents:
            try:
                # Try to load from file
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    
                # Extract and save Ethereum credentials if present
                if 'private_key' in config:
                    self.db.save_credential("ethereum", "private_key", config['private_key'])
                    logger.info("Imported Ethereum private key")
                
                if 'wallet_address' in config:
                    self.db.save_credential("ethereum", "address", config['wallet_address'])
                    logger.info("Imported Ethereum wallet address")
                
                if 'testnet' in config:
                    self.db.save_credential("ethereum", "testnet", str(config['testnet']))
                    logger.info(f"Imported testnet setting: {config['testnet']}")
                    
                # Import agents from config file
                if 'agents' in config:
                    for idx, agent_config in enumerate(config['agents']):
                        # Generate a new ID if not present
                        if 'agent_id' not in agent_config and 'id' not in agent_config:
                            agent_config['id'] = str(uuid.uuid4())
                        elif 'agent_id' in agent_config:
                            agent_config['id'] = agent_config.pop('agent_id')
                        
                        # Add required fields
                        if 'name' not in agent_config:
                            agent_config['name'] = f"Agent {idx+1}"
                        
                        if 'type' not in agent_config:
                            agent_config['type'] = 'hyperliquid'
                            
                        if 'strategy' not in agent_config:
                            agent_config['strategy'] = agent_config.get('strategy_type', 'simple_trend')
                            
                        # Add required fields with defaults if missing
                        agent_config['symbols'] = agent_config.get('symbols', [])
                        agent_config['timeframes'] = agent_config.get('timeframes', [])
                        agent_config['risk'] = agent_config.get('risk_per_trade', 0.02)
                        agent_config['leverage'] = agent_config.get('max_leverage', 3.0)
                        agent_config['status'] = 'Stopped'
                        
                        # Save to database
                        self.db.save_agent_config(agent_config)
                        
                logger.info(f"Imported legacy configuration from {self.config_path}")
            except Exception as e:
                logger.warning(f"Failed to import legacy config: {e}")
    
    def get_available_agents(self) -> List[Dict[str, Any]]:
        """
        Get list of available and configured agents.
        
        Returns:
            List of agent configurations with status
        """
        # Get agents directly from the database
        return self.db.get_all_agent_configs()
    
    def get_all_agents(self) -> List[Dict[str, Any]]:
        """Alias for get_available_agents for compatibility."""
        return self.get_available_agents()
    
    def get_available_strategies(self) -> List[Dict[str, Any]]:
        """
        Get list of available strategies.
        
        Returns:
            List of strategy information
        """
        strategies = []
        
        for strategy_id, strategy_class in self.available_strategies.items():
            strategies.append({
                'id': strategy_id,
                'name': strategy_class.__name__,
                'description': strategy_class.__doc__ or "No description"
            })
        
        return strategies
    
    def get_agent_status(self, agent_id: str) -> str:
        """
        Get the status of an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Status string
        """
        agent = self.db.get_agent_config(agent_id)
        if agent:
            return agent.get('status', 'Unknown')
        return 'Unknown'
    
    def create_agent_config(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new agent configuration.
        
        Args:
            agent_data: Agent configuration data
            
        Returns:
            Created agent configuration
        """
        agent_type = agent_data.get('type', 'hyperliquid')
        strategy_type = agent_data.get('strategy', 'simple_trend')
        
        # Generate a unique agent ID
        agent_id = str(uuid.uuid4())
        
        # Create configuration
        agent_config = {
            'id': agent_id,
            'name': agent_data.get('name', f"Agent {agent_id[:8]}"),
            'type': agent_type,
            'strategy': strategy_type,
            'symbols': agent_data.get('symbols', []),
            'timeframes': agent_data.get('timeframes', []),
            'risk': agent_data.get('risk_per_trade', 0.02),
            'leverage': agent_data.get('max_leverage', 3.0),
            'status': 'Stopped'
        }
        
        # Add optional fields
        if 'max_positions' in agent_data:
            agent_config['max_positions'] = agent_data['max_positions']
        if 'take_profit_multiplier' in agent_data:
            agent_config['take_profit_multiplier'] = agent_data['take_profit_multiplier']
        if 'stop_loss_multiplier' in agent_data:
            agent_config['stop_loss_multiplier'] = agent_data['stop_loss_multiplier']
        if 'strategy_params' in agent_data:
            agent_config['strategy_params'] = agent_data['strategy_params']
        if 'autostart' in agent_data:
            agent_config['autostart'] = agent_data['autostart']
        
        # Save to database
        self.db.save_agent_config(agent_config)
        
        return agent_config
    
    def update_agent_config(self, agent_id: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing agent configuration.
        
        Args:
            agent_id: ID of the agent to update
            updated_data: Updated agent data
            
        Returns:
            Updated agent configuration
        """
        # Get current config
        current_config = self.db.get_agent_config(agent_id)
        if not current_config:
            raise ValueError(f"Agent with ID {agent_id} not found")
        
        # Update values
        for key, value in updated_data.items():
            current_config[key] = value
        
        # Save to database
        self.db.save_agent_config(current_config)
        
        return current_config
    
    def delete_agent_config(self, agent_id: str) -> bool:
        """
        Delete an agent configuration.
        
        Args:
            agent_id: ID of the agent to delete
            
        Returns:
            True if deleted, False if not found
        """
        return self.db.delete_agent_config(agent_id)
    
    def start_agent(self, agent_id: str) -> bool:
        """
        Start a trading agent.
        
        Args:
            agent_id: ID of the agent to start
            
        Returns:
            True if started, False if not
        """
        # Get agent config
        agent_config = self.db.get_agent_config(agent_id)
        if not agent_config:
            logger.warning(f"Agent with ID {agent_id} not found")
            return False
        
        # Update status in database
        agent_config['status'] = 'Running'
        self.db.save_agent_config(agent_config)
        
        # Start the agent in the correct manager
        agent_type = agent_config.get('type', 'hyperliquid').lower()
        if agent_type == 'hyperliquid':
            # Create or get Hyperliquid manager
            if 'hyperliquid' not in self.agent_managers:
                private_key = self.db.get_credential("ethereum", "private_key")
                wallet_address = self.db.get_credential("ethereum", "address")
                testnet = self.db.get_credential("ethereum", "testnet")
                testnet = testnet.lower() == "true" if testnet else False
                
                self.agent_managers['hyperliquid'] = HyperliquidAgentManager(
                    private_key=private_key,
                    wallet_address=wallet_address,
                    testnet=testnet,
                    db_path=self.db.db_path
                )
            
            # Register agent with manager
            strategy_type = agent_config.get('strategy', 'simple_trend')
            strategy_class = self.available_strategies.get(strategy_type)
            if not strategy_class:
                logger.warning(f"Strategy {strategy_type} not found")
                return False
            
            # Initialize strategy
            strategy_params = agent_config.get('strategy_params', {})
            strategy = strategy_class(**strategy_params)
            
            # Get needed params
            symbols = agent_config.get('symbols', [])
            timeframes = agent_config.get('timeframes', ['5m', '15m', '1h'])
            risk_per_trade = agent_config.get('risk', 0.02)
            max_leverage = agent_config.get('leverage', 3.0)
            
            # Start in a background task
            event_loop = asyncio.new_event_loop()
            
            def run_agent_task():
                asyncio.set_event_loop(event_loop)
                manager = self.agent_managers['hyperliquid']
                agent_task = asyncio.run_coroutine_threadsafe(
                    manager.register_and_start_agent(
                        agent_id=agent_id,
                        strategy=strategy,
                        symbols=symbols,
                        timeframes=timeframes,
                        risk_per_trade=risk_per_trade,
                        max_leverage=max_leverage
                    ),
                    event_loop
                )
                
                try:
                    agent_task.result()
                except Exception as e:
                    logger.error(f"Error starting agent {agent_id}: {e}")
                    # Update status in database
                    self.db.update_agent_status(agent_id, 'Error')
            
            # Start background thread
            thread = threading.Thread(target=run_agent_task, daemon=True)
            thread.start()
            
            # Store thread and loop for later cleanup
            self.agent_tasks[agent_id] = thread
            self.agent_loops[agent_id] = event_loop
            self.agent_map[agent_id] = 'hyperliquid'
            
            return True
        else:
            logger.warning(f"Unknown agent type: {agent_type}")
            return False
    
    def stop_agent(self, agent_id: str) -> bool:
        """
        Stop a trading agent.
        
        Args:
            agent_id: ID of the agent to stop
            
        Returns:
            True if stopped, False if not
        """
        # Update status in database
        self.db.update_agent_status(agent_id, 'Stopped')
        
        # Get the manager type
        manager_type = self.agent_map.get(agent_id)
        if not manager_type:
            logger.warning(f"Agent with ID {agent_id} is not running")
            return False
        
        # Stop the agent in the correct manager
        if manager_type == 'hyperliquid':
            manager = self.agent_managers.get('hyperliquid')
            if not manager:
                logger.warning(f"Hyperliquid manager not found")
                return False
            
            # Stop in a background task
            event_loop = self.agent_loops.get(agent_id)
            if not event_loop:
                logger.warning(f"Event loop for agent {agent_id} not found")
                return False
            
            try:
                stop_task = asyncio.run_coroutine_threadsafe(
                    manager.stop_agent(agent_id),
                    event_loop
                )
                stop_task.result(timeout=5)  # Wait up to 5 seconds
                
                # Clean up
                self.agent_map.pop(agent_id, None)
                
                return True
            except Exception as e:
                logger.error(f"Error stopping agent {agent_id}: {e}")
                return False
        else:
            logger.warning(f"Unknown manager type: {manager_type}")
            return False
    
    def get_agent_metrics(self, agent_id: str) -> Dict[str, Any]:
        """
        Get metrics for an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Metrics data
        """
        # In a real implementation, we would fetch metrics from the agent
        return {
            'agent_id': agent_id,
            'status': self.agent_status.get(agent_id, "unknown"),
            'uptime': "N/A",
            'signals_generated': 0,
            'orders_placed': 0,
            'active_positions': 0,
            'total_pnl': 0,
            'last_updated': datetime.now().isoformat()
        }
    
    def shutdown(self):
        """Shutdown all agents and managers."""
        # Stop all agents
        for agent_id in list(self.agent_status.keys()):
            if self.agent_status[agent_id] in ["running", "starting", "initializing"]:
                self.stop_agent(agent_id)
        
        # Wait for agents to stop (with timeout)
        stop_time = datetime.now()
        while any(status in ["running", "starting", "initializing", "stopping"] 
                for status in self.agent_status.values()):
            # Check timeout (30 seconds)
            if (datetime.now() - stop_time).total_seconds() > 30:
                logger.warning("Timeout waiting for agents to stop")
                break
            
            time.sleep(0.5)
        
        # Close all event loops
        for agent_id, loop in self.agent_loops.items():
            try:
                loop.stop()
                loop.close()
            except:
                pass
        
        # Clear collections
        self.agent_loops.clear()
        self.agent_tasks.clear()
        self.agent_status.clear()
        self.agent_map.clear()
        
        # Shutdown managers
        for manager_type, manager in self.agent_managers.items():
            try:
                # Use asyncio.run to create a new event loop
                asyncio.run(manager.shutdown())
            except Exception as e:
                logger.error(f"Error shutting down {manager_type} manager: {e}")
        
        self.agent_managers.clear()

    def create_agent(
        self, name: str, agent_type: str, strategy: str, 
        symbols: str, timeframes: str, risk: float, leverage: float
    ) -> Dict[str, Any]:
        """
        Create a new agent with the given parameters.
        
        Args:
            name: Name of the agent
            agent_type: Type of agent (e.g., 'hyperliquid')
            strategy: Strategy type (e.g., 'simple_trend')
            symbols: Comma-separated list of symbols
            timeframes: Comma-separated list of timeframes
            risk: Risk per trade (0.0-1.0)
            leverage: Maximum leverage to use
            
        Returns:
            Created agent configuration
        """
        # Parse symbols and timeframes
        symbol_list = [s.strip() for s in symbols.split(',') if s.strip()]
        timeframe_list = [t.strip() for t in timeframes.split(',') if t.strip()]
        
        agent_data = {
            'name': name,
            'type': agent_type,
            'strategy': strategy,
            'symbols': symbol_list,
            'timeframes': timeframe_list,
            'risk_per_trade': float(risk),
            'leverage': float(leverage),
            'status': 'Stopped'
        }
        
        # Create configuration
        agent_config = self.create_agent_config(agent_data)
        
        return agent_config
