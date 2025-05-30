"""
Hyperliquid adapter for ElizaOS MCP Server integration.
Handles communication with Hyperliquid exchange for trading operations.
"""
import os
import json
import logging
import asyncio
import hmac
import hashlib
import base64
import time
from typing import Dict, Any, List, Optional
import aiohttp
import websockets
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("hyperliquid_adapter")

class HyperliquidAdapter:
    """
    Adapter for interacting with Hyperliquid exchange.
    """
    
    def __init__(self):
        """Initialize the Hyperliquid adapter."""
        self.api_url = "https://api.hyperliquid.xyz"
        self.ws_url = "wss://api.hyperliquid.xyz/ws"
        self.private_key = os.getenv("HYPERLIQUID_PRIVATE_KEY", "")
        self.wallet_address = os.getenv("HYPERLIQUID_WALLET_ADDRESS", "")
        
        # Flag to indicate if we're in simulation mode (for development/testing)
        self.simulation_mode = True
        
        if not self.private_key or not self.wallet_address:
            logger.warning("Hyperliquid private key or wallet address not set, using simulation mode")
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
                    "balance": 10000.0,
                    "free_collateral": 8500.0,
                    "unrealized_pnl": 250.0,
                    "margin_used": 1500.0,
                    "wallet_address": self.wallet_address or "0xSimulatedAddress",
                }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/info"
                params = {
                    "type": "userState",
                    "user": self.wallet_address
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting account balance: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    return {
                        "success": True,
                        "balance": data.get("marginSummary", {}).get("accountValue", 0),
                        "free_collateral": data.get("marginSummary", {}).get("freeCollateral", 0),
                        "unrealized_pnl": data.get("marginSummary", {}).get("unrealizedPnl", 0),
                        "margin_used": data.get("marginSummary", {}).get("totalMarginUsed", 0),
                        "wallet_address": self.wallet_address,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_account_balance: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "balance": 10000.0,
                    "free_collateral": 8500.0,
                    "unrealized_pnl": 250.0,
                    "margin_used": 1500.0,
                    "wallet_address": self.wallet_address or "0xSimulatedAddress",
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
                            "asset": "ETH",
                            "size": 1.5,
                            "entry_price": 3200.0,
                            "liquidation_price": 2800.0,
                            "unrealized_pnl": 150.0,
                            "leverage": 5.0
                        },
                        {
                            "asset": "BTC",
                            "size": 0.25,
                            "entry_price": 68000.0,
                            "liquidation_price": 62000.0,
                            "unrealized_pnl": 100.0,
                            "leverage": 3.0
                        }
                    ]
                }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/info"
                params = {
                    "type": "userState",
                    "user": self.wallet_address
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting positions: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    positions = []
                    
                    # Parse positions from the response
                    for asset in data.get("assetPositions", []):
                        coin = asset.get("coin", "")
                        position = asset.get("position", {})
                        
                        if position:
                            positions.append({
                                "asset": coin,
                                "size": float(position.get("szi", 0)),
                                "entry_price": float(position.get("entryPx", 0)),
                                "liquidation_price": float(position.get("liquidationPx", 0)),
                                "unrealized_pnl": float(position.get("unrealizedPnl", 0)),
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
                            "asset": "ETH",
                            "size": 1.5,
                            "entry_price": 3200.0,
                            "liquidation_price": 2800.0,
                            "unrealized_pnl": 150.0,
                            "leverage": 5.0
                        },
                        {
                            "asset": "BTC",
                            "size": 0.25,
                            "entry_price": 68000.0,
                            "liquidation_price": 62000.0,
                            "unrealized_pnl": 100.0,
                            "leverage": 3.0
                        }
                    ],
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def create_order(self, 
                          coin: str, 
                          isBuy: bool, 
                          sz: float, 
                          limitPx: float = 0, 
                          reduceOnly: bool = False,
                          orderType: str = "Market",
                          timeInForce: str = "GTC") -> Dict[str, Any]:
        """
        Create an order on Hyperliquid.
        
        Args:
            coin: Asset symbol (e.g., "ETH")
            isBuy: True for buy/long, False for sell/short
            sz: Order size
            limitPx: Limit price (0 for market orders)
            reduceOnly: Whether the order should be reduce-only
            orderType: Order type (Market, Limit, etc.)
            timeInForce: Time in force (GTC, IOC, etc.)
        
        Returns:
            Dict containing order result
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for create_order")
                # Simulate a successful order with a timestamp-based ID
                order_id = f"sim_{int(time.time())}_{coin}"
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "filled" if orderType == "Market" else "open",
                    "details": {
                        "coin": coin,
                        "side": "buy" if isBuy else "sell",
                        "size": sz,
                        "price": limitPx if limitPx > 0 else "market price",
                        "reduce_only": reduceOnly,
                        "order_type": orderType,
                        "time_in_force": timeInForce,
                        "timestamp": int(time.time())
                    }
                }
            
            # Validate parameters
            if not coin:
                return {"error": "Coin symbol is required"}
            if sz <= 0:
                return {"error": "Order size must be positive"}
            
            # Prepare order data
            order_data = {
                "coin": coin,
                "isBuy": isBuy,
                "sz": str(sz),
                "limitPx": str(limitPx) if limitPx > 0 else "0",
                "reduceOnly": reduceOnly,
                "orderType": orderType,
                "timeInForce": timeInForce
            }
            
            # Create signed payload
            timestamp = int(time.time() * 1000)
            action = {
                "type": "order",
                "order": order_data
            }
            
            signature = self._sign_payload(action, timestamp)
            
            headers = {
                "Content-Type": "application/json"
            }
            
            payload = {
                "action": action,
                "signature": signature,
                "timestamp": timestamp,
                "address": self.wallet_address
            }
            
            logger.info(f"Creating order: {json.dumps(payload, indent=2)}")
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_url}/exchange", json=payload, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error creating order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "order_id": data.get("response", {}).get("id", ""),
                        "status": data.get("response", {}).get("status", ""),
                        "raw_response": data
                    }
            
        except Exception as e:
            logger.error(f"Error in create_order: {e}")
            if self.simulation_mode:
                # Simulate a successful order even on error
                order_id = f"sim_error_{int(time.time())}_{coin}"
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "filled" if orderType == "Market" else "open",
                    "details": {
                        "coin": coin,
                        "side": "buy" if isBuy else "sell",
                        "size": sz,
                        "price": limitPx if limitPx > 0 else "market price",
                        "reduce_only": reduceOnly,
                        "order_type": orderType,
                        "time_in_force": timeInForce,
                        "timestamp": int(time.time())
                    },
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def cancel_order(self, coin: str, order_id: str) -> Dict[str, Any]:
        """
        Cancel an open order.
        
        Args:
            coin: Asset symbol
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
                    "status": "cancelled",
                    "details": {
                        "coin": coin,
                        "timestamp": int(time.time())
                    }
                }
            
            # Prepare cancellation data
            action = {
                "type": "cancel",
                "coin": coin,
                "id": order_id
            }
            
            # Create signed payload
            timestamp = int(time.time() * 1000)
            signature = self._sign_payload(action, timestamp)
            
            headers = {
                "Content-Type": "application/json"
            }
            
            payload = {
                "action": action,
                "signature": signature,
                "timestamp": timestamp,
                "address": self.wallet_address
            }
            
            logger.info(f"Cancelling order: {json.dumps(payload, indent=2)}")
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_url}/exchange", json=payload, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error cancelling order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "status": data.get("response", {}).get("status", ""),
                        "raw_response": data
                    }
            
        except Exception as e:
            logger.error(f"Error in cancel_order: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "status": "cancelled",
                    "details": {
                        "coin": coin,
                        "timestamp": int(time.time())
                    },
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_market_data(self, coin: str) -> Dict[str, Any]:
        """
        Get market data for a specific asset.
        
        Args:
            coin: Asset symbol
        
        Returns:
            Dict containing market data
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info(f"Using simulation mode for get_market_data: {coin}")
                
                # Simulated market data based on the coin
                simulated_prices = {
                    "ETH": 3245.67,
                    "BTC": 68550.0,
                    "SOL": 152.75,
                    "ARB": 0.95
                }
                
                price = simulated_prices.get(coin, 100.0)
                
                return {
                    "success": True,
                    "simulation": True,
                    "coin": coin,
                    "price": price,
                    "index_price": price * 0.9995,
                    "funding_rate": 0.0001,
                    "open_interest": 10000000,
                    "volume_24h": 25000000,
                    "size_increment": 0.01,
                    "price_increment": 0.01,
                    "max_leverage": 20.0
                }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/info"
                params = {
                    "type": "metaAndAssetCtxs"
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting market data: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    # Find the specific asset
                    asset_data = None
                    for asset in data.get("universe", []):
                        if asset.get("name") == coin:
                            asset_data = asset
                            break
                    
                    if not asset_data:
                        return {"error": f"Asset {coin} not found"}
                    
                    # Get the asset market data
                    market_data = None
                    for ctx in data.get("assetCtxs", []):
                        if ctx.get("name") == coin:
                            market_data = ctx
                            break
                    
                    if not market_data:
                        return {"error": f"Market data for {coin} not found"}
                    
                    # Format and return the data
                    return {
                        "success": True,
                        "coin": coin,
                        "price": float(market_data.get("markPx", 0)),
                        "index_price": float(market_data.get("indexPx", 0)),
                        "funding_rate": float(market_data.get("funding", {}).get("fundingRate", 0)),
                        "open_interest": float(market_data.get("openInterest", 0)),
                        "volume_24h": float(market_data.get("dayNtlVlm", 0)),
                        "size_increment": float(asset_data.get("szDecimals", 0)),
                        "price_increment": float(asset_data.get("pxDecimals", 0)),
                        "max_leverage": float(asset_data.get("maxLeverage", 0)),
                        "raw_data": {
                            "asset": asset_data,
                            "market": market_data
                        }
                    }
            
        except Exception as e:
            logger.error(f"Error in get_market_data: {e}")
            if self.simulation_mode:
                # Simulated market data based on the coin
                simulated_prices = {
                    "ETH": 3245.67,
                    "BTC": 68550.0,
                    "SOL": 152.75,
                    "ARB": 0.95
                }
                
                price = simulated_prices.get(coin, 100.0)
                
                return {
                    "success": True,
                    "simulation": True,
                    "coin": coin,
                    "price": price,
                    "index_price": price * 0.9995,
                    "funding_rate": 0.0001,
                    "open_interest": 10000000,
                    "volume_24h": 25000000,
                    "size_increment": 0.01,
                    "price_increment": 0.01,
                    "max_leverage": 20.0,
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_open_orders(self) -> Dict[str, Any]:
        """
        Get all open orders.
        
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
                            "id": f"sim_limit_{int(time.time() - 3600)}",
                            "coin": "ETH",
                            "side": "buy",
                            "size": 0.5,
                            "price": 3100.0,
                            "type": "Limit",
                            "reduce_only": False,
                            "time_in_force": "GTC",
                            "status": "open",
                            "timestamp": int(time.time() - 3600)
                        }
                    ]
                }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/info"
                params = {
                    "type": "openOrders",
                    "user": self.wallet_address
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting open orders: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    orders = []
                    
                    # Parse orders from the response
                    for order in data:
                        orders.append({
                            "id": order.get("oid", ""),
                            "coin": order.get("coin", ""),
                            "side": "buy" if order.get("side", "") == "B" else "sell",
                            "size": float(order.get("sz", 0)),
                            "price": float(order.get("limitPx", 0)),
                            "type": order.get("orderType", ""),
                            "reduce_only": order.get("reduceOnly", False),
                            "time_in_force": order.get("timeInForce", ""),
                            "status": order.get("status", ""),
                            "timestamp": order.get("timestamp", 0)
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
                            "id": f"sim_limit_{int(time.time() - 3600)}",
                            "coin": "ETH",
                            "side": "buy",
                            "size": 0.5,
                            "price": 3100.0,
                            "type": "Limit",
                            "reduce_only": False,
                            "time_in_force": "GTC",
                            "status": "open",
                            "timestamp": int(time.time() - 3600)
                        }
                    ],
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    def _sign_payload(self, action: Dict[str, Any], timestamp: int) -> str:
        """
        Sign a payload for authenticated requests.
        
        Args:
            action: Action payload
            timestamp: Current timestamp
        
        Returns:
            Base64-encoded signature
        """
        try:
            # Convert private key from hex to bytes
            private_key_bytes = bytes.fromhex(self.private_key.replace("0x", ""))
            
            # Create message to sign
            message = {
                "action": action,
                "timestamp": timestamp
            }
            
            message_bytes = json.dumps(message).encode()
            
            # Sign using HMAC-SHA256
            signature = hmac.new(private_key_bytes, message_bytes, hashlib.sha256).digest()
            
            # Encode to base64
            return base64.b64encode(signature).decode()
            
        except Exception as e:
            logger.error(f"Error signing payload: {e}")
            # In simulation mode, return a dummy signature
            if self.simulation_mode:
                return base64.b64encode(f"simulation_signature_{timestamp}".encode()).decode()
            raise
