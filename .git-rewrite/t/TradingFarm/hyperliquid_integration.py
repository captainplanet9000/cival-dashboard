"""
Hyperliquid Integration Module

This module integrates the Hyperliquid exchange and API endpoints into 
the Trading Farm dashboard and ElizaOS system.
"""

import os
import logging
from dash import Dash
from dash.exceptions import PreventUpdate
import json
from datetime import datetime

# Import the hyperliquid API module
from hyperliquid_api import HyperliquidClient

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_integration.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_integration")

# INTEGRATION DISABLED FLAG - setting to False to enable the integration
INTEGRATION_DISABLED = False

def integrate_hyperliquid_with_dashboard(app):
    """
    Integrate Hyperliquid with the Trading Farm dashboard
    
    Args:
        app: Dash application instance
    """
    if INTEGRATION_DISABLED:
        logger.info("Hyperliquid integration is disabled")
        return app
    
    # Instead of registering a blueprint, we'll integrate with Dash directly
    # We need to adapt our API endpoints to Dash callbacks
    setup_dash_callbacks(app)
    
    # Set up static routes for Hyperliquid dashboard templates and assets
    setup_static_routes(app)
    
    logger.info("Hyperliquid integration with dashboard complete")
    
    return app

def setup_static_routes(app):
    """Set up routes for Hyperliquid dashboard templates and assets"""
    # In Dash, we can use the app.server attribute to get the underlying Flask app
    # and add routes to it
    
    @app.server.route('/templates/hyperliquid_tab.html')
    def hyperliquid_tab_template():
        """Serve the Hyperliquid tab template"""
        try:
            with open('dashboard/templates/hyperliquid_tab.html', 'r') as f:
                content = f.read()
            return content
        except Exception as e:
            logger.error(f"Error serving Hyperliquid tab template: {e}")
            return "Error loading template", 500
    
    logger.info("Set up static routes for Hyperliquid dashboard templates")

def setup_dash_callbacks(app):
    """Set up Dash callbacks for Hyperliquid API endpoints"""
    from dash import Input, Output, State, callback, html
    
    # Import the Hyperliquid client
    from test_hyperliquid_integrated import HyperliquidClient
    
    # Create client cache
    client_cache = {}
    
    def get_client():
        """Get or create a HyperliquidClient instance"""
        client_id = "default"
        
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
    
    # Register a no-display div to store hyperliquid state
    app.layout.children.append(html.Div(id='hyperliquid-state', style={'display': 'none'}))
    
    # Creating Dash endpoints equivalent to our Flask blueprints
    
    # API endpoint to get Hyperliquid data
    @app.callback(
        Output('hyperliquid-state', 'children'),
        Input('hyperliquid-data-request', 'n_clicks'),
        prevent_initial_call=True
    )
    def get_hyperliquid_data(n_clicks):
        if n_clicks is None:
            raise PreventUpdate
            
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
            return json.dumps(response_data)
        
        except Exception as e:
            logger.error(f"Error getting Hyperliquid data: {e}")
            return json.dumps({
                'success': False,
                'error': str(e)
            })
    
    # API endpoint to place an order
    @app.callback(
        Output('hyperliquid-order-result', 'children'),
        Input('hyperliquid-place-order', 'n_clicks'),
        [State('hyperliquid-order-asset', 'value'),
         State('hyperliquid-order-size', 'value'),
         State('hyperliquid-order-side', 'value')],
        prevent_initial_call=True
    )
    def place_order(n_clicks, asset, size, side):
        if n_clicks is None or not asset or not size:
            raise PreventUpdate
            
        client = get_client()
        
        try:
            # Extract order details
            size = float(size)
            is_buy = side.upper() == 'BUY' if isinstance(side, str) else True
            
            if size <= 0:
                return json.dumps({
                    'success': False,
                    'error': 'Invalid order size'
                })
            
            logger.info(f"Placing {'BUY' if is_buy else 'SELL'} order for {size} {asset}")
            
            # Place the order
            order_result = client.create_market_order(asset, size, is_buy)
            
            # Check if the order was successful
            if "error" in order_result:
                logger.error(f"Order creation failed: {order_result['error']}")
                return json.dumps({
                    'success': False,
                    'error': order_result['error']
                })
            
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
            return json.dumps({
                'success': True,
                'order': order_result,
                'transaction': transaction
            })
        
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return json.dumps({
                'success': False,
                'error': str(e)
            })
    
    # API endpoint to set simulation mode
    @app.callback(
        Output('hyperliquid-simulation-result', 'children'),
        Input('hyperliquid-set-simulation', 'n_clicks'),
        State('hyperliquid-simulation-enabled', 'value'),
        prevent_initial_call=True
    )
    def set_simulation_mode(n_clicks, enabled):
        if n_clicks is None:
            raise PreventUpdate
            
        client = get_client()
        
        try:
            # This only changes the simulation flag in the client
            # It doesn't actually switch to a live connection yet
            client.simulation_mode = enabled
            
            logger.info(f"Simulation mode {'enabled' if enabled else 'disabled'}")
            
            return json.dumps({
                'success': True,
                'simulationMode': enabled
            })
        
        except Exception as e:
            logger.error(f"Error setting simulation mode: {e}")
            return json.dumps({
                'success': False,
                'error': str(e)
            })
    
    # API endpoint to send a command to ElizaOS
    @app.callback(
        Output('hyperliquid-elizaos-result', 'children'),
        Input('hyperliquid-send-elizaos', 'n_clicks'),
        [State('hyperliquid-elizaos-command', 'value'),
         State('hyperliquid-elizaos-params', 'value')],
        prevent_initial_call=True
    )
    def send_elizaos_command(n_clicks, command, parameters):
        if n_clicks is None or not command:
            raise PreventUpdate
            
        client = get_client()
        
        if not client.elizaos_enabled:
            return json.dumps({
                'success': False,
                'error': 'ElizaOS integration is disabled'
            })
        
        try:
            # Parse parameters if provided as JSON string
            if parameters and isinstance(parameters, str):
                try:
                    parameters = json.loads(parameters)
                except:
                    parameters = {'text': parameters}
            else:
                parameters = {}
            
            logger.info(f"Sending command to ElizaOS: {command}")
            
            # Send the command to ElizaOS
            response = client.send_to_elizaos(command, parameters)
            
            return json.dumps({
                'success': True,
                'response': response
            })
        
        except Exception as e:
            logger.error(f"Error sending command to ElizaOS: {e}")
            return json.dumps({
                'success': False,
                'error': str(e)
            })
    
    logger.info("Registered Hyperliquid callbacks with Dash app")

