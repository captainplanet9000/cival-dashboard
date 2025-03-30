"""
Hyperliquid Agent Manager for connecting AI trading agents to Hyperliquid on Arbitrum.
"""
import asyncio
import json
import logging
import time
import uuid
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta

from ..blockchain.hyperliquid_arbitrum import HyperliquidArbitrumClient
from ..blockchain.base import OrderSide, OrderType, Order
from ..strategies.base import BaseStrategy
from ..monitoring.base import MetricsCollector
from ..database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

class HyperliquidAgentManager:
    """Manager for trading agents connecting to Hyperliquid on Arbitrum."""
    
    def __init__(
        self,
        private_key: str = None,
        wallet_address: str = None,
        metrics_collector: Optional[MetricsCollector] = None,
        testnet: bool = False,
        db_path: str = "data/trading_farm.db"
    ):
        """
        Initialize the Hyperliquid agent manager.
        
        Args:
            private_key: Ethereum private key for signing transactions
            wallet_address: Ethereum wallet address associated with the private key
            metrics_collector: Optional metrics collector for performance tracking
            testnet: Whether to use testnet instead of mainnet
            db_path: Path to the SQLite database file
        """
        # Initialize database connection
        self.db = DatabaseManager(db_path=db_path)
        
        # Use credentials from database if not provided
        if not private_key:
            private_key = self.db.get_credential("ethereum", "private_key")
        
        if not wallet_address:
            wallet_address = self.db.get_credential("ethereum", "address")
            
        # If we still don't have credentials, raise error
        if not private_key or not wallet_address:
            raise ValueError("No Ethereum credentials provided and none found in database")
        
        self.client = HyperliquidArbitrumClient(
            private_key=private_key,
            wallet_address=wallet_address,
            testnet=testnet
        )
        
        self.metrics_collector = metrics_collector
        self.agents = {}
        self.running = False
        self.event_handlers = {
            "order_update": [],
            "position_update": [],
            "trade_execution": [],
            "signal_generation": [],
            "error": []
        }
        
        # Load agents from database
        self._load_agents_from_db()
    
    def _load_agents_from_db(self) -> None:
        """Load agent configurations from the database."""
        db_agents = self.db.get_all_agent_configs()
        
        for agent_config in db_agents:
            # Skip agents that aren't of type hyperliquid
            if agent_config.get("type", "").lower() != "hyperliquid":
                continue
                
            agent_id = agent_config["id"]
            
            # Initialize memory representation of agent
            agent = {
                "id": agent_id,
                "strategy": None,  # Will be initialized later when needed
                "symbols": agent_config["symbols"],
                "timeframes": agent_config["timeframes"],
                "max_positions": agent_config.get("max_positions", 5),
                "max_leverage": agent_config.get("leverage", 5.0),
                "risk_per_trade": agent_config.get("risk", 0.02),
                "take_profit_multiplier": agent_config.get("take_profit_multiplier", 2.0),
                "stop_loss_multiplier": agent_config.get("stop_loss_multiplier", 1.0),
                "config": agent_config,
                "positions": {},
                "orders": {},
                "signals": [],
                "last_update": datetime.now(),
                "active": agent_config.get("status", "Stopped") == "Running",
                "statistics": {
                    "signals_generated": 0,
                    "orders_placed": 0,
                    "orders_filled": 0,
                    "orders_cancelled": 0,
                    "total_pnl": 0.0,
                    "win_count": 0,
                    "loss_count": 0,
                    "start_time": datetime.now()
                }
            }
            
            self.agents[agent_id] = agent
            logger.info(f"Loaded agent {agent_id} from database")
    
    async def initialize(self) -> None:
        """Initialize the manager and connect to Hyperliquid Arbitrum."""
        await self.client.initialize()
        logger.info("Hyperliquid Agent Manager initialized")
        
        # Start active agents
        for agent_id, agent in self.agents.items():
            if agent["active"]:
                await self.start_agent(agent_id)
    
    async def register_agent(
        self, 
        strategy: BaseStrategy, 
        symbols: List[str],
        timeframes: List[str],
        max_positions: int = 5,
        max_leverage: float = 5.0,
        risk_per_trade: float = 0.02,  # 2% of account balance per trade
        take_profit_multiplier: float = 2.0,  # TP at 2x risk
        stop_loss_multiplier: float = 1.0,  # SL at 1x risk
        agent_config: Optional[Dict[str, Any]] = None,
        agent_name: str = None
    ) -> str:
        """
        Register a new trading agent with the manager.
        
        Args:
            strategy: Trading strategy implementation
            symbols: List of symbols to trade
            timeframes: List of timeframes to analyze
            max_positions: Maximum number of positions the agent can hold
            max_leverage: Maximum leverage to use
            risk_per_trade: Percentage of account balance to risk per trade
            take_profit_multiplier: Take profit at X times the risk
            stop_loss_multiplier: Stop loss at X times the risk
            agent_config: Additional configuration for the agent
            agent_name: Optional name for the agent
            
        Returns:
            Agent ID string
        """
        agent_id = str(uuid.uuid4())
        
        # Create agent configuration for database
        db_config = {
            "id": agent_id,
            "name": agent_name or f"Agent_{agent_id[:8]}",
            "type": "hyperliquid",
            "strategy": strategy.__class__.__name__,
            "symbols": symbols,
            "timeframes": timeframes,
            "risk": risk_per_trade,
            "leverage": max_leverage,
            "status": "Stopped"
        }
        
        # Save to database
        self.db.save_agent_config(db_config)
        
        # Initialize agent configuration for memory
        agent = {
            "id": agent_id,
            "strategy": strategy,
            "symbols": symbols,
            "timeframes": timeframes,
            "max_positions": max_positions,
            "max_leverage": max_leverage,
            "risk_per_trade": risk_per_trade,
            "take_profit_multiplier": take_profit_multiplier,
            "stop_loss_multiplier": stop_loss_multiplier,
            "config": agent_config or {},
            "positions": {},
            "orders": {},
            "signals": [],
            "last_update": datetime.now(),
            "active": False,
            "statistics": {
                "signals_generated": 0,
                "orders_placed": 0,
                "orders_filled": 0,
                "orders_cancelled": 0,
                "total_pnl": 0.0,
                "win_count": 0,
                "loss_count": 0,
                "start_time": datetime.now()
            }
        }
        
        # Connect agent to Hyperliquid
        connected = await self.client.connect_agent(agent_id, symbols)
        if not connected:
            logger.error(f"Failed to connect agent {agent_id} to Hyperliquid Arbitrum")
            # Remove from database
            self.db.delete_agent_config(agent_id)
            return None
            
        # Register callbacks for agent data
        self.client.register_callback(agent_id, "orderbook", self._on_orderbook_update)
        self.client.register_callback(agent_id, "trades", self._on_trades_update)
        self.client.register_callback(agent_id, "orders", self._on_orders_update)
        self.client.register_callback(agent_id, "positions", self._on_positions_update)
        
        # Store the agent
        self.agents[agent_id] = agent
        logger.info(f"Agent {agent_id} registered with symbols {symbols} and timeframes {timeframes}")
        
        return agent_id
    
    async def start_agent(self, agent_id: str) -> bool:
        """Start an agent's trading activities."""
        if agent_id not in self.agents:
            logger.error(f"Agent {agent_id} not found")
            return False
            
        self.agents[agent_id]["active"] = True
        
        # Update status in database
        self.db.update_agent_status(agent_id, "Running")
        
        # Start trading tasks for the agent
        asyncio.create_task(self._agent_trading_loop(agent_id))
        
        logger.info(f"Agent {agent_id} started")
        return True
    
    async def stop_agent(self, agent_id: str) -> bool:
        """Stop an agent's trading activities."""
        if agent_id not in self.agents:
            logger.error(f"Agent {agent_id} not found")
            return False
            
        self.agents[agent_id]["active"] = False
        
        # Update status in database
        self.db.update_agent_status(agent_id, "Stopped")
        
        logger.info(f"Agent {agent_id} stopped")
        return True
    
    async def _on_positions_update(self, agent_id: str, symbol: str, data: Dict[str, Any]) -> None:
        """Handle position updates for an agent."""
        if agent_id not in self.agents:
            return
            
        agent = self.agents[agent_id]
        
        # Update position
        agent["positions"][symbol] = data
        
        # Check for position exits or changes
        if symbol in agent["positions"] and (not data or data.get("size", 0) == 0):
            # Position was closed, calculate PnL and update statistics
            prev_position = agent["positions"].get(symbol, {})
            if prev_position and prev_position.get("size", 0) != 0:
                entry_price = prev_position.get("entry_price", 0)
                exit_price = data.get("close_price", 0)
                size = prev_position.get("size", 0)
                
                # Calculate PnL
                if entry_price and exit_price and size:
                    pnl = (exit_price - entry_price) * size
                    if prev_position.get("side") == "SHORT":
                        pnl = -pnl
                    
                    # Update statistics
                    agent["statistics"]["total_pnl"] += pnl
                    if pnl > 0:
                        agent["statistics"]["win_count"] += 1
                    else:
                        agent["statistics"]["loss_count"] += 1
                    
                    # Save trade to database
                    trade_data = {
                        "agent_id": agent_id,
                        "symbol": symbol,
                        "direction": prev_position.get("side", "LONG"),
                        "entry_price": entry_price,
                        "entry_time": prev_position.get("open_time", datetime.now() - timedelta(hours=1)),
                        "exit_price": exit_price,
                        "exit_time": datetime.now(),
                        "quantity": abs(size),
                        "pnl": pnl,
                        "status": "CLOSED",
                        "metadata": {
                            "leverage": prev_position.get("leverage", 1.0),
                            "funding_fee": prev_position.get("funding_fee", 0),
                            "liquidation_price": prev_position.get("liquidation_price", 0)
                        }
                    }
                    self.db.save_trade(trade_data)
                    
                    logger.info(f"Agent {agent_id} closed position for {symbol} with PnL: {pnl}")
        
        # Save position update to metrics collector if available
        if self.metrics_collector:
            self.metrics_collector.update_position(agent_id, symbol, data)
        
        # Notify position update handlers
        for handler in self.event_handlers["position_update"]:
            await handler(agent_id, symbol, data)
    
    def get_agent_statistics(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get trading statistics for an agent."""
        if agent_id not in self.agents:
            return None
            
        agent = self.agents[agent_id]
        
        # Get base statistics from memory
        stats = agent["statistics"].copy()
        
        # Enhance with additional data from database
        # Calculate win rate
        total_trades = stats["win_count"] + stats["loss_count"]
        win_rate = (stats["win_count"] / total_trades) * 100 if total_trades > 0 else 0
        stats["win_rate"] = round(win_rate, 2)
        
        # Get recent trades from database
        recent_trades = self.db.get_recent_trades(agent_id=agent_id, limit=20)
        if recent_trades:
            # Calculate additional metrics
            total_trades_from_db = len(recent_trades)
            winning_trades = [t for t in recent_trades if t.get("pnl", 0) > 0]
            winning_trades_count = len(winning_trades)
            
            # Average trade statistics
            if total_trades_from_db > 0:
                avg_pnl = sum(t.get("pnl", 0) for t in recent_trades) / total_trades_from_db
                stats["average_pnl"] = round(avg_pnl, 2)
                
                if winning_trades_count > 0:
                    avg_win = sum(t.get("pnl", 0) for t in winning_trades) / winning_trades_count
                    stats["average_win"] = round(avg_win, 2)
                
                losing_trades = [t for t in recent_trades if t.get("pnl", 0) < 0]
                if losing_trades:
                    avg_loss = sum(t.get("pnl", 0) for t in losing_trades) / len(losing_trades)
                    stats["average_loss"] = round(avg_loss, 2)
                    
                    # Risk-reward ratio
                    if avg_loss != 0:
                        stats["risk_reward_ratio"] = round(abs(avg_win / avg_loss), 2)
        
        # Add agent information
        stats["agent_id"] = agent_id
        stats["active"] = agent["active"]
        stats["symbols"] = agent["symbols"]
        stats["timeframes"] = agent["timeframes"]
        stats["positions"] = len(agent["positions"])
        stats["orders"] = len(agent["orders"])
        
        return stats

    def _collect_metrics(self) -> None:
        """Collect and save metrics for all agents."""
        if not self.metrics_collector:
            return
            
        timestamp = datetime.now().isoformat()
        
        # Collect signals metrics
        signals_metrics = {
            "timestamp": timestamp,
            "agents": {}
        }
        
        for agent_id, agent in self.agents.items():
            if agent["active"]:
                signals_metrics["agents"][agent_id] = {
                    "signals": agent["signals"][-10:] if agent["signals"] else [],
                    "statistics": {
                        "signals_generated": agent["statistics"]["signals_generated"]
                    }
                }
        
        # Save signals metrics to database
        if signals_metrics["agents"]:
            self.db.save_metrics("signals", timestamp, signals_metrics)
            
        # Collect orders metrics
        orders_metrics = {
            "timestamp": timestamp,
            "agents": {}
        }
        
        for agent_id, agent in self.agents.items():
            if agent["active"]:
                orders_metrics["agents"][agent_id] = {
                    "orders": list(agent["orders"].values()),
                    "statistics": {
                        "orders_placed": agent["statistics"]["orders_placed"],
                        "orders_filled": agent["statistics"]["orders_filled"],
                        "orders_cancelled": agent["statistics"]["orders_cancelled"]
                    }
                }
        
        # Save orders metrics to database
        if orders_metrics["agents"]:
            self.db.save_metrics("orders", timestamp, orders_metrics)
            
        # Collect positions metrics
        positions_metrics = {
            "timestamp": timestamp,
            "agents": {}
        }
        
        for agent_id, agent in self.agents.items():
            if agent["active"]:
                positions_metrics["agents"][agent_id] = {
                    "positions": list(agent["positions"].values()),
                    "statistics": {
                        "total_pnl": agent["statistics"]["total_pnl"],
                        "win_count": agent["statistics"]["win_count"],
                        "loss_count": agent["statistics"]["loss_count"]
                    }
                }
        
        # Save positions metrics to database
        if positions_metrics["agents"]:
            self.db.save_metrics("positions", timestamp, positions_metrics)
        
    def get_agent_metrics(self, agent_id: str, metric_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get metrics for a specific agent.
        
        Args:
            agent_id: ID of the agent to get metrics for
            metric_type: Type of metrics to retrieve (signals, orders, positions)
            limit: Maximum number of metrics to return
            
        Returns:
            List of metrics dictionaries
        """
        metrics = self.db.get_metrics(metric_type, limit=limit)
        
        # Filter metrics for the specific agent
        agent_metrics = []
        for metric in metrics:
            data = metric["data"]
            if "agents" in data and agent_id in data["agents"]:
                agent_metrics.append({
                    "timestamp": metric["timestamp"],
                    "data": data["agents"][agent_id]
                })
                
        return agent_metrics
        
    def get_all_metrics(self, metric_type: str, limit: int = 100) -> Dict[str, Any]:
        """
        Get metrics for all agents.
        
        Args:
            metric_type: Type of metrics to retrieve (signals, orders, positions)
            limit: Maximum number of metrics to return
            
        Returns:
            Dictionary with metrics for all agents
        """
        return self.db.get_metrics(metric_type, limit=limit)
