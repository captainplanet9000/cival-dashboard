"""
Sui adapter for ElizaOS MCP Server integration.
Handles communication with Sui network for trading operations.
"""
import os
import json
import logging
import asyncio
import time
import base64
import hmac
import hashlib
from typing import Dict, Any, List, Optional
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("sui_adapter")

class SuiAdapter:
    """
    Adapter for interacting with Sui network.
    """
    
    def __init__(self):
        """Initialize the Sui adapter."""
        self.api_url = "https://api.sui.io"
        self.private_key = os.getenv("SUI_PRIVATE_KEY", "")
        self.wallet_address = os.getenv("SUI_WALLET_ADDRESS", "")
        
        # Flag to indicate if we're in simulation mode (for development/testing)
        self.simulation_mode = True
        
        if not self.private_key or not self.wallet_address:
            logger.warning("Sui private key or wallet address not set, using simulation mode")
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
                    "balance": {
                        "SUI": 1000.0,
                        "USDC": 5000.0,
                        "USDT": 2500.0
                    },
                    "wallet_address": self.wallet_address or "SimulatedSuiAddress",
                }
            
            # Actual API call would go here
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/account/{self.wallet_address}/balances"
                headers = self._get_auth_headers()
                
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting account balance: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    return {
                        "success": True,
                        "balance": data.get("balance", {}),
                        "wallet_address": self.wallet_address,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_account_balance: {e}")
            if self.simulation_mode:
                return {
                    "success": True,
                    "simulation": True,
                    "balance": {
                        "SUI": 1000.0,
                        "USDC": 5000.0,
                        "USDT": 2500.0
                    },
                    "wallet_address": self.wallet_address or "SimulatedSuiAddress",
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
                            "asset": "SUI",
                            "size": 25.0,
                            "entry_price": 2.35,
                            "liquidation_price": 1.90,
                            "unrealized_pnl": 15.0,
                            "leverage": 2.0
                        },
                        {
                            "asset": "BTC-PERP",
                            "size": 0.5,
                            "entry_price": 69000.0,
                            "liquidation_price": 63000.0,
                            "unrealized_pnl": 500.0,
                            "leverage": 5.0
                        }
                    ]
                }
            
            # Actual API call would go here
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/positions"
                headers = self._get_auth_headers()
                
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
                            "size": float(position.get("size", 0)),
                            "entry_price": float(position.get("entryPrice", 0)),
                            "liquidation_price": float(position.get("liquidationPrice", 0)),
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
                            "asset": "SUI",
                            "size": 25.0,
                            "entry_price": 2.35,
                            "liquidation_price": 1.90,
                            "unrealized_pnl": 15.0,
                            "leverage": 2.0
                        },
                        {
                            "asset": "BTC-PERP",
                            "size": 0.5,
                            "entry_price": 69000.0,
                            "liquidation_price": 63000.0,
                            "unrealized_pnl": 500.0,
                            "leverage": 5.0
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
        Create an order on Sui network.
        
        Args:
            symbol: Asset symbol (e.g., "SUI-USDC")
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
                # Simulate a successful order with a timestamp and signature
                timestamp = int(time.time())
                order_id = f"sui_sim_{timestamp}_{symbol}"
                digest = f"sui_digest_{base64.b64encode(f'{timestamp}'.encode()).decode()[:12]}"
                
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "digest": digest,
                    "status": "FILLED" if order_type == "MARKET" else "NEW",
                    "details": {
                        "symbol": symbol,
                        "side": side,
                        "size": size,
                        "price": price if price > 0 else "market price",
                        "reduce_only": reduce_only,
                        "order_type": order_type,
                        "time_in_force": time_in_force,
                        "timestamp": timestamp
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
                "market": symbol,
                "side": side.lower(),
                "size": str(size),
                "type": order_type,
                "timeInForce": time_in_force,
                "reduceOnly": reduce_only
            }
            
            if price > 0 and order_type != "MARKET":
                order_data["price"] = str(price)
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/orders"
                headers = self._get_auth_headers()
                
                async with session.post(url, json=order_data, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error creating order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "order_id": data.get("id", ""),
                        "digest": data.get("digest", ""),
                        "status": data.get("status", ""),
                        "raw_response": data
                    }
            
        except Exception as e:
            logger.error(f"Error in create_order: {e}")
            if self.simulation_mode:
                # Simulate a successful order even on error
                timestamp = int(time.time())
                order_id = f"sui_sim_error_{timestamp}_{symbol}"
                digest = f"sui_digest_{base64.b64encode(f'{timestamp}'.encode()).decode()[:12]}"
                
                return {
                    "success": True,
                    "simulation": True,
                    "order_id": order_id,
                    "digest": digest,
                    "status": "FILLED" if order_type == "MARKET" else "NEW",
                    "details": {
                        "symbol": symbol,
                        "side": side,
                        "size": size,
                        "price": price if price > 0 else "market price",
                        "reduce_only": reduce_only,
                        "order_type": order_type,
                        "time_in_force": time_in_force,
                        "timestamp": timestamp
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
                    "digest": f"cancel_digest_{base64.b64encode(f'{int(time.time())}'.encode()).decode()[:12]}",
                    "details": {
                        "symbol": symbol,
                        "timestamp": int(time.time())
                    }
                }
            
            # Prepare cancel data
            cancel_data = {
                "market": symbol,
                "orderId": order_id
            }
            
            # Send request to API
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/orders/{order_id}"
                headers = self._get_auth_headers()
                
                async with session.delete(url, json=cancel_data, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error cancelling order: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "order_id": order_id,
                        "status": data.get("status", "CANCELED"),
                        "digest": data.get("digest", ""),
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
                    "digest": f"cancel_digest_{base64.b64encode(f'{int(time.time())}'.encode()).decode()[:12]}",
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
                logger.info("Using simulation mode for get_market_data")
                timestamp = int(time.time())
                
                # Generate synthetic market data based on the symbol
                if "BTC" in symbol:
                    price = 69000.0 + (timestamp % 1000 - 500) / 10
                    volume = 10000.0 + (timestamp % 5000)
                elif "ETH" in symbol:
                    price = 3500.0 + (timestamp % 100 - 50) / 10
                    volume = 20000.0 + (timestamp % 8000)
                elif "SUI" in symbol:
                    price = 2.35 + (timestamp % 20 - 10) / 100
                    volume = 5000000.0 + (timestamp % 1000000)
                else:
                    price = 10.0 + (timestamp % 10)
                    volume = 100000.0 + (timestamp % 50000)
                
                return {
                    "success": True,
                    "simulation": True,
                    "market_data": {
                        "symbol": symbol,
                        "price": price,
                        "change_24h": (timestamp % 20 - 10) / 10,  # -1.0 to +1.0
                        "high_24h": price * 1.05,
                        "low_24h": price * 0.95,
                        "volume_24h": volume,
                        "bid": price - 0.01 * price,
                        "ask": price + 0.01 * price,
                        "timestamp": timestamp
                    }
                }
            
            # Actual API call to get market data
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/markets/{symbol}"
                
                async with session.get(url) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting market data: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    
                    # Extract market data from response
                    market_data = {
                        "symbol": symbol,
                        "price": float(data.get("price", 0)),
                        "change_24h": float(data.get("change24h", 0)),
                        "high_24h": float(data.get("high24h", 0)),
                        "low_24h": float(data.get("low24h", 0)),
                        "volume_24h": float(data.get("volume24h", 0)),
                        "bid": float(data.get("bid", 0)),
                        "ask": float(data.get("ask", 0)),
                        "timestamp": int(time.time())
                    }
                    
                    return {
                        "success": True,
                        "market_data": market_data,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_market_data: {e}")
            if self.simulation_mode:
                timestamp = int(time.time())
                
                # Generate synthetic market data based on the symbol
                if "BTC" in symbol:
                    price = 69000.0 + (timestamp % 1000 - 500) / 10
                    volume = 10000.0 + (timestamp % 5000)
                elif "ETH" in symbol:
                    price = 3500.0 + (timestamp % 100 - 50) / 10
                    volume = 20000.0 + (timestamp % 8000)
                elif "SUI" in symbol:
                    price = 2.35 + (timestamp % 20 - 10) / 100
                    volume = 5000000.0 + (timestamp % 1000000)
                else:
                    price = 10.0 + (timestamp % 10)
                    volume = 100000.0 + (timestamp % 50000)
                
                return {
                    "success": True,
                    "simulation": True,
                    "market_data": {
                        "symbol": symbol,
                        "price": price,
                        "change_24h": (timestamp % 20 - 10) / 10,  # -1.0 to +1.0
                        "high_24h": price * 1.05,
                        "low_24h": price * 0.95,
                        "volume_24h": volume,
                        "bid": price - 0.01 * price,
                        "ask": price + 0.01 * price,
                        "timestamp": timestamp
                    },
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
                timestamp = int(time.time())
                
                # Create some simulated open orders
                orders = []
                
                # Only add orders for the requested symbol, or add multiple if no symbol specified
                symbols = [symbol] if symbol else ["SUI-USDC", "BTC-USDT", "ETH-USDC"]
                
                for i, sym in enumerate(symbols):
                    if symbol and sym != symbol:
                        continue
                        
                    # Create a couple of orders per symbol
                    side = "BUY" if i % 2 == 0 else "SELL"
                    price = 100.0 + i * 10
                    
                    if "BTC" in sym:
                        price = 69000.0 + i * 100
                    elif "ETH" in sym:
                        price = 3500.0 + i * 50
                    elif "SUI" in sym:
                        price = 2.35 + i * 0.01
                    
                    orders.append({
                        "id": f"sui_order_{timestamp - i * 100}",
                        "symbol": sym,
                        "side": side,
                        "price": price,
                        "size": 1.0 + i * 0.5,
                        "filled_size": 0.0,
                        "status": "NEW",
                        "type": "LIMIT",
                        "reduce_only": False,
                        "time_in_force": "GTC",
                        "created_at": timestamp - i * 100
                    })
                
                return {
                    "success": True,
                    "simulation": True,
                    "orders": orders
                }
            
            # Actual API call
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/orders"
                params = {}
                
                if symbol:
                    params["market"] = symbol
                    
                headers = self._get_auth_headers()
                
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting open orders: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    orders = []
                    
                    # Parse orders from response
                    for order in data:
                        orders.append({
                            "id": order.get("id", ""),
                            "symbol": order.get("market", ""),
                            "side": order.get("side", "").upper(),
                            "price": float(order.get("price", 0)),
                            "size": float(order.get("size", 0)),
                            "filled_size": float(order.get("filledSize", 0)),
                            "status": order.get("status", ""),
                            "type": order.get("type", ""),
                            "reduce_only": order.get("reduceOnly", False),
                            "time_in_force": order.get("timeInForce", ""),
                            "created_at": order.get("createdAt", 0)
                        })
                    
                    return {
                        "success": True,
                        "orders": orders,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_open_orders: {e}")
            if self.simulation_mode:
                timestamp = int(time.time())
                
                # Create some simulated open orders
                orders = []
                
                # Only add orders for the requested symbol, or add multiple if no symbol specified
                symbols = [symbol] if symbol else ["SUI-USDC", "BTC-USDT", "ETH-USDC"]
                
                for i, sym in enumerate(symbols):
                    if symbol and sym != symbol:
                        continue
                        
                    # Create a couple of orders per symbol
                    side = "BUY" if i % 2 == 0 else "SELL"
                    price = 100.0 + i * 10
                    
                    if "BTC" in sym:
                        price = 69000.0 + i * 100
                    elif "ETH" in sym:
                        price = 3500.0 + i * 50
                    elif "SUI" in sym:
                        price = 2.35 + i * 0.01
                    
                    orders.append({
                        "id": f"sui_order_{timestamp - i * 100}",
                        "symbol": sym,
                        "side": side,
                        "price": price,
                        "size": 1.0 + i * 0.5,
                        "filled_size": 0.0,
                        "status": "NEW",
                        "type": "LIMIT",
                        "reduce_only": False,
                        "time_in_force": "GTC",
                        "created_at": timestamp - i * 100
                    })
                
                return {
                    "success": True,
                    "simulation": True,
                    "orders": orders,
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    async def get_transaction_history(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get transaction history.
        
        Args:
            limit: Maximum number of transactions to return
            
        Returns:
            Dict containing transaction history
        """
        try:
            # If in simulation mode, return simulated data
            if self.simulation_mode:
                logger.info("Using simulation mode for get_transaction_history")
                timestamp = int(time.time())
                
                # Create some simulated transactions
                transactions = []
                
                for i in range(limit):
                    # Alternate between different transaction types
                    tx_type = ["DEPOSIT", "WITHDRAWAL", "TRADE"][i % 3]
                    asset = ["SUI", "USDC", "BTC", "ETH"][i % 4]
                    
                    amount = 10.0 + i * 5.0
                    if asset == "BTC":
                        amount = 0.1 + i * 0.05
                    elif asset == "ETH":
                        amount = 1.0 + i * 0.2
                        
                    fee = amount * 0.001
                    
                    transactions.append({
                        "id": f"sui_tx_{timestamp - i * 3600}",
                        "type": tx_type,
                        "asset": asset,
                        "amount": amount,
                        "fee": fee,
                        "status": "COMPLETED",
                        "timestamp": timestamp - i * 3600,
                        "digest": f"sui_digest_{base64.b64encode(f'{timestamp - i * 3600}'.encode()).decode()[:12]}"
                    })
                
                return {
                    "success": True,
                    "simulation": True,
                    "transactions": transactions
                }
            
            # Actual API call
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_url}/v1/history"
                headers = self._get_auth_headers()
                params = {"limit": limit}
                
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"Error getting transaction history: {text}")
                        return {"error": f"API error: {response.status}", "details": text}
                    
                    data = await response.json()
                    transactions = []
                    
                    # Parse transactions from response
                    for tx in data:
                        transactions.append({
                            "id": tx.get("id", ""),
                            "type": tx.get("type", ""),
                            "asset": tx.get("asset", ""),
                            "amount": float(tx.get("amount", 0)),
                            "fee": float(tx.get("fee", 0)),
                            "status": tx.get("status", ""),
                            "timestamp": tx.get("timestamp", 0),
                            "digest": tx.get("digest", "")
                        })
                    
                    return {
                        "success": True,
                        "transactions": transactions,
                        "raw_data": data
                    }
            
        except Exception as e:
            logger.error(f"Error in get_transaction_history: {e}")
            if self.simulation_mode:
                timestamp = int(time.time())
                
                # Create some simulated transactions
                transactions = []
                
                for i in range(limit):
                    # Alternate between different transaction types
                    tx_type = ["DEPOSIT", "WITHDRAWAL", "TRADE"][i % 3]
                    asset = ["SUI", "USDC", "BTC", "ETH"][i % 4]
                    
                    amount = 10.0 + i * 5.0
                    if asset == "BTC":
                        amount = 0.1 + i * 0.05
                    elif asset == "ETH":
                        amount = 1.0 + i * 0.2
                        
                    fee = amount * 0.001
                    
                    transactions.append({
                        "id": f"sui_tx_{timestamp - i * 3600}",
                        "type": tx_type,
                        "asset": asset,
                        "amount": amount,
                        "fee": fee,
                        "status": "COMPLETED",
                        "timestamp": timestamp - i * 3600,
                        "digest": f"sui_digest_{base64.b64encode(f'{timestamp - i * 3600}'.encode()).decode()[:12]}"
                    })
                
                return {
                    "success": True,
                    "simulation": True,
                    "transactions": transactions,
                    "error_message": str(e)
                }
            return {"error": str(e)}
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """
        Get authentication headers for API requests.
            
        Returns:
            Dict containing authentication headers
        """
        if not self.private_key:
            return {}
            
        # In a real implementation, this would create proper authentication headers
        # based on the Sui chain's requirements
        timestamp = str(int(time.time() * 1000))
        message = timestamp
        
        # Create a signature using HMAC-SHA256
        signature = hmac.new(
            self.private_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            "SUI-API-KEY": self.wallet_address,
            "SUI-API-TIMESTAMP": timestamp,
            "SUI-API-SIGNATURE": signature
        }
