"""
Example script to connect trading agents to Hyperliquid on Arbitrum network.
"""
import os
import asyncio
import json
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("arbitrum_agent.log"),
        logging.StreamHandler()
    ]
)

# Import our modules
from src.agents.hyperliquid_agent_manager import HyperliquidAgentManager
from src.strategies.simple_trend import SimpleTrendStrategy
from src.monitoring.base import SignalMetricsCollector, OrderMetricsCollector
from src.monitoring.dashboard import run_dashboard

logger = logging.getLogger("arbitrum_agent")

class SignalHandler:
    """Handler for trading signals."""
    
    def __init__(self, metrics_collector: SignalMetricsCollector):
        self.metrics_collector = metrics_collector
    
    async def on_signal(self, agent_id: str, symbol: str, timeframe: str, signals: List[Dict[str, Any]]):
        """Handle new signals from a strategy."""
        logger.info(f"Agent {agent_id} generated {len(signals)} signals for {symbol} {timeframe}")
        
        # Log signals to the metrics collector
        for signal in signals:
            self.metrics_collector.add_signal(
                strategy_name=signal.get("strategy", "unknown"),
                symbol=symbol,
                timeframe=timeframe,
                signal_type=signal.get("signal_type", "unknown"),
                signal_strength=signal.get("strength", 0),
                price=signal.get("price", 0),
                timestamp=datetime.now().isoformat(),
                metadata=signal
            )

class OrderHandler:
    """Handler for order updates."""
    
    def __init__(self, metrics_collector: OrderMetricsCollector):
        self.metrics_collector = metrics_collector
    
    async def on_order_update(self, agent_id: str, symbol: str, order_data: Dict[str, Any]):
        """Handle order updates."""
        order_id = order_data.get("orderId", "unknown")
        status = order_data.get("status", "unknown")
        
        logger.info(f"Agent {agent_id} order {order_id} for {symbol} updated to status {status}")
        
        # Log order to the metrics collector
        self.metrics_collector.add_order(
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

async def main(config_path: str):
    """Main function to run the agent."""
    try:
        # Load configuration
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Create metrics collectors
        signal_collector = SignalMetricsCollector(config.get("signals_metrics_path", "metrics/signals"))
        order_collector = OrderMetricsCollector(config.get("orders_metrics_path", "metrics/orders"))
        
        # Create signal and order handlers
        signal_handler = SignalHandler(signal_collector)
        order_handler = OrderHandler(order_collector)
        
        # Create Hyperliquid agent manager
        agent_manager = HyperliquidAgentManager(
            private_key=config.get("private_key"),
            wallet_address=config.get("wallet_address"),
            metrics_collector=signal_collector,
            testnet=config.get("testnet", False)
        )
        
        # Initialize the manager
        await agent_manager.initialize()
        
        # Register event handlers
        agent_manager.register_event_handler("signal_generation", signal_handler.on_signal)
        agent_manager.register_event_handler("order_update", order_handler.on_order_update)
        
        # Create strategies and register agents
        for agent_config in config.get("agents", []):
            # Create strategy instance
            strategy_type = agent_config.get("strategy_type", "simple_trend")
            strategy_params = agent_config.get("strategy_params", {})
            
            if strategy_type == "simple_trend":
                strategy = SimpleTrendStrategy(**strategy_params)
            else:
                logger.error(f"Unknown strategy type: {strategy_type}")
                continue
            
            # Register the agent
            agent_id = await agent_manager.register_agent(
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
                    await agent_manager.start_agent(agent_id)
            else:
                logger.error(f"Failed to register agent for strategy {strategy_type}")
        
        # Run until interrupted
        try:
            while True:
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            logger.info("Agent operation cancelled")
        finally:
            # Shutdown everything
            await agent_manager.shutdown()
            
    except Exception as e:
        logger.error(f"Error in main function: {e}", exc_info=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hyperliquid Arbitrum Trading Agent")
    parser.add_argument("--config", type=str, default="config/arbitrum_agent_config.json", 
                      help="Path to configuration file")
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.config))
    except KeyboardInterrupt:
        logger.info("Operation interrupted by user")
