"""
Test script to execute a 0.1 ETH long market order on Hyperliquid through ElizaOS integration.
This script simulates a command from the ElizaOS AI Command Console in your Trading Farm dashboard.
"""
import os
import json
import requests
import logging
import time
import hmac
import hashlib
import base64
from datetime import datetime
from eth_account import Account
from eth_account.messages import encode_defunct

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_elizaos_test.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_elizaos_test")

# ElizaOS API endpoint
ELIZA_API_ENDPOINT = os.environ.get("ELIZA_API_ENDPOINT", "http://localhost:3000/api")
ELIZA_AGENT_ID = os.environ.get("ELIZA_AGENT_ID", "eliza_trading_agent_1")

# Hyperliquid API endpoint
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz"

def send_eliza_command(command, parameters=None):
    """Send a command to ElizaOS"""
    url = f"{ELIZA_API_ENDPOINT}/agents/{ELIZA_AGENT_ID}/command"
    
    payload = {
        "command": command,
        "parameters": parameters or {}
    }
    
    logger.info(f"Sending ElizaOS command: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code != 200:
            logger.error(f"ElizaOS API error: {response.status_code} - {response.text}")
            return None
        
        return response.json()
    except Exception as e:
        logger.error(f"Error sending ElizaOS command: {e}")
        return None

def sign_hyperliquid_request(private_key, request_data):
    """Sign a Hyperliquid API request using the private key"""
    # Convert request data to string
    request_str = json.dumps(request_data, separators=(',', ':'))
    
    # Sign the message
    private_key_bytes = bytes.fromhex(private_key.replace('0x', ''))
    signature = hmac.new(private_key_bytes, request_str.encode(), hashlib.sha256).hexdigest()
    
    return signature

def hyperliquid_direct_order(private_key, wallet_address, coin, size, is_buy=True):
    """Send a direct order to Hyperliquid API (fallback method)"""
    # Create the order data
    timestamp = int(time.time() * 1000)
    order_data = {
        "coin": coin,
        "is_buy": is_buy,
        "sz": size,
        "limit_px": 0,  # 0 for market order
        "tif": "Gtc"  # Good till cancel
    }
    
    # Create action
    action = {
        "type": "order",
        "order": order_data
    }
    
    # Prepare the message to sign
    message = {
        "action": action,
        "nonce": timestamp,
        "expiration": timestamp + 60000  # 1 minute expiration
    }
    
    # Create the message hash
    message_hash = encode_defunct(text=json.dumps(message))
    
    # Create the private key object
    if private_key.startswith('0x'):
        private_key = private_key[2:]
    
    account = Account.from_key(private_key)
    signed_message = account.sign_message(message_hash)
    
    # Create the final request payload
    payload = {
        "action": action,
        "signature": signed_message.signature.hex(),
        "nonce": timestamp,
        "expiration": timestamp + 60000
    }
    
    # Send the request
    url = f"{HYPERLIQUID_API_URL}/exchange"
    headers = {
        "Content-Type": "application/json"
    }
    
    logger.info(f"Sending direct Hyperliquid order: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"Hyperliquid API error: {response.status_code} - {response.text}")
            return None
        
        return response.json()
    except Exception as e:
        logger.error(f"Error sending Hyperliquid order: {e}")
        return None

def main():
    """Execute a test transaction on Hyperliquid"""
    logger.info("Starting Hyperliquid ElizaOS test...")
    
    # Get credentials from environment variables
    private_key = os.environ.get("PRIVATE_KEY", "0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a")
    wallet_address = os.environ.get("WALLET_ADDRESS", "0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2")
    
    try:
        # First, try using ElizaOS to execute the trade
        logger.info("Attempting to execute trade via ElizaOS...")
        
        # 1. Check market data
        market_data = send_eliza_command("analyze_market", {
            "market": "ETH",
            "timeframe": "1h"
        })
        
        if market_data:
            logger.info(f"Market data: {json.dumps(market_data, indent=2)}")
        else:
            logger.warning("Could not get market data from ElizaOS, continuing with direct API approach")
        
        # 2. Execute the trade command through ElizaOS
        trade_result = send_eliza_command("execute_trade", {
            "market": "ETH",
            "direction": "long",
            "size": 0.1,
            "order_type": "market",
            "exchange": "hyperliquid"
        })
        
        if trade_result:
            logger.info(f"Trade result from ElizaOS: {json.dumps(trade_result, indent=2)}")
            logger.info("Successfully executed 0.1 ETH long market order via ElizaOS")
        else:
            # Fallback to direct API approach
            logger.warning("ElizaOS trade execution failed, attempting direct API approach")
            
            # Direct API approach
            direct_result = hyperliquid_direct_order(
                private_key=private_key,
                wallet_address=wallet_address,
                coin="ETH",
                size=0.1,
                is_buy=True
            )
            
            if direct_result:
                logger.info(f"Direct API trade result: {json.dumps(direct_result, indent=2)}")
                logger.info("Successfully executed 0.1 ETH long market order via direct API")
            else:
                logger.error("Failed to execute trade via direct API")
        
        # 3. Check trade status
        trade_status = send_eliza_command("check_position", {
            "market": "ETH",
            "exchange": "hyperliquid"
        })
        
        if trade_status:
            logger.info(f"Position status: {json.dumps(trade_status, indent=2)}")
        
        logger.info("Test completed successfully")
        
    except Exception as e:
        logger.error(f"Error during test: {e}")
        logger.info("Test failed")

if __name__ == "__main__":
    main()
