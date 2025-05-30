"""
Test script to execute a 0.1 ETH long market order on Hyperliquid using the configured MCP server.
This script integrates with your Trading Farm dashboard and ElizaOS setup.
"""
import os
import json
import requests
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_mcp_test.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_mcp_test")

# Default MCP server url
MCP_SERVER_URL = "http://localhost:3005"

def execute_mcp_command(tool_name, params):
    """Execute a command via the MCP server"""
    url = f"{MCP_SERVER_URL}/execute"
    payload = {
        "name": tool_name,
        "parameters": params
    }
    
    logger.info(f"Sending MCP request: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error executing MCP command: {e}")
        if hasattr(response, 'text'):
            logger.error(f"Response: {response.text}")
        raise

def main():
    """Execute a 0.1 ETH long market order on Hyperliquid"""
    logger.info("Starting Hyperliquid MCP test...")
    
    try:
        # Step 1: Check current ETH price
        logger.info("Getting ETH price...")
        eth_price_result = execute_mcp_command("mcp0_hyperliquid_get_market_data", {
            "coin": "ETH"
        })
        logger.info(f"ETH price data: {json.dumps(eth_price_result, indent=2)}")
        
        # Step 2: Check wallet balance
        logger.info("Checking wallet balance...")
        balance_result = execute_mcp_command("mcp0_hyperliquid_get_account_balance", {})
        logger.info(f"Wallet balance: {json.dumps(balance_result, indent=2)}")
        
        # Step 3: Get current positions (if any)
        logger.info("Checking current positions...")
        positions_result = execute_mcp_command("mcp0_hyperliquid_get_positions", {})
        logger.info(f"Current positions: {json.dumps(positions_result, indent=2)}")
        
        # Step 4: Create market order for 0.1 ETH long position
        logger.info("Creating market order for 0.1 ETH long position...")
        order_result = execute_mcp_command("mcp0_hyperliquid_create_order", {
            "coin": "ETH",           # The trading pair
            "isBuy": True,           # True for long, False for short
            "sz": 0.1,               # Order size (0.1 ETH)
            "limitPx": 0,            # 0 for market order
            "reduceOnly": False,     # Not a reduce-only order
            "orderType": "Market",   # Market order
            "timeInForce": "GTC"     # Good Till Cancelled
        })
        logger.info(f"Order result: {json.dumps(order_result, indent=2)}")
        
        # Step 5: Check updated positions after order
        logger.info("Checking updated positions...")
        updated_positions = execute_mcp_command("mcp0_hyperliquid_get_positions", {})
        logger.info(f"Updated positions: {json.dumps(updated_positions, indent=2)}")
        
        # Step 6: Get updated wallet balance
        logger.info("Checking updated wallet balance...")
        updated_balance = execute_mcp_command("mcp0_hyperliquid_get_account_balance", {})
        logger.info(f"Updated wallet balance: {json.dumps(updated_balance, indent=2)}")
        
        logger.info("Test completed successfully")
    
    except Exception as e:
        logger.error(f"Error during test: {e}")
        logger.info("Test failed")

if __name__ == "__main__":
    main()
