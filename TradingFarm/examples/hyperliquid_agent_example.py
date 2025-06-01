"""
Hyperliquid Testnet Order Execution

This script executes a single order of 0.1 ETH on Hyperliquid testnet.
"""

import asyncio
import logging
import os
import json
import time
from dotenv import load_dotenv

from src.blockchain.hyperliquid_agent import ElizaHyperliquidAgent
from src.blockchain.base import Order, OrderType, OrderSide, TimeInForce

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def retry_with_backoff(coroutine, max_retries=3, base_delay=2):
    """
    Retry a coroutine with exponential backoff.
    
    Args:
        coroutine: Coroutine to execute
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds between retries
        
    Returns:
        Result of the coroutine or raises the last exception
    """
    retries = 0
    last_exception = None
    
    while retries < max_retries:
        try:
            return await coroutine
        except Exception as e:
            last_exception = e
            wait_time = base_delay * (2 ** retries)
            logger.warning(f"Attempt {retries + 1}/{max_retries} failed: {e}. Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)
            retries += 1
    
    logger.error(f"All {max_retries} retry attempts failed. Last error: {last_exception}")
    raise last_exception

async def execute_eth_order():
    """Execute a 0.1 ETH order on Hyperliquid testnet."""
    # Initialize the Hyperliquid agent with your private key
    private_key = os.getenv("HYPERLIQUID_PRIVATE_KEY")
    if not private_key:
        logger.error("HYPERLIQUID_PRIVATE_KEY environment variable not set. Please add it to your .env file.")
        return
        
    # Create the agent instance (using testnet)
    agent = ElizaHyperliquidAgent(
        private_key=private_key,
        agent_id=os.getenv("ELIZA_AGENT_ID", "eliza_trading_agent_1"),
        testnet=True  # Explicitly set to True for testnet
    )
    
    try:
        # Initialize the connection
        await agent.initialize()
        logger.info(f"Agent initialized with wallet: {agent.wallet_address}")
        
        # Try to get available assets with retry
        try:
            available_assets = await retry_with_backoff(agent.get_available_assets())
            logger.info(f"Available assets on Hyperliquid: {json.dumps(available_assets, indent=2)}")
        except Exception as e:
            logger.warning(f"Could not retrieve available assets: {e}. Continuing with predefined symbol.")
        
        # Hyperliquid uses simple coin names, not with -PERP suffix
        eth_symbol = "ETH"  # Correct symbol format for Hyperliquid
        
        # Get current ETH price from the orderbook with retry
        try:
            eth_order_book = await retry_with_backoff(agent.get_order_book(eth_symbol))
            best_bid = eth_order_book.bids[0]['price']
            best_ask = eth_order_book.asks[0]['price']
            
            # Choose a price slightly better than the best bid for a buy order
            order_price = best_bid * 1.001  # 0.1% above best bid
            
            logger.info(f"ETH current price - Best Bid: ${best_bid}, Best Ask: ${best_ask}")
            logger.info(f"Placing order at ${order_price}")
        except Exception as e:
            # Fallback to a reasonable ETH price if API fails
            logger.warning(f"Could not retrieve orderbook: {e}. Using fallback price.")
            order_price = 3500.00  # Fallback price if we can't get current price
            logger.info(f"Using fallback price: ${order_price}")
        
        # Create and execute the order
        order = Order(
            symbol=eth_symbol,
            order_type=OrderType.LIMIT,
            side=OrderSide.BUY,
            quantity=0.1,  # 0.1 ETH as requested
            price=order_price,
            time_in_force=TimeInForce.GTC,
            leverage=3,  # 3x leverage
            client_order_id=f"eth_testnet_order_{int(time.time())}"
        )
        
        # Place the order with retry
        try:
            order_response = await retry_with_backoff(agent.create_abstracted_order(order))
            logger.info(f"Order placed: {json.dumps(order_response, indent=2)}")
            
            # Check for order status
            if "orderId" in order_response:
                order_id = order_response["orderId"]
                logger.info(f"Checking order status for Order ID: {order_id}")
                
                # Wait a moment for the order to be processed
                await asyncio.sleep(2)
                
                # Check order status with retry
                try:
                    status = await retry_with_backoff(agent.get_order_status(eth_symbol, order_id))
                    logger.info(f"Order status: {json.dumps(status, indent=2)}")
                    
                    # Check if order is filled
                    await asyncio.sleep(5)
                    final_status = await retry_with_backoff(agent.get_order_status(eth_symbol, order_id))
                    logger.info(f"Final order status: {json.dumps(final_status, indent=2)}")
                except Exception as e:
                    logger.error(f"Failed to check order status: {e}")
        except Exception as e:
            logger.error(f"Failed to place order: {e}")
            
    except Exception as e:
        logger.error(f"Error executing Hyperliquid order: {e}")
    finally:
        # Clean up
        await agent.close()
        logger.info("Agent connection closed")

if __name__ == "__main__":
    asyncio.run(execute_eth_order())