def integrate_hyperliquid_with_elizaos(elizaos_client):
    """
    Integrate Hyperliquid with ElizaOS
    
    Args:
        elizaos_client: ElizaOS client instance
    """
    if INTEGRATION_DISABLED:
        logger.info("Hyperliquid integration is disabled")
        return None
    
    # Create Hyperliquid client for ElizaOS
    config = {
        "exchange": "hyperliquid",
        "testnet": True,
        "simulation_mode": os.environ.get("HYPERLIQUID_SIMULATION", "true").lower() == "true",
        "base_url": os.environ.get("HYPERLIQUID_BASE_URL", "https://api.hyperliquid.xyz"),
        "wallet_address": os.environ.get("WALLET_ADDRESS", ""),
        "private_key": os.environ.get("PRIVATE_KEY", ""),
        "elizaos_enabled": True,
        "elizaos_api_url": os.environ.get("ELIZAOS_API_URL", "http://localhost:3000/api"),
        "agent_id": "hyperliquid_agent"
    }
    
    hyperliquid_client = HyperliquidClient(config)
    
    # Register Hyperliquid commands with ElizaOS
    register_elizaos_commands(elizaos_client, hyperliquid_client)
    
    logger.info("Hyperliquid integration with ElizaOS complete")
    
    return hyperliquid_client

def register_elizaos_commands(elizaos_client, hyperliquid_client):
    """
    Register Hyperliquid commands with ElizaOS
    
    This allows ElizaOS to execute Hyperliquid operations based on natural language commands
    
    Args:
        elizaos_client: ElizaOS client instance
        hyperliquid_client: Hyperliquid client instance
    """
    # The specific implementation will depend on the ElizaOS API
    # This is a placeholder for the actual implementation
    
    # Example command registration (modify based on actual ElizaOS API)
    hyperliquid_commands = [
        {
            "name": "analyze_market",
            "description": "Analyze the market for a specific asset",
            "patterns": ["analyze {asset} market", "market analysis for {asset}"],
            "handler": lambda params: analyze_market(hyperliquid_client, params["asset"])
        },
        {
            "name": "predict_price",
            "description": "Predict the price for a specific asset",
            "patterns": ["predict {asset} price", "price prediction for {asset}"],
            "handler": lambda params: predict_price(hyperliquid_client, params["asset"])
        },
        {
            "name": "execute_market_order",
            "description": "Execute a market order",
            "patterns": ["execute market {side} {size} {asset}", "place {side} order for {size} {asset}"],
            "handler": lambda params: execute_market_order(
                hyperliquid_client, 
                params["asset"], 
                float(params["size"]), 
                params["side"].lower() == "buy"
            )
        },
        {
            "name": "check_positions",
            "description": "Check current positions",
            "patterns": ["check positions", "show positions", "current positions"],
            "handler": lambda params: check_positions(hyperliquid_client)
        }
    ]
    
    # Register commands with ElizaOS
    try:
        # This is a placeholder - implement based on actual ElizaOS API
        for command in hyperliquid_commands:
            elizaos_client.register_command(command)
        
        logger.info(f"Registered {len(hyperliquid_commands)} Hyperliquid commands with ElizaOS")
    except Exception as e:
        logger.error(f"Error registering Hyperliquid commands with ElizaOS: {e}")

