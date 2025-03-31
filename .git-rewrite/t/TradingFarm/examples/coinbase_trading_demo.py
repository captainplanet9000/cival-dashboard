"""
Coinbase Trading Engine Demo with ElizaOS Integration
Demonstrates how to integrate all components of the trading engine
"""

import os
import sys
import asyncio
import logging
import json
from typing import Dict, List, Any

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.exchanges.coinbase import CoinbaseClient
from src.exchanges.coinbase_websocket import CoinbaseWebsocketClient
from src.market_data.market_data_manager import MarketDataManager
from src.order_execution.order_manager import OrderManager
from src.risk_management.risk_manager import RiskManager
from src.agents.eliza_integration import ElizaIntegrationManager
from src.agents.eliza_protocol import MessageType, ElizaMessage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
COINBASE_API_KEY = os.environ.get("COINBASE_API_KEY", "")
COINBASE_API_SECRET = os.environ.get("COINBASE_API_SECRET", "")
TEST_MODE = True  # Set to False for real trading

async def simulate_eliza_agent(eliza_manager: ElizaIntegrationManager) -> None:
    """Simulate an ElizaOS agent for demonstration purposes."""
    # Register agent
    agent_data = {
        "agent_name": "ElizaTrader",
        "agent_type": "trading_agent",
        "capabilities": ["market_data", "order_management", "risk_management"]
    }
    
    registration = await eliza_manager.register_agent(agent_data)
    agent_id = registration["agent_id"]
    
    logger.info(f"Registered ElizaOS agent with ID: {agent_id}")
    
    # Wait for system to initialize
    await asyncio.sleep(2)
    
    # Get system status
    status_message = ElizaMessage(
        message_type=MessageType.COMMAND,
        content={"command": "get_status"},
        sender=agent_id
    )
    
    response = await eliza_manager.process_message_from_agent(status_message)
    if response:
        logger.info(f"System status: {json.dumps(response.content, indent=2)}")
    
    # Request market data subscription
    subscribe_message = ElizaMessage(
        message_type=MessageType.COMMAND,
        content={
            "command": "subscribe",
            "exchange": "coinbase",
            "symbols": ["BTC-USD", "ETH-USD"],
            "channels": ["ticker"]
        },
        sender=agent_id
    )
    
    response = await eliza_manager.process_message_from_agent(subscribe_message)
    if response:
        logger.info(f"Subscription response: {json.dumps(response.content, indent=2)}")
    
    # Get risk rules
    risk_message = ElizaMessage(
        message_type=MessageType.COMMAND,
        content={"command": "get_risk_rules"},
        sender=agent_id
    )
    
    response = await eliza_manager.process_message_from_agent(risk_message)
    if response:
        logger.info(f"Risk rules: {json.dumps(response.content, indent=2)}")
    
    # Update risk rule
    update_risk_message = ElizaMessage(
        message_type=MessageType.COMMAND,
        content={
            "command": "update_risk_rule",
            "rule_name": "max_position_size",
            "params": {"max_position_pct": 3.0}
        },
        sender=agent_id
    )
    
    response = await eliza_manager.process_message_from_agent(update_risk_message)
    if response:
        logger.info(f"Updated risk rule: {json.dumps(response.content, indent=2)}")
    
    # Simulate a trading scenario
    # In a real implementation, this would be driven by ElizaOS AI
    
    # Check order against risk rules
    check_order_message = ElizaMessage(
        message_type=MessageType.COMMAND,
        content={
            "command": "check_order",
            "exchange": "coinbase",
            "symbol": "BTC-USD",
            "order": {
                "side": "buy",
                "type": "limit",
                "price": 50000.0,
                "amount": 0.1
            }
        },
        sender=agent_id
    )
    
    response = await eliza_manager.process_message_from_agent(check_order_message)
    if response:
        logger.info(f"Order check result: {json.dumps(response.content, indent=2)}")
        
        # If order is allowed by risk rules, place it
        if response.content.get("allowed", False):
            place_order_message = ElizaMessage(
                message_type=MessageType.COMMAND,
                content={
                    "command": "place_order",
                    "exchange": "coinbase",
                    "symbol": "BTC-USD",
                    "order_type": "limit",
                    "side": "buy",
                    "price": 50000.0,
                    "amount": 0.1
                },
                sender=agent_id
            )
            
            response = await eliza_manager.process_message_from_agent(place_order_message)
            if response:
                logger.info(f"Order placement result: {json.dumps(response.content, indent=2)}")
    
    # Keep running for a while to receive updates
    logger.info("ElizaOS agent running. Waiting for updates...")
    await asyncio.sleep(30)
    
    # Clean up
    await eliza_manager.unregister_agent(agent_id)
    logger.info(f"Unregistered ElizaOS agent with ID: {agent_id}")

async def main() -> None:
    """Main function to demonstrate the Coinbase trading engine."""
    logger.info("Starting Coinbase Trading Engine Demo")
    
    # Initialize exchange client
    coinbase_client = CoinbaseClient(
        api_key=COINBASE_API_KEY,
        api_secret=COINBASE_API_SECRET,
        use_sandbox=TEST_MODE
    )
    
    # Initialize websocket client
    coinbase_ws = CoinbaseWebsocketClient(
        api_key=COINBASE_API_KEY,
        api_secret=COINBASE_API_SECRET,
        use_sandbox=TEST_MODE
    )
    
    # Initialize market data manager
    market_data_manager = MarketDataManager()
    market_data_manager.add_exchange("coinbase", coinbase_client, coinbase_ws)
    
    # Initialize order manager
    order_manager = OrderManager()
    order_manager.add_exchange("coinbase", coinbase_client)
    
    # Initialize risk manager
    risk_manager = RiskManager()
    
    # Initialize ElizaOS integration manager
    eliza_manager = ElizaIntegrationManager(
        market_data_manager=market_data_manager,
        order_manager=order_manager,
        risk_manager=risk_manager
    )
    
    # Start components
    await market_data_manager.start()
    await order_manager.start()
    await eliza_manager.start()
    
    # For demonstration purposes, create a simulated portfolio
    sample_portfolio = {
        "total_value": 100000.0,  # $100,000 portfolio
        "positions": [],
        "position_values": {}
    }
    risk_manager.update_portfolio(sample_portfolio)
    
    try:
        # Simulate an ElizaOS agent
        await simulate_eliza_agent(eliza_manager)
    finally:
        # Cleanup
        await eliza_manager.stop()
        await order_manager.stop()
        await market_data_manager.stop()
    
    logger.info("Coinbase Trading Engine Demo completed")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error in main: {e}", exc_info=True)
