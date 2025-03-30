"""
Launcher script for Hyperliquid Arbitrum trading agents.
"""
import os
import sys
import asyncio
import argparse
import logging
import json
from datetime import datetime

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, f"arbitrum_agents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("arbitrum_launcher")

# Add the project root to the path
sys.path.insert(0, os.path.dirname(__file__))

# Import our modules
from src.agents.hyperliquid_agent_manager import HyperliquidAgentManager
from src.strategies.simple_trend import SimpleTrendStrategy
from src.monitoring.base import SignalMetricsCollector, OrderMetricsCollector, PositionMetricsCollector
from src.monitoring.dashboard import run_dashboard


class ArbitrumAgentLauncher:
    """Launcher for Hyperliquid Arbitrum trading agents."""
    
    def __init__(self, config_path: str, run_dashboard: bool = True):
        self.config_path = config_path
        self.run_dashboard = run_dashboard
        self.dashboard_process = None
        self.agent_manager = None
        self.metrics_collectors = {}
        
    async def start(self):
        """Start the trading agents."""
        try:
            # Load configuration
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            
            logger.info(f"Loaded configuration from {self.config_path}")
            
            # Create metrics collectors
            self.metrics_collectors["signals"] = SignalMetricsCollector(
                self.config.get("signals_metrics_path", "metrics/signals")
            )
            self.metrics_collectors["orders"] = OrderMetricsCollector(
                self.config.get("orders_metrics_path", "metrics/orders")
            )
            self.metrics_collectors["positions"] = PositionMetricsCollector(
                self.config.get("positions_metrics_path", "metrics/positions")
            )
            
            # Start dashboard if requested
            if self.run_dashboard:
                self._start_dashboard()
            
            # Create event handlers
            signal_handler = self._create_signal_handler()
            order_handler = self._create_order_handler()
            position_handler = self._create_position_handler()
            
            # Create Hyperliquid agent manager
            self.agent_manager = HyperliquidAgentManager(
                private_key=self.config.get("private_key"),
                wallet_address=self.config.get("wallet_address"),
                metrics_collector=self.metrics_collectors["signals"],
                testnet=self.config.get("testnet", False)
            )
            
            # Initialize the manager
            await self.agent_manager.initialize()
            
            # Register event handlers
            self.agent_manager.register_event_handler("signal_generation", signal_handler)
            self.agent_manager.register_event_handler("order_update", order_handler)
            self.agent_manager.register_event_handler("position_update", position_handler)
            self.agent_manager.register_event_handler("error", self._on_error)
            
            # Create strategies and register agents
            agent_ids = []
            for agent_config in self.config.get("agents", []):
                agent_id = await self._register_agent(agent_config)
                if agent_id:
                    agent_ids.append(agent_id)
            
            if not agent_ids:
                logger.error("No agents were registered successfully. Exiting.")
                return
            
            logger.info(f"Successfully registered {len(agent_ids)} trading agents")
            
            # Keep the process running
            while True:
                await asyncio.sleep(10)
                
        except KeyboardInterrupt:
            logger.info("Operation interrupted by user")
            await self.shutdown()
        except Exception as e:
            logger.error(f"Error in main function: {e}", exc_info=True)
            await self.shutdown()
    
    async def shutdown(self):
        """Shutdown the trading agents and manager."""
        logger.info("Shutting down trading agents...")
        
        if self.agent_manager:
            await self.agent_manager.shutdown()
        
        if self.dashboard_process:
            self.dashboard_process.terminate()
        
        logger.info("Trading agents shutdown complete")
    
    def _start_dashboard(self):
        """Start the monitoring dashboard in a separate process."""
        import subprocess
        
        dashboard_script = os.path.join(os.path.dirname(__file__), "run_dashboard.py")
        
        if os.path.exists(dashboard_script):
            try:
                self.dashboard_process = subprocess.Popen(
                    [sys.executable, dashboard_script],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                logger.info("Started monitoring dashboard")
            except Exception as e:
                logger.error(f"Failed to start dashboard: {e}")
        else:
            logger.warning(f"Dashboard script not found at {dashboard_script}")
    
    def _create_signal_handler(self):
        """Create a handler for trading signals."""
        metrics_collector = self.metrics_collectors["signals"]
        
        async def on_signal(agent_id, symbol, timeframe, signals):
            logger.info(f"Agent {agent_id} generated {len(signals)} signals for {symbol} {timeframe}")
            
            # Log signals to the metrics collector
            for signal in signals:
                metrics_collector.add_signal(
                    strategy_name=signal.get("strategy", "unknown"),
                    symbol=symbol,
                    timeframe=timeframe,
                    signal_type=signal.get("signal_type", "unknown"),
                    signal_strength=signal.get("strength", 0),
                    price=signal.get("price", 0),
                    timestamp=datetime.now().isoformat(),
                    metadata=signal
                )
        
        return on_signal
    
    def _create_order_handler(self):
        """Create a handler for order updates."""
        metrics_collector = self.metrics_collectors["orders"]
        
        async def on_order_update(agent_id, symbol, order_data):
            order_id = order_data.get("orderId", "unknown")
            status = order_data.get("status", "unknown")
            
            logger.info(f"Agent {agent_id} order {order_id} for {symbol} updated to status {status}")
            
            # Log order to the metrics collector
            metrics_collector.add_order(
                order_id=order_id,
                symbol=symbol,
                side=order_data.get("side", "unknown"),
                type=order_data.get("orderType", "unknown"),
                quantity=float(order_data.get("size", 0)),
                price=float(order_data.get("price", 0)),
                status=status,
                timestamp=datetime.now().isoformat(),
                metadata=order_data
            )
        
        return on_order_update
    
    def _create_position_handler(self):
        """Create a handler for position updates."""
        metrics_collector = self.metrics_collectors["positions"]
        
        async def on_position_update(agent_id, symbol, position_data):
            logger.info(f"Agent {agent_id} position update for {symbol}")
            
            # Log position to the metrics collector
            metrics_collector.add_position(
                symbol=symbol,
                side=position_data.get("side", "unknown"),
                quantity=float(position_data.get("size", 0)),
                entry_price=float(position_data.get("entryPrice", 0)),
                current_price=float(position_data.get("markPrice", 0)),
                pnl=float(position_data.get("unrealizedPnl", 0)),
                timestamp=datetime.now().isoformat(),
                metadata=position_data
            )
        
        return on_position_update
    
    async def _on_error(self, agent_id, error_message):
        """Handle errors from the agent."""
        logger.error(f"Agent {agent_id} error: {error_message}")
    
    async def _register_agent(self, agent_config):
        """Register a trading agent with the manager."""
        try:
            # Create strategy instance
            strategy_type = agent_config.get("strategy_type", "simple_trend")
            strategy_params = agent_config.get("strategy_params", {})
            
            if strategy_type == "simple_trend":
                # Add required parameters if missing
                if "name" not in strategy_params:
                    strategy_params["name"] = "SimpleTrend"
                if "timeframes" not in strategy_params:
                    strategy_params["timeframes"] = agent_config.get("timeframes", ["5m", "15m", "1h"])
                if "symbols" not in strategy_params:
                    strategy_params["symbols"] = agent_config.get("symbols", ["ETH-USD", "BTC-USD"])
                
                strategy = SimpleTrendStrategy(**strategy_params)
            else:
                logger.error(f"Unknown strategy type: {strategy_type}")
                return None
            
            # Register the agent
            agent_id = await self.agent_manager.register_agent(
                strategy=strategy,
                symbols=agent_config.get("symbols", []),
                timeframes=agent_config.get("timeframes", []),
                max_positions=agent_config.get("max_positions", 5),
                max_leverage=agent_config.get("max_leverage", 3.0),
                risk_per_trade=agent_config.get("risk_per_trade", 0.02),
                take_profit_multiplier=agent_config.get("take_profit_multiplier", 2.0),
                stop_loss_multiplier=agent_config.get("stop_loss_multiplier", 1.0),
                agent_config=agent_config.get("config", {})
            )
            
            if agent_id:
                logger.info(f"Agent {agent_id} registered successfully")
                
                # Start the agent
                if agent_config.get("autostart", True):
                    await self.agent_manager.start_agent(agent_id)
                    logger.info(f"Agent {agent_id} started")
                
                return agent_id
            else:
                logger.error(f"Failed to register agent for strategy {strategy_type}")
                return None
                
        except Exception as e:
            logger.error(f"Error registering agent: {e}", exc_info=True)
            return None


async def main(args):
    """Main entry point."""
    launcher = ArbitrumAgentLauncher(args.config, not args.no_dashboard)
    await launcher.start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hyperliquid Arbitrum Trading Agent Launcher")
    parser.add_argument("--config", type=str, default="config/arbitrum_agent_config.json", 
                      help="Path to configuration file")
    parser.add_argument("--no-dashboard", action="store_true", help="Don't start the monitoring dashboard")
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        logger.info("Operation interrupted by user")
