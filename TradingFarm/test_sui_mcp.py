"""
Test script to execute a 10 SUI long market order on the Sui blockchain using the configured MCP server.
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
        logging.FileHandler("sui_mcp_test.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("sui_mcp_test")

# Sui MCP server url (port 3005 based on our config)
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
    """Execute a 10 SUI long market order on Sui blockchain"""
    logger.info("Starting Sui blockchain MCP test...")
    
    try:
        # Step 1: Check current SUI price
        logger.info("Getting SUI price...")
        sui_price_result = execute_mcp_command("mcp0_sui_get_market_data", {
            "symbol": "SUI-USDC"
        })
        logger.info(f"SUI price data: {json.dumps(sui_price_result, indent=2)}")
        
        # Step 2: Check wallet balance
        logger.info("Checking wallet balance...")
        balance_result = execute_mcp_command("mcp0_sui_get_account_balance", {})
        logger.info(f"Wallet balance: {json.dumps(balance_result, indent=2)}")
        
        # Step 3: Get current positions (if any)
        logger.info("Checking current positions...")
        positions_result = execute_mcp_command("mcp0_sui_get_positions", {})
        logger.info(f"Current positions: {json.dumps(positions_result, indent=2)}")
        
        # Step 4: Create market order for 10 SUI long position
        logger.info("Creating market order for 10 SUI long position...")
        order_result = execute_mcp_command("mcp0_sui_create_order", {
            "symbol": "SUI-USDC",    # The trading pair
            "side": "BUY",           # BUY for long, SELL for short
            "size": 10.0,            # Order size (10 SUI)
            "price": 0,              # 0 for market order
            "reduce_only": False,    # Not a reduce-only order
            "order_type": "MARKET",  # Market order
            "time_in_force": "GTC"   # Good Till Cancelled
        })
        logger.info(f"Order result: {json.dumps(order_result, indent=2)}")
        
        # Step 5: Check open orders
        logger.info("Checking open orders...")
        open_orders = execute_mcp_command("mcp0_sui_get_open_orders", {
            "symbol": "SUI-USDC"
        })
        logger.info(f"Open orders: {json.dumps(open_orders, indent=2)}")
        
        # Step 6: Check updated positions after order
        logger.info("Checking updated positions...")
        updated_positions = execute_mcp_command("mcp0_sui_get_positions", {})
        logger.info(f"Updated positions: {json.dumps(updated_positions, indent=2)}")
        
        # Step 7: Get transaction history
        logger.info("Getting transaction history...")
        tx_history = execute_mcp_command("mcp0_sui_get_transaction_history", {
            "limit": 5
        })
        logger.info(f"Transaction history: {json.dumps(tx_history, indent=2)}")
        
        # Step 8: Get updated wallet balance
        logger.info("Checking updated wallet balance...")
        updated_balance = execute_mcp_command("mcp0_sui_get_account_balance", {})
        logger.info(f"Updated wallet balance: {json.dumps(updated_balance, indent=2)}")
        
        # Step 9: Create a test order and then cancel it
        logger.info("Creating a limit order to test cancellation...")
        limit_order = execute_mcp_command("mcp0_sui_create_order", {
            "symbol": "SUI-USDC",    # The trading pair
            "side": "BUY",           # BUY for long, SELL for short
            "size": 5.0,             # Order size (5 SUI)
            "price": 1.5,            # Limit price below market
            "reduce_only": False,    # Not a reduce-only order
            "order_type": "LIMIT",   # Limit order
            "time_in_force": "GTC"   # Good Till Cancelled
        })
        logger.info(f"Limit order result: {json.dumps(limit_order, indent=2)}")
        
        # Get the order ID from the response
        if "order_id" in limit_order:
            order_id = limit_order["order_id"]
            logger.info(f"Cancelling order with ID: {order_id}")
            
            # Cancel the order
            cancel_result = execute_mcp_command("mcp0_sui_cancel_order", {
                "symbol": "SUI-USDC",
                "order_id": order_id
            })
            logger.info(f"Cancel result: {json.dumps(cancel_result, indent=2)}")
        else:
            logger.warning("Could not extract order ID from limit order response")
        
        logger.info("Test completed successfully")
    
    except Exception as e:
        logger.error(f"Error during test: {e}")
        logger.info("Test failed")

if __name__ == "__main__":
    main()
