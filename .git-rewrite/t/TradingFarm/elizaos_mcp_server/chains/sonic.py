"""
Sonic adapter for ElizaOS MCP Server integration.
Handles communication with Sonic exchange for trading operations.
"""
import os
import json
import logging
import asyncio
import time
import hmac
import hashlib
import base64
from typing import Dict, Any, List, Optional
import aiohttp
import websockets
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("sonic_adapter")

class SonicAdapter:
    """
    Adapter for interacting with Sonic exchange.
    """
    
    def __init__(self):
        """Initialize the Sonic adapter."""
        self.api_url = "https://api.sonic.exchange"
        self.ws_url = "wss://stream.sonic.exchange"
        self.private_key = os.getenv("SONIC_PRIVATE_KEY", "")
        self.wallet_address = os.getenv("SONIC_WALLET_ADDRESS", "")
        
        # Flag to indicate if we're in simulation mode (for development/testing)
        self.simulation_mode = True
        
        if not self.private_key or not self.wallet_address:
            logger.warning("Sonic private key or wallet address not set, using simulation mode")
            self.simulation_mode = True
    
    async def get_account_balance(self) -> Dict[str, Any]:
        """
        Get account balance information.
        
        Returns:
            Dict containing account balance information
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for get_account_balance")
                return {
                    "success": True,
                    "simulation": True,
                    "balance": 8000.0,
                    "free_collateral": 7200.0,
                    "unrealized_pnl": 450.0,
                    "margin_used": 800.0,
                    "wallet_address": self.wallet_address or "0xSimulatedSonicAddress",
                }
            
            # Actual API call would go here
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/account"
                headers = self._get_auth_headers("GET", "/api/v1/account", None)
                
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting account balance: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    return {
                        "success": True,
                        "balance": data.get("totalBalance", 0),
                        "free_collateral": data.get("availableBalance", 0),
                        "unrealized_pnl": data.get("unrealizedPnl", 0),
                        "margin_used": data.get("totalInitialMargin", 0),
                        "wallet_address": self.wallet_address,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_account_balance: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "balance": 8000.0,
                    "free_collateral": 7200.0,
                    "unrealized_pnl": 450.0,
                    "margin_used": 800.0,
                    "wallet_address": self.wallet_address or "0xSimulatedSonicAddress",
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_positions(self) -> Dict[str, Any]:
        """
        Get current positions.
        
        Returns:
            Dict containing positions
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for get_positions")
                return {
                    "success": True,
                    "simulation": True,
                    "positions": [
                        {
                            "asset": "SONIC",
                            "size": 5000.0,
                            "entry_price": 0.22,
                            "liquidation_price": 0.15,
                            "unrealized_pnl": 250.0,
                            "leverage": 3.0
                        },
                        {
                            "asset": "ETH",
                            "size": 0.75,
                            "entry_price": 3200.0,
                            "liquidation_price": 2950.0,
                            "unrealized_pnl": 45.0,
                            "leverage": 2.0
                        }
                    ]
                }
            
            # Actual API call would go here
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/positions"
                headers = self._get_auth_headers("GET", "/api/v1/positions", None)
                
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting positions: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    positions = []
                    
                    # Parse positions from the response
                    for position in data:
                        positions.append({
                            "asset": position.get("symbol", ""),
                            "size": float(position.get("positionAmt", 0)),
                            "entry_price": float(position.get("entryPrice", 0)),
                            "liquidation_price": float(position.get("liquidationPrice", 0)),
                            "unrealized_pnl": float(position.get("unrealizedProfit", 0)),
                            "leverage": float(position.get("leverage", 0))
                        })
                    
                    return {
                        "success": True,
                        "positions": positions,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_positions: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "positions": [
                        {
                            "asset": "SONIC",
                            "size": 5000.0,
                            "entry_price": 0.22,
                            "liquidation_price": 0.15,
                            "unrealized_pnl": 250.0,
                            "leverage": 3.0
                        },
                        {
                            "asset": "ETH",
                            "size": 0.75,
                            "entry_price": 3200.0,
                            "liquidation_price": 2950.0,
                            "unrealized_pnl": 45.0,
                            "leverage": 2.0
                        }
                    ],
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def create_order(self, 
                          symbol: str, 
                          side: str, 
                          size: float, 
                          price: float = 0, 
                          reduce_only: bool = False,
                          order_type: str = "MARKET",
                          time_in_force: str = "GTC") -> Dict[str, Any]:
        """
        Create an order on Sonic.
        
        Args:
            symbol: Asset symbol (e.g., "SONIC-USDC")
            side: "BUY" or "SELL"
            size: Order size
            price: Limit price (0 for market orders)
            reduce_only: Whether the order should be reduce-only
            order_type: Order type (MARKET, LIMIT, etc.)
            time_in_force: Time in force (GTC, IOC, etc.)
        
        Returns:
            Dict containing order result
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for create_order")
                # Simulate a successful order with a timestamp-based ID
                order_id = f"sonic_sim_{int(time.time())}_{symbol}"
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "FILLED" if order_type == "MARKET" else "NEW",
                    "details": {
                        "symbol": symbol,
                        "side": side,
                        "size": size,
                        "price": price if price > 0 else "market price",
                        "reduce_only": reduce_only,
                        "order_type": order_type,
                        "time_in_force": time_in_force,
                        "timestamp": int(time.time())
                    }
                }
            
            # Validate parameters
            if not symbol:
                return {"error": "Symbol is required"}
            if not side or side not in ["BUY", "SELL"]:
                return {"error": "Side must be BUY or SELL"}
            if size <= 0:
                return {"error": "Order size must be positive"}
            
            # Prepare order data
            order_data = {
                "symbol": symbol,
                "side": side,
                "type": order_type,
                "quantity": str(size),
                "timeInForce": time_in_force,
                "reduceOnly": "true" if reduce_only else "false"
            }
            
            if price > 0 and order_type != "MARKET":
                order_data["price"] = str(price)
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/order"
                headers = self._get_auth_headers("POST", "/api/v1/order", order_data)
                
                async with session.post(url, json=order_data, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error creating order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "order_id": data.get("orderId", ""),
                        "status": data.get("status", ""),
                        "raw_response": data
                    }
            
        except Exception as e:
            logger.error(f"Error in create_order: {e}")
            if self.simulation_mode:
                # Simulate a successful order even on error
                order_id = f"sonic_sim_error_{int(time.time())}_{symbol}"
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "FILLED" if order_type == "MARKET" else "NEW",
                    "details": {
                        "symbol": symbol,
                        "side": side,
                        "size": size,
                        "price": price if price > 0 else "market price",
                        "reduce_only": reduce_only,
                        "order_type": order_type,
                        "time_in_force": time_in_force,
                        "timestamp": int(time.time())
                    },
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def cancel_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """
        Cancel an open order.
        
        Args:
            symbol: Asset symbol
            order_id: ID of the order to cancel
        
        Returns:
            Dict containing cancellation result
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for cancel_order")
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "CANCELED",
                    "details": {
                        "symbol": symbol,
                        "timestamp": int(time.time())
                    }
                }
            
            # Prepare cancel data
            cancel_data = {
                "symbol": symbol,
                "orderId": order_id
            }
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/order"
                headers = self._get_auth_headers("DELETE", "/api/v1/order", cancel_data)
                
                async with session.delete(url, params=cancel_data, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error cancelling order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "order_id": data.get("orderId", ""),
                        "status": data.get("status", ""),
                        "raw_response": data
                    }
            
        except Exception as e:
            logger.error(f"Error in cancel_order: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "CANCELED",
                    "details": {
                        "symbol": symbol,
                        "timestamp": int(time.time())
                    },
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_market_data(self, symbol: str) -> Dict[str, Any]:
        """
        Get market data for a specific asset.
        
        Args:
            symbol: Asset symbol
        
        Returns:
            Dict containing market data
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info(f"Using simulation mode for get_market_data: {symbol}")
                
                # Simulated market data based on the symbol
                simulated_prices = {
                    "SONIC-USDC": 0.24,
                    "ETH-USDC": 3255.42,
                    "BTC-USDC": 68700.0,
                    "SOL-USDC": 152.85
                }
                
                price = simulated_prices.get(symbol, 1.0)
                
                return {
                    "success": True,
                    "simulation": True,
                    "symbol": symbol,
                    "price": price,
                    "bid": price * 0.9995,
                    "ask": price * 1.0005,
                    "funding_rate": 0.0001,
                    "open_interest": 8500000,
                    "volume_24h": 22000000,
                    "price_change_24h": 3.8,
                    "high_24h": price * 1.05,
                    "low_24h": price * 0.98
                }
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/ticker/24hr"
                params = {
                    "symbol": symbol
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting market data: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    # Get funding rate (separate API call)
                    funding_rate = 0.0001  # Default
                    try:
                        url_funding = f"{self.api_url}/api/v1/premiumIndex"
                        params_funding = {
                            "symbol": symbol
                        }
                        
                        async with session.get(url_funding, params=params_funding) as response_funding:
                            if response_funding.status == 200:
                                data_funding = await response_funding.json()
                                funding_rate = float(data_funding.get("lastFundingRate", 0.0001))
                    except Exception as e:
                        logger.warning(f"Could not get funding rate: {e}")
                    
                    return {
                        "success": True,
                        "symbol": symbol,
                        "price": float(data.get("lastPrice", 0)),
                        "bid": float(data.get("bidPrice", 0)),
                        "ask": float(data.get("askPrice", 0)),
                        "funding_rate": funding_rate,
                        "open_interest": float(data.get("openInterest", 0)),
                        "volume_24h": float(data.get("volume", 0)),
                        "price_change_24h": float(data.get("priceChangePercent", 0)),
                        "high_24h": float(data.get("highPrice", 0)),
                        "low_24h": float(data.get("lowPrice", 0)),
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_market_data: {e}")
            if self.simulation_mode:
                # Simulated market data based on the symbol
                simulated_prices = {
                    "SONIC-USDC": 0.24,
                    "ETH-USDC": 3255.42,
                    "BTC-USDC": 68700.0,
                    "SOL-USDC": 152.85
                }
                
                price = simulated_prices.get(symbol, 1.0)
                
                return {
                    "success": True,
                    "simulation": True,
                    "symbol": symbol,
                    "price": price,
                    "bid": price * 0.9995,
                    "ask": price * 1.0005,
                    "funding_rate": 0.0001,
                    "open_interest": 8500000,
                    "volume_24h": 22000000,
                    "price_change_24h": 3.8,
                    "high_24h": price * 1.05,
                    "low_24h": price * 0.98,
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_open_orders(self, symbol: str = None) -> Dict[str, Any]:
        """
        Get all open orders.
        
        Args:
            symbol: Optional symbol to filter orders
        
        Returns:
            Dict containing open orders
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for get_open_orders")
                return {
                    "success": True,
                    "simulation": True,
                    "orders": [
                        {
                            "id": f"sonic_sim_limit_{int(time.time() - 7200)}",
                            "symbol": "SONIC-USDC",
                            "side": "BUY",
                            "size": 2000.0,
                            "price": 0.20,
                            "type": "LIMIT",
                            "reduce_only": False,
                            "time_in_force": "GTC",
                            "status": "NEW",
                            "timestamp": int(time.time() - 7200)
                        }
                    ]
                }
            
            # Prepare request
            params = {}
            if symbol:
                params["symbol"] = symbol
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/api/v1/openOrders"
                headers = self._get_auth_headers("GET", "/api/v1/openOrders", params if params else None)
                
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting open orders: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    orders = []
                    
                    # Parse orders from the response
                    for order in data:
                        orders.append({
                            "id": order.get("orderId", ""),
                            "symbol": order.get("symbol", ""),
                            "side": order.get("side", ""),
                            "size": float(order.get("origQty", 0)),
                            "price": float(order.get("price", 0)),
                            "type": order.get("type", ""),
                            "reduce_only": order.get("reduceOnly", False),
                            "time_in_force": order.get("timeInForce", ""),
                            "status": order.get("status", ""),
                            "timestamp": int(order.get("time", 0))
                        })
                    
                    return {
                        "success": True,
                        "orders": orders,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_open_orders: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "orders": [
                        {
                            "id": f"sonic_sim_limit_{int(time.time() - 7200)}",
                            "symbol": "SONIC-USDC",
                            "side": "BUY",
                            "size": 2000.0,
                            "price": 0.20,
                            "type": "LIMIT",
                            "reduce_only": False,
                            "time_in_force": "GTC",
                            "status": "NEW",
                            "timestamp": int(time.time() - 7200)
                        }
                    ],
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    def _get_auth_headers(self, method: str, endpoint: str, data: Optional[Dict[str, Any]]) -> Dict[str, str]:
        """
        Get authentication headers for API requests.
        
        Args:
            method: HTTP method (GET, POST, DELETE)
            endpoint: API endpoint
            data: Request data (for POST) or query params (for GET)
            
        Returns:
            Dict containing authentication headers
        """
        timestamp = int(time.time() * 1000)
        
        if self.simulation_mode:
            return {
                "X-API-Key": "sim_api_key",
                "X-Timestamp": str(timestamp),
                "X-Signature": "sim_signature"
            }
        
        # Create signature payload
        payload = f"{timestamp}{method}{endpoint}"
        
        # Add sorted query parameters or body data to payload
        if data:
            # Convert to string and sort by key
            sorted_data = "&".join([f"{k}={v}" for k, v in sorted(data.items())])
            payload += sorted_data
        
        # Generate signature
        signature = hmac.new(
            bytes.fromhex(self.private_key.replace("0x", "")),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            "X-API-Key": self.wallet_address,
            "X-Timestamp": str(timestamp),
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
