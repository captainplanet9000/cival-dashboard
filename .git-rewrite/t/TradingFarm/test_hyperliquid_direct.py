"""
Direct test script to execute a 0.1 ETH long market order on Hyperliquid.
This script bypasses the dashboard and ElizaOS integration to directly test the Hyperliquid API.
"""
import os
import json
import time
import hmac
import hashlib
import base64
import logging
import requests
import urllib3
from datetime import datetime
from eth_account import Account
from eth_account.messages import encode_defunct

# Disable SSL warnings for testing purposes
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_direct_test.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_direct_test")

# Flag to enable/disable actual trading
READ_ONLY = True

# Current Hyperliquid API endpoints - try both domains
API_BASE_URLS = [
    "https://api.hyperliquid.io",
    "https://api.hyperliquid.xyz", 
    "https://hyperliquid.xyz"
]

def main():
    """Execute a 0.1 ETH long market order directly on Hyperliquid"""
    logger.info(f"Starting Hyperliquid direct test in {'read-only' if READ_ONLY else 'trading'} mode")
    
    # Get credentials from environment variables or use test values
    private_key = os.environ.get("PRIVATE_KEY")
    wallet_address = os.environ.get("WALLET_ADDRESS")
    
    if not private_key or not wallet_address:
        logger.warning("Private key or wallet address not found in environment variables. Using test values for information gathering only.")
    
    try:
        # Try each base URL until we find one that works
        for base_url in API_BASE_URLS:
            logger.info(f"Attempting to connect to Hyperliquid API at {base_url}")
            
            # 1. Get market information from Hyperliquid API
            logger.info("Fetching market metadata...")
            
            # Try multiple endpoint patterns
            meta_endpoints = [
                "/info/meta",
                "/exchange/v1/markets",
                "/api/markets",
                "/api/v1/markets"
            ]
            
            meta_data = None
            for endpoint in meta_endpoints:
                meta_url = f"{base_url}{endpoint}"
                logger.info(f"Trying metadata endpoint: {meta_url}")
                
                try:
                    meta_response = requests.get(meta_url, verify=False, timeout=5)
                    meta_response.raise_for_status()
                    meta_data = meta_response.json()
                    logger.info(f"Successfully connected to {meta_url}")
                    logger.info(f"Metadata sample: {json.dumps(meta_data[:1] if isinstance(meta_data, list) else list(meta_data.items())[:1] if isinstance(meta_data, dict) else meta_data, indent=2)}")
                    break
                except Exception as e:
                    logger.warning(f"Could not connect to {meta_url}: {e}")
            
            if meta_data is not None:
                # We found a working endpoint, now try to get ticker data
                logger.info("Fetching current ETH price...")
                
                # Try multiple ticker endpoint patterns
                ticker_endpoints = [
                    "/info/ticker",
                    "/exchange/v1/market/ticker?symbol=ETH",
                    "/api/prices",
                    "/prices",
                    "/v1/tickers"
                ]
                
                ticker_data = None
                for endpoint in ticker_endpoints:
                    ticker_url = f"{base_url}{endpoint}"
                    logger.info(f"Trying ticker endpoint: {ticker_url}")
                    
                    try:
                        ticker_response = requests.get(ticker_url, verify=False, timeout=5)
                        ticker_response.raise_for_status()
                        ticker_data = ticker_response.json()
                        logger.info(f"Successfully connected to {ticker_url}")
                        logger.info(f"Ticker data sample: {json.dumps(ticker_data[:1] if isinstance(ticker_data, list) else list(ticker_data.items())[:1] if isinstance(ticker_data, dict) else ticker_data, indent=2)}")
                        break
                    except Exception as e:
                        logger.warning(f"Could not connect to {ticker_url}: {e}")
                
                if ticker_data is not None:
                    logger.info(f"Successfully connected to Hyperliquid API at {base_url}")
                    # Found a working base URL and endpoints
                    working_base_url = base_url
                    break
        
        # Skip actual order creation if in read-only mode
        if READ_ONLY:
            logger.info("Running in read-only mode, skipping actual order creation")
            logger.info("To execute a real trade, set READ_ONLY = False and ensure environment variables are set")
            logger.info("Test completed in read-only mode")
            return
        
        # 4. Create the order if not in read-only mode and we found working endpoints
        if 'working_base_url' not in locals():
            logger.error("Could not find working Hyperliquid API endpoints. Cannot create order.")
            return
            
        logger.info("Creating market order for 0.1 ETH long position...")
        
        if not private_key or not wallet_address:
            logger.error("Cannot create order: Private key and wallet address required")
            return
        
        # Create order payload
        timestamp = int(time.time() * 1000)
        
        # Create action
        action = {
            "type": "order",
            "order": {
                "coin": "ETH",
                "is_buy": True,  # long position
                "sz": 0.1,  # 0.1 ETH
                "limit_px": 0,  # 0 for market order
                "tif": "Gtc"  # Good till cancelled
            }
        }
        
        # Create the message to sign
        msg = {
            "action": action,
            "nonce": timestamp,
            "expiration": timestamp + 60000  # 1 minute expiration
        }
        
        # Create the message hash
        message_hash = encode_defunct(text=json.dumps(msg))
        
        # Sign the message
        if private_key and private_key.startswith('0x'):
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
        
        # Send the order request - try multiple endpoints
        order_endpoints = [
            "/exchange",
            "/api/exchange",
            "/v1/orders"
        ]
        
        for endpoint in order_endpoints:
            order_url = f"{working_base_url}{endpoint}"
            headers = {
                "Content-Type": "application/json"
            }
            
            logger.info(f"Sending order request to {order_url}")
            
            try:
                order_response = requests.post(order_url, headers=headers, json=payload, verify=False, timeout=5)
                if order_response.status_code == 200:
                    order_result = order_response.json()
                    logger.info(f"Order successfully created: {json.dumps(order_result, indent=2)}")
                    break
                else:
                    logger.error(f"Order creation failed: {order_response.status_code} - {order_response.text}")
            except Exception as e:
                logger.error(f"Error creating order: {e}")
        
        logger.info("Test completed")
        
    except Exception as e:
        logger.error(f"Error executing test: {e}")
        logger.info("Test completed with errors")

if __name__ == "__main__":
    main()
