import asyncio
import json
import time
import logging
import hmac
import hashlib
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
import aiohttp
import websockets
from datetime import datetime, timezone
import eth_account
from eth_account.messages import encode_defunct
from hexbytes import HexBytes

from .base import (
    ExchangeInterface, Order, OrderBook, Position, 
    OrderType, OrderSide, TimeInForce
)
from .hyperliquid import HyperliquidClient

logger = logging.getLogger(__name__)

# Arbitrum-specific Hyperliquid API endpoints
HYPERLIQUID_ARBITRUM_API_URL = "https://api.hyperliquid.xyz"
HYPERLIQUID_ARBITRUM_WS_URL = "wss://api.hyperliquid.xyz/ws"
HYPERLIQUID_ARBITRUM_EXCHANGE_ID = "arbitrum"

class HyperliquidArbitrumClient(HyperliquidClient):
    """Hyperliquid API integration specifically for Arbitrum network."""
    
    def __init__(
        self, 
        private_key: str,
        wallet_address: str,
        testnet: bool = False
    ):
        super().__init__(private_key, wallet_address, testnet)
        self.api_url = HYPERLIQUID_ARBITRUM_API_URL
        self.ws_url = HYPERLIQUID_ARBITRUM_WS_URL
        self.exchange_id = HYPERLIQUID_ARBITRUM_EXCHANGE_ID
        self.agent_connections = {}
        
    async def initialize(self) -> None:
        """Initialize the Hyperliquid Arbitrum connection."""
        self.session = aiohttp.ClientSession(
            headers={
                "Content-Type": "application/json"
            }
        )
        logger.info("Hyperliquid Arbitrum client initialized")

    async def _sign_message(self, message: Dict[str, Any]) -> str:
        """Sign a message with the Ethereum private key."""
        message_hash = encode_defunct(text=json.dumps(message))
        signed_message = eth_account.Account.sign_message(message_hash, private_key=self.private_key)
        return signed_message.signature.hex()

    async def _make_signed_request(
        self, 
        endpoint: str, 
        action: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make a signed request to the Hyperliquid Arbitrum API."""
        timestamp = int(time.time() * 1000)
        
        message = {
            "action": action,
            "timestamp": timestamp,
            "data": data
        }
        
        signature = await self._sign_message(message)
        
        payload = {
            "message": message,
            "signature": signature,
            "wallet": self.wallet_address
        }
        
        url = f"{self.api_url}{endpoint}"
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error in Hyperliquid Arbitrum API request: {error_text}")
                    response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Error making Hyperliquid Arbitrum API request: {e}")
            raise

    async def get_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions or filter by symbol."""
        endpoint = "/info/user/positions"
        
        response = await self._make_request(
            "GET", 
            endpoint, 
            {"wallet": self.wallet_address}, 
            auth=True
        )
        
        positions = []
        for pos in response.get("positions", []):
            if symbol and pos.get("symbol") != symbol:
                continue
                
            side = OrderSide.BUY if float(pos.get("positionSize", 0)) > 0 else OrderSide.SELL
            qty = abs(float(pos.get("positionSize", 0)))
            entry_price = float(pos.get("entryPrice", 0))
            leverage = float(pos.get("leverage", 1))
            unrealized_pnl = float(pos.get("unrealizedPnl", 0))
            realized_pnl = float(pos.get("realizedPnl", 0))
            liquidation_price = float(pos.get("liquidationPrice", 0))
            margin = float(pos.get("margin", 0))
            
            positions.append(Position(
                symbol=pos.get("symbol", ""),
                side=side,
                quantity=qty,
                entry_price=entry_price,
                leverage=leverage,
                unrealized_pnl=unrealized_pnl,
                realized_pnl=realized_pnl,
                liquidation_price=liquidation_price,
                margin=margin
            ))
        
        return positions

    async def get_funding_rates(self, symbols: Optional[List[str]] = None) -> Dict[str, float]:
        """Get current funding rates for all symbols or specified ones."""
        endpoint = "/info/funding"
        
        response = await self._make_request(
            "GET", 
            endpoint, 
            {}, 
            auth=False
        )
        
        funding_rates = {}
        for funding_info in response:
            symbol = funding_info.get("symbol")
            if symbols and symbol not in symbols:
                continue
                
            funding_rate = float(funding_info.get("fundingRate", 0))
            funding_rates[symbol] = funding_rate
        
        return funding_rates

    async def get_market_info(self) -> List[Dict[str, Any]]:
        """Get information about all available markets on Hyperliquid Arbitrum."""
        endpoint = "/info/markets"
        
        response = await self._make_request(
            "GET", 
            endpoint, 
            {}, 
            auth=False
        )
        
        return response

    async def place_conditional_order(
        self, 
        symbol: str, 
        side: OrderSide, 
        quantity: float, 
        trigger_price: float,
        order_price: Optional[float] = None,
        trigger_type: str = "MARK_PRICE", # or "LAST_PRICE", "INDEX_PRICE"
        reduce_only: bool = False,
        time_in_force: TimeInForce = TimeInForce.GTC,
        client_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Place a conditional order (trigger when price is reached)."""
        action = "order.conditional"
        
        data = {
            "symbol": symbol,
            "side": side.value,
            "size": str(quantity),
            "triggerPrice": str(trigger_price),
            "triggerType": trigger_type,
            "timeInForce": time_in_force.value,
            "reduceOnly": reduce_only
        }
        
        if order_price is not None:
            data["orderType"] = "LIMIT"
            data["price"] = str(order_price)
        else:
            data["orderType"] = "MARKET"
        
        if client_order_id:
            data["clientOrderId"] = client_order_id
        
        return await self._make_signed_request("/exchange/conditional", action, data)

    async def update_leverage(self, symbol: str, leverage: float) -> Dict[str, Any]:
        """Set leverage for a specific symbol."""
        action = "user.leverage"
        
        data = {
            "symbol": symbol,
            "leverage": str(leverage)
        }
        
        return await self._make_signed_request("/exchange/leverage", action, data)

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open orders or filter by symbol."""
        endpoint = "/info/user/orders"
        
        params = {"wallet": self.wallet_address}
        if symbol:
            params["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            endpoint, 
            params, 
            auth=True
        )
        
        return response.get("orders", [])
        
    async def connect_agent(self, agent_id: str, symbols: List[str]) -> bool:
        """Connect a trading agent to Hyperliquid Arbitrum for specific symbols."""
        if agent_id in self.agent_connections:
            logger.info(f"Agent {agent_id} already connected to Hyperliquid Arbitrum")
            return True
            
        try:
            # Initialize connection for this agent
            connection = {
                "symbols": symbols,
                "ws_connections": {},
                "callbacks": {},
                "last_heartbeat": time.time()
            }
            
            # Connect to websocket feeds for each symbol
            for symbol in symbols:
                # Market data connection
                market_ws = await websockets.connect(f"{self.ws_url}")
                subscriptions = [
                    {"type": "market", "symbol": symbol, "channel": "orderbook"},
                    {"type": "market", "symbol": symbol, "channel": "trades"}
                ]
                await market_ws.send(json.dumps({"op": "subscribe", "data": subscriptions}))
                
                # User data connection (orders, positions)
                user_ws = await websockets.connect(f"{self.ws_url}")
                user_subscriptions = [
                    {"type": "user", "wallet": self.wallet_address, "channel": "orders"},
                    {"type": "user", "wallet": self.wallet_address, "channel": "positions"}
                ]
                
                # Sign the subscription request
                user_message = {
                    "action": "subscribe",
                    "timestamp": int(time.time() * 1000),
                    "data": user_subscriptions
                }
                signature = await self._sign_message(user_message)
                
                await user_ws.send(json.dumps({
                    "op": "subscribe", 
                    "data": user_subscriptions,
                    "signature": signature,
                    "wallet": self.wallet_address
                }))
                
                connection["ws_connections"][symbol] = {
                    "market": market_ws,
                    "user": user_ws
                }
            
            # Start listening task for each connection
            for symbol, ws_conns in connection["ws_connections"].items():
                asyncio.create_task(self._listen_market_data(agent_id, symbol, ws_conns["market"]))
                asyncio.create_task(self._listen_user_data(agent_id, symbol, ws_conns["user"]))
            
            # Start heartbeat task
            asyncio.create_task(self._agent_heartbeat(agent_id))
            
            # Store the connection
            self.agent_connections[agent_id] = connection
            logger.info(f"Agent {agent_id} connected to Hyperliquid Arbitrum for symbols: {symbols}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error connecting agent {agent_id} to Hyperliquid Arbitrum: {e}")
            return False
    
    async def disconnect_agent(self, agent_id: str) -> bool:
        """Disconnect a trading agent from Hyperliquid Arbitrum."""
        if agent_id not in self.agent_connections:
            logger.warning(f"Agent {agent_id} not connected to Hyperliquid Arbitrum")
            return True
            
        try:
            connection = self.agent_connections[agent_id]
            
            # Close all websocket connections
            for symbol, ws_conns in connection["ws_connections"].items():
                for conn_type, ws in ws_conns.items():
                    try:
                        await ws.close()
                    except Exception as e:
                        logger.error(f"Error closing {conn_type} websocket for symbol {symbol}: {e}")
            
            # Remove the connection
            del self.agent_connections[agent_id]
            logger.info(f"Agent {agent_id} disconnected from Hyperliquid Arbitrum")
            
            return True
            
        except Exception as e:
            logger.error(f"Error disconnecting agent {agent_id} from Hyperliquid Arbitrum: {e}")
            return False
    
    async def _listen_market_data(self, agent_id: str, symbol: str, ws):
        """Listen for market data from Hyperliquid Arbitrum."""
        try:
            while True:
                message = await ws.recv()
                data = json.loads(message)
                
                if "channel" not in data:
                    continue
                    
                channel = data["channel"]
                
                if channel == "orderbook":
                    if "orderbook" in self.agent_connections[agent_id]["callbacks"]:
                        callback = self.agent_connections[agent_id]["callbacks"]["orderbook"]
                        await callback(agent_id, symbol, data)
                        
                elif channel == "trades":
                    if "trades" in self.agent_connections[agent_id]["callbacks"]:
                        callback = self.agent_connections[agent_id]["callbacks"]["trades"]
                        await callback(agent_id, symbol, data)
                
        except websockets.ConnectionClosed:
            logger.warning(f"Market data connection closed for agent {agent_id}, symbol {symbol}")
            
            # Try to reconnect
            try:
                new_ws = await websockets.connect(f"{self.ws_url}")
                subscriptions = [
                    {"type": "market", "symbol": symbol, "channel": "orderbook"},
                    {"type": "market", "symbol": symbol, "channel": "trades"}
                ]
                await new_ws.send(json.dumps({"op": "subscribe", "data": subscriptions}))
                
                if agent_id in self.agent_connections:
                    self.agent_connections[agent_id]["ws_connections"][symbol]["market"] = new_ws
                    
                # Restart listener
                asyncio.create_task(self._listen_market_data(agent_id, symbol, new_ws))
                
            except Exception as e:
                logger.error(f"Error reconnecting market data for agent {agent_id}, symbol {symbol}: {e}")
                
        except Exception as e:
            logger.error(f"Error in market data listener for agent {agent_id}, symbol {symbol}: {e}")
    
    async def _listen_user_data(self, agent_id: str, symbol: str, ws):
        """Listen for user data from Hyperliquid Arbitrum."""
        try:
            while True:
                message = await ws.recv()
                data = json.loads(message)
                
                if "channel" not in data:
                    continue
                    
                channel = data["channel"]
                
                if channel == "orders":
                    if "orders" in self.agent_connections[agent_id]["callbacks"]:
                        callback = self.agent_connections[agent_id]["callbacks"]["orders"]
                        await callback(agent_id, symbol, data)
                        
                elif channel == "positions":
                    if "positions" in self.agent_connections[agent_id]["callbacks"]:
                        callback = self.agent_connections[agent_id]["callbacks"]["positions"]
                        await callback(agent_id, symbol, data)
                
        except websockets.ConnectionClosed:
            logger.warning(f"User data connection closed for agent {agent_id}, symbol {symbol}")
            
            # Try to reconnect
            try:
                new_ws = await websockets.connect(f"{self.ws_url}")
                user_subscriptions = [
                    {"type": "user", "wallet": self.wallet_address, "channel": "orders"},
                    {"type": "user", "wallet": self.wallet_address, "channel": "positions"}
                ]
                
                # Sign the subscription request
                user_message = {
                    "action": "subscribe",
                    "timestamp": int(time.time() * 1000),
                    "data": user_subscriptions
                }
                signature = await self._sign_message(user_message)
                
                await new_ws.send(json.dumps({
                    "op": "subscribe", 
                    "data": user_subscriptions,
                    "signature": signature,
                    "wallet": self.wallet_address
                }))
                
                if agent_id in self.agent_connections:
                    self.agent_connections[agent_id]["ws_connections"][symbol]["user"] = new_ws
                    
                # Restart listener
                asyncio.create_task(self._listen_user_data(agent_id, symbol, new_ws))
                
            except Exception as e:
                logger.error(f"Error reconnecting user data for agent {agent_id}, symbol {symbol}: {e}")
                
        except Exception as e:
            logger.error(f"Error in user data listener for agent {agent_id}, symbol {symbol}: {e}")
    
    async def _agent_heartbeat(self, agent_id: str):
        """Maintain the agent connection with regular heartbeats."""
        try:
            while agent_id in self.agent_connections:
                # Send heartbeat to all websocket connections
                for symbol, ws_conns in self.agent_connections[agent_id]["ws_connections"].items():
                    for conn_type, ws in ws_conns.items():
                        try:
                            await ws.send(json.dumps({"op": "ping"}))
                        except Exception as e:
                            logger.error(f"Error sending heartbeat to {conn_type} websocket for agent {agent_id}, symbol {symbol}: {e}")
                
                # Update last heartbeat time
                if agent_id in self.agent_connections:
                    self.agent_connections[agent_id]["last_heartbeat"] = time.time()
                
                # Wait for next heartbeat
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
        except Exception as e:
            logger.error(f"Error in agent heartbeat task for agent {agent_id}: {e}")
    
    def register_callback(self, agent_id: str, channel: str, callback: Callable):
        """Register a callback function for a specific channel."""
        if agent_id not in self.agent_connections:
            logger.warning(f"Agent {agent_id} not connected to Hyperliquid Arbitrum")
            return False
            
        self.agent_connections[agent_id]["callbacks"][channel] = callback
        logger.info(f"Registered callback for agent {agent_id}, channel {channel}")
        
        return True
