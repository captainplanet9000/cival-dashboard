"""
Hyperliquid API Integration Module

This module provides the HyperliquidClient class and utilities for the 
Trading Farm dashboard to interact with the Hyperliquid exchange.
"""

import os
import json
import logging
from datetime import datetime

# Import the Hyperliquid client
from test_hyperliquid_integrated import HyperliquidClient

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_api.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_api")

# Client cache for reuse across requests
client_cache = {}

def get_client(client_id="default"):
    """Get or create a HyperliquidClient instance"""
    if client_id not in client_cache:
        # Get configuration from environment or use defaults
        config = {
            "exchange": "hyperliquid",
            "testnet": True,
            "simulation_mode": os.environ.get("HYPERLIQUID_SIMULATION", "true").lower() == "true",
            "base_url": os.environ.get("HYPERLIQUID_BASE_URL", "https://api.hyperliquid.xyz"),
            "wallet_address": os.environ.get("WALLET_ADDRESS", ""),
            "private_key": os.environ.get("PRIVATE_KEY", ""),
            "elizaos_enabled": os.environ.get("ELIZAOS_ENABLED", "false").lower() == "true",
            "elizaos_api_url": os.environ.get("ELIZAOS_API_URL", "http://localhost:3000/api"),
            "agent_id": "hyperliquid_agent"
        }
        
        logger.info(f"Creating new HyperliquidClient with simulation_mode={config['simulation_mode']}")
        client_cache[client_id] = HyperliquidClient(config)
    
    return client_cache[client_id]

def get_hyperliquid_data():
    """Get all Hyperliquid data needed for the dashboard"""
    client = get_client()
    
    try:
        # Get market metadata
        market_data = client.get_market_metadata()
        
        # Get ticker data
        ticker_data = client.get_ticker()
        
        # Get user state (positions and balances)
        user_state = client.get_user_state()
        
        # Process market data for the UI
        ui_market_data = {}
        if 'universe' in market_data:
            for asset in market_data['universe']:
                coin = asset['name']
                ui_market_data[coin] = {
                    'price': 0,
                    'change24h': 0
                }
        
        # Update market data with ticker information
        for ticker in ticker_data if isinstance(ticker_data, list) else [ticker_data]:
            if 'coin' in ticker and ticker['coin'] in ui_market_data:
                ui_market_data[ticker['coin']]['price'] = float(ticker['lastPrice'])
                ui_market_data[ticker['coin']]['change24h'] = float(ticker.get('change24h', 0))
        
        # Process positions for the UI
        positions = []
        if 'assetPositions' in user_state:
            for asset_position in user_state['assetPositions']:
                coin = asset_position['coin']
                position = asset_position['position']
                
                if float(position['size']) == 0:
                    continue  # Skip zero-sized positions
                
                # Determine direction based on position size (positive = long, negative = short)
                direction = 'LONG' if float(position['size']) > 0 else 'SHORT'
                size = abs(float(position['size']))
                
                entry_price = float(position['entryPx']) if float(position['entryPx']) != 0 else ui_market_data.get(coin, {}).get('price', 0)
                current_price = ui_market_data.get(coin, {}).get('price', entry_price)
                
                # Calculate PnL
                if direction == 'LONG':
                    pnl = (current_price - entry_price) * size
                else:
                    pnl = (entry_price - current_price) * size
                
                pnl_percent = (pnl / (entry_price * size)) * 100 if entry_price * size != 0 else 0
                
                positions.append({
                    'asset': coin,
                    'size': size,
                    'direction': direction,
                    'entryPrice': entry_price,
                    'currentPrice': current_price,
                    'pnl': pnl,
                    'pnlPercent': pnl_percent
                })
        
        # Extract account data
        account_data = {
            'accountValue': float(user_state.get('crossMarginSummary', {}).get('accountValue', 0)),
            'freeCollateral': float(user_state.get('crossMarginSummary', {}).get('freeCollateral', 0)),
            'marginUsed': float(user_state.get('crossMarginSummary', {}).get('totalMarginUsed', 0))
        }
        
        # Package the response data
        response_data = {
            'success': True,
            'simulationMode': client.simulation_mode,
            'accountData': account_data,
            'positions': positions,
            'marketData': ui_market_data,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Returning Hyperliquid data with {len(positions)} positions")
        return response_data
    
    except Exception as e:
        logger.error(f"Error getting Hyperliquid data: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def place_order(asset, size, is_buy):
    """Place an order on Hyperliquid"""
    client = get_client()
    
    try:
        if not asset or size <= 0:
            return {
                'success': False,
                'error': 'Invalid order parameters'
            }
        
        logger.info(f"Placing {'BUY' if is_buy else 'SELL'} order for {size} {asset}")
        
        # Place the order
        order_result = client.create_market_order(asset, size, is_buy)
        
        # Check if the order was successful
        if "error" in order_result:
            logger.error(f"Order creation failed: {order_result['error']}")
            return {
                'success': False,
                'error': order_result['error']
            }
        
        logger.info(f"Order successfully created with ID: {order_result.get('orderId', 'N/A')}")
        
        # Get updated user state
        user_state = client.get_user_state()
        
        # Create transaction record
        now = datetime.now()
        transaction = {
            'time': now.strftime('%H:%M:%S'),
            'asset': asset,
            'type': 'Market',
            'side': 'BUY' if is_buy else 'SELL',
            'size': size,
            'price': float(order_result.get('avgFillPrice', 0)),
            'total': float(order_result.get('cost', 0)),
            'fee': float(order_result.get('fee', 0)),
            'status': 'Filled' if order_result.get('filled', False) else 'Pending',
            'orderId': order_result.get('orderId', ''),
            'timestamp': now.isoformat()
        }
        
        # Send notification to ElizaOS if enabled
        if client.elizaos_enabled:
            elizaos_data = {
                'transaction': transaction,
                'orderType': 'market',
                'action': 'buy' if is_buy else 'sell'
            }
            client.send_to_elizaos('order_executed', elizaos_data)
        
        # Package the response data (including updated state)
        return {
            'success': True,
            'order': order_result,
            'transaction': transaction
        }
    
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def set_simulation_mode(enabled):
    """Enable or disable simulation mode"""
    client = get_client()
    
    try:
        # This only changes the simulation flag in the client
        # It doesn't actually switch to a live connection yet
        client.simulation_mode = enabled
        
        logger.info(f"Simulation mode {'enabled' if enabled else 'disabled'}")
        
        return {
            'success': True,
            'simulationMode': enabled
        }
    
    except Exception as e:
        logger.error(f"Error setting simulation mode: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def send_elizaos_command(command, parameters=None):
    """Send a command to ElizaOS"""
    client = get_client()
    
    if not client.elizaos_enabled:
        return {
            'success': False,
            'error': 'ElizaOS integration is disabled'
        }
    
    try:
        if not command:
            return {
                'success': False,
                'error': 'Command is required'
            }
        
        parameters = parameters or {}
        
        logger.info(f"Sending command to ElizaOS: {command}")
        
        # Send the command to ElizaOS
        response = client.send_to_elizaos(command, parameters)
        
        return {
            'success': True,
            'response': response
        }
    
    except Exception as e:
        logger.error(f"Error sending command to ElizaOS: {e}")
        return {
            'success': False,
            'error': str(e)
        }
