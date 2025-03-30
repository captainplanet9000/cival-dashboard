"""
Test script to execute a 0.1 ETH long market order on Hyperliquid.
"""
import os
import asyncio
import json
import logging
from datetime import datetime
import time
import requests
from typing import Dict, Any

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_test.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_test")

# Current Hyperliquid API endpoints (as of March 2025)
HYPERLIQUID_API_URL = "https://api.hyperliquid.io"  # Production endpoint
HYPERLIQUID_TESTNET_API_URL = "https://api.hyperliquid.io"  # For now, use prod in read-only

# Ethereum curve for signing
try:
    from eth_account import Account
    from eth_account.messages import encode_defunct
except ImportError:
    logger.error("eth_account library not found. Please install with: pip install eth-account")
    raise

def sign_message(private_key, message):
    """Sign a message using Ethereum private key"""
    message_hash = encode_defunct(text=message)
    signed_message = Account.sign_message(message_hash, private_key)
    return signed_message.signature.hex()

async def main():
    # Environment variables from your MCP config
    private_key = os.environ.get("PRIVATE_KEY", "0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a")
    wallet_address = os.environ.get("WALLET_ADDRESS", "0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2")
    
    # Remove '0x' prefix if present for signing
    if private_key.startswith("0x"):
        private_key = private_key[2:]
    
    # For safety, we'll use the production API in read-only mode
    # This means we'll query data but not submit orders
    use_testnet = False  # Set to True if using testnet
    read_only = True  # Set to False to actually execute trades
    
    base_url = HYPERLIQUID_API_URL
    logger.info(f"Using Hyperliquid {'testnet' if use_testnet else 'mainnet'} in {'read-only' if read_only else 'trading'} mode")
    
    # Derive Ethereum account from private key
    account = Account.from_key(private_key)
    logger.info(f"Using wallet address: {account.address}")
    
    try:
        # Check account info
        logger.info("Checking account information...")
        
        # Get market meta information
        meta_url = f"{base_url}/info/meta"
        logger.info(f"Fetching market metadata from: {meta_url}")
        
        meta_response = requests.get(meta_url)
        
        if meta_response.status_code == 200:
            meta = meta_response.json()
            logger.info(f"Available markets: {len(meta.get('universe', []))} coins")
            
            # Find ETH in the meta information
            eth_meta = next((coin for coin in meta.get("universe", []) if coin.get("name") == "ETH"), None)
            
            if eth_meta:
                logger.info(f"ETH metadata: {json.dumps(eth_meta, indent=2)}")
                
                # Get current ETH price
                eth_ticker_url = f"{base_url}/info/ticker?coin=ETH"
                logger.info(f"Fetching ETH ticker from: {eth_ticker_url}")
                
                eth_ticker_response = requests.get(eth_ticker_url)
                
                if eth_ticker_response.status_code == 200:
                    eth_ticker = eth_ticker_response.json()
                    logger.info(f"Current ETH price: ${eth_ticker.get('markPx', 'N/A')}")
                    
                    # Get user state if possible
                    user_state_url = f"{base_url}/info/user?user={account.address}"
                    logger.info(f"Fetching user state from: {user_state_url}")
                    
                    user_state_response = requests.get(user_state_url)
                    
                    if user_state_response.status_code == 200:
                        user_state = user_state_response.json()
                        logger.info(f"User state: {json.dumps(user_state, indent=2)}")
                        
                        # Show current positions if any
                        positions = user_state.get("assetPositions", [])
                        if positions:
                            logger.info(f"Current positions: {json.dumps(positions, indent=2)}")
                        else:
                            logger.info("No current positions found")
                            
                        # Show current margin balance
                        margin_summary = user_state.get("marginSummary", {})
                        logger.info(f"Margin summary: {json.dumps(margin_summary, indent=2)}")
                    else:
                        logger.warning(f"Could not fetch user state: {user_state_response.text}")
                    
                    if not read_only:
                        # Create order payload for a market order to go long 0.1 ETH
                        timestamp = int(time.time() * 1000)
                        
                        # Order action
                        action = {
                            "type": "order",
                            "order": {
                                "coin": "ETH",
                                "is_buy": True,  # Long position
                                "sz": 0.1,  # 0.1 ETH
                                "limit_px": 0,  # 0 for market order
                                "tpPx": 0,  # No take profit price
                                "slPx": 0,  # No stop loss price
                                "tif": "Gtc",  # Good till cancel
                                "reduce_only": False
                            }
                        }
                        
                        # Create signature message
                        message = json.dumps({
                            "action": action,
                            "nonce": timestamp,
                            "expiration": timestamp + 60000  # 1 minute expiration
                        })
                        
                        # Sign the message
                        signature = sign_message(private_key, message)
                        
                        # Final request payload
                        request_payload = {
                            "action": action,
                            "signature": signature,
                            "nonce": timestamp,
                            "expiration": timestamp + 60000
                        }
                        
                        # Execute the order
                        logger.info(f"Sending order: {json.dumps(request_payload, indent=2)}")
                        order_url = f"{base_url}/exchange"
                        order_response = requests.post(
                            order_url,
                            json=request_payload
                        )
                        
                        if order_response.status_code == 200:
                            order_result = order_response.json()
                            logger.info(f"Order executed successfully: {json.dumps(order_result, indent=2)}")
                            
                            # Wait a moment for the order to process
                            logger.info("Waiting for order to process...")
                            await asyncio.sleep(2)
                            
                            # Check updated user state
                            updated_state_response = requests.get(user_state_url)
                            
                            if updated_state_response.status_code == 200:
                                updated_state = updated_state_response.json()
                                logger.info(f"Updated user state: {json.dumps(updated_state, indent=2)}")
                                
                                # Check positions
                                positions = updated_state.get("assetPositions", [])
                                logger.info(f"Current positions: {json.dumps(positions, indent=2)}")
                            else:
                                logger.error(f"Failed to get updated user state: {updated_state_response.text}")
                        else:
                            logger.error(f"Order execution failed: {order_response.text}")
                    else:
                        # In read-only mode, just show the order we would have sent
                        logger.info("READ-ONLY MODE: Would have sent a market order to go long 0.1 ETH")
                        logger.info("Order details:")
                        logger.info("  - Symbol: ETH")
                        logger.info("  - Side: BUY (Long)")
                        logger.info("  - Size: 0.1 ETH")
                        logger.info("  - Order Type: Market")
                else:
                    logger.error(f"Failed to get ETH ticker: {eth_ticker_response.text}")
            else:
                logger.error("ETH not found in available coins")
        else:
            logger.error(f"Failed to get meta information: {meta_response.text}")
                
    except Exception as e:
        logger.error(f"Error executing test: {e}")
    
    logger.info("Test completed")

if __name__ == "__main__":
    asyncio.run(main())