# Command handlers for ElizaOS
def analyze_market(hyperliquid_client, asset):
    """Analyze the market for a specific asset"""
    try:
        # Get ticker data
        ticker_data = hyperliquid_client.get_ticker(asset)
        
        # Perform analysis (this would be more sophisticated in a real implementation)
        price = float(ticker_data.get('lastPrice', 0))
        change_24h = float(ticker_data.get('change24h', 0))
        
        sentiment = "Bullish" if change_24h > 0 else "Bearish"
        
        return {
            "asset": asset,
            "price": price,
            "change_24h": change_24h,
            "sentiment": sentiment,
            "analysis": f"{asset} is currently trading at ${price}, with a 24h change of {change_24h}%. Market sentiment appears to be {sentiment}."
        }
    except Exception as e:
        logger.error(f"Error analyzing market for {asset}: {e}")
        return {"error": str(e)}

def predict_price(hyperliquid_client, asset):
    """Predict the price for a specific asset"""
    try:
        # Get ticker data
        ticker_data = hyperliquid_client.get_ticker(asset)
        
        # Very simple "prediction" (this would use actual models in a real implementation)
        current_price = float(ticker_data.get('lastPrice', 0))
        change_24h = float(ticker_data.get('change24h', 0))
        
        # Simple trend-based "prediction"
        if change_24h > 0:
            # Upward trend
            lower_target = current_price * 1.01
            upper_target = current_price * 1.03
            trend = "upward"
        else:
            # Downward trend
            lower_target = current_price * 0.97
            upper_target = current_price * 0.99
            trend = "downward"
        
        return {
            "asset": asset,
            "current_price": current_price,
            "trend": trend,
            "lower_target": lower_target,
            "upper_target": upper_target,
            "prediction": f"{asset} price prediction: {trend.capitalize()} trend expected over next 24h, target ${lower_target:.2f}-{upper_target:.2f}"
        }
    except Exception as e:
        logger.error(f"Error predicting price for {asset}: {e}")
        return {"error": str(e)}

def execute_market_order(hyperliquid_client, asset, size, is_buy):
    """Execute a market order"""
    try:
        order_result = hyperliquid_client.create_market_order(asset, size, is_buy)
        
        if "error" in order_result:
            return {"error": order_result["error"]}
        
        return {
            "success": True,
            "order": order_result,
            "message": f"Successfully executed {is_buy and 'BUY' or 'SELL'} order for {size} {asset}"
        }
    except Exception as e:
        logger.error(f"Error executing market order: {e}")
        return {"error": str(e)}

def check_positions(hyperliquid_client):
    """Check current positions"""
    try:
        user_state = hyperliquid_client.get_user_state()
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
                
                positions.append({
                    'asset': coin,
                    'size': size,
                    'direction': direction,
                    'entryPrice': float(position['entryPx']),
                    'unrealizedPnl': float(position.get('unrealizedPnl', 0))
                })
        
        # Format the response
        if not positions:
            return {"positions": [], "message": "No active positions"}
        
        message = "Current positions: " + ", ".join([
            f"{p['size']} {p['asset']} {p['direction']} at ${p['entryPrice']:.2f}" for p in positions
        ])
        
        return {
            "positions": positions,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error checking positions: {e}")
        return {"error": str(e)}

# Main integration function
def setup_hyperliquid_integration(app=None, elizaos_client=None):
    """
    Set up Hyperliquid integration with both the dashboard and ElizaOS
    
    Args:
        app: Dash application instance (optional)
        elizaos_client: ElizaOS client instance (optional)
    
    Returns:
        tuple: (app, hyperliquid_client)
    """
    hyperliquid_client = None
    
    if app:
        app = integrate_hyperliquid_with_dashboard(app)
    
    if elizaos_client:
        hyperliquid_client = integrate_hyperliquid_with_elizaos(elizaos_client)
    
    return app, hyperliquid_client

if __name__ == "__main__":
    # This can be used for testing the integration
    app = Dash(__name__)
    app, _ = setup_hyperliquid_integration(app)
    
    print("Hyperliquid integration setup complete")
    print("Run the Trading Farm server to see the integration in action")
