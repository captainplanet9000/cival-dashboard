"""
Market Data Service for providing real-time and historical market data to agents
"""
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
import asyncio
import httpx
import json
import websockets
from loguru import logger

from ..utils.google_sdk_bridge import GoogleSDKBridge
from ..utils.a2a_protocol import A2AProtocol


class MarketDataService:
    """Service for accessing real-time and historical market data"""

    def __init__(self, google_bridge: GoogleSDKBridge, a2a_protocol: A2AProtocol):
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.base_url = "http://localhost:3000/api/agents/trading"
        self.ws_base_url = "ws://localhost:3000/api/market-data"
        self.subscriptions = {}
        self.websocket_tasks = {}

    async def get_historical_data(self, symbol: str, interval: str = "1h", limit: int = 100) -> List[Dict]:
        """Get historical market data for a symbol"""
        logger.info(f"Getting historical data for {symbol}, interval {interval}, limit {limit}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/market-data?symbol={symbol}&interval={interval}&limit={limit}",
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()

                logger.info(f"Retrieved {len(data.get('candles', []))} historical candles for {symbol}")
                return data.get('candles', [])

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting historical data: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Failed to get historical data: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error getting historical data: {str(e)}")
            raise Exception(f"Historical data request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error getting historical data: {str(e)}")
            raise

    async def subscribe_to_market_data(self, symbol: str, interval: str = "1m", callback: Callable = None) -> str:
        """Subscribe to real-time market data for a symbol"""
        subscription_id = f"{symbol}_{interval}_{datetime.now().timestamp()}"
        logger.info(f"Creating market data subscription: {subscription_id}")

        # Store the callback
        self.subscriptions[subscription_id] = {
            "symbol": symbol,
            "interval": interval,
            "callback": callback,
            "active": True,
            "last_data": None,
            "created_at": datetime.now()
        }
        
        # Start WebSocket connection in background
        task = asyncio.create_task(self._maintain_websocket_connection(subscription_id))
        self.websocket_tasks[subscription_id] = task

        # Register subscription in database
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/market-data/subscribe",
                    json={
                        "symbol": symbol,
                        "interval": interval,
                        "subscriptionId": subscription_id
                    },
                    timeout=10.0
                )
                response.raise_for_status()

                logger.info(f"Market data subscription registered: {response.json()}")
        except Exception as e:
            logger.error(f"Failed to register subscription: {str(e)}")
            # Continue anyway as WebSocket might work independently

        return subscription_id

    async def unsubscribe_from_market_data(self, subscription_id: str) -> bool:
        """Unsubscribe from real-time market data"""
        logger.info(f"Unsubscribing from market data: {subscription_id}")

        if subscription_id not in self.subscriptions:
            logger.warning(f"Subscription {subscription_id} not found")
            return False

        # Mark subscription as inactive
        self.subscriptions[subscription_id]["active"] = False

        # Cancel WebSocket task
        if subscription_id in self.websocket_tasks:
            self.websocket_tasks[subscription_id].cancel()
            del self.websocket_tasks[subscription_id]

        # Unregister subscription in database
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/market-data/unsubscribe",
                    json={"subscriptionId": subscription_id},
                    timeout=10.0
                )
                response.raise_for_status()
                logger.info(f"Market data subscription unregistered: {response.json()}")
        except Exception as e:
            logger.error(f"Failed to unregister subscription: {str(e)}")

        # Remove subscription after a delay to allow for any final messages
        asyncio.create_task(self._delayed_subscription_removal(subscription_id))

        return True

    async def _delayed_subscription_removal(self, subscription_id: str):
        """Remove subscription after a delay"""
        await asyncio.sleep(5)  # Allow time for final messages
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]
            logger.info(f"Removed subscription {subscription_id}")

    async def _maintain_websocket_connection(self, subscription_id: str):
        """Maintain WebSocket connection and process messages"""
        if subscription_id not in self.subscriptions:
            logger.error(f"Subscription {subscription_id} not found")
            return

        subscription = self.subscriptions[subscription_id]
        symbol = subscription["symbol"]
        interval = subscription["interval"]
        callback = subscription["callback"]

        retry_delay = 1.0
        max_retry_delay = 60.0

        while subscription["active"]:
            ws_url = f"{self.ws_base_url}/{symbol}?interval={interval}&subscriptionId={subscription_id}"
            logger.info(f"Connecting to WebSocket: {ws_url}")

            try:
                async with websockets.connect(ws_url) as websocket:
                    # Reset retry delay on successful connection
                    retry_delay = 1.0

                    logger.info(f"WebSocket connected for {subscription_id}")

                    # Process messages
                    while subscription["active"]:
                        try:
                            message = await websocket.recv()
                            data = json.loads(message)

                            # Store last received data
                            subscription["last_data"] = data

                            # Call callback if provided
                            if callback:
                                try:
                                    await callback(data)
                                except Exception as e:
                                    logger.error(f"Error in subscription callback: {str(e)}")

                            # Broadcast to A2A protocol
                            await self.a2a_protocol.broadcast_message(
                                message_type="market_data_update",
                                payload={
                                    "symbol": symbol,
                                    "interval": interval,
                                    "data": data,
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            )
                        except websockets.exceptions.ConnectionClosed:
                            logger.warning(f"WebSocket connection closed for {subscription_id}")
                            break
                        except json.JSONDecodeError as e:
                            logger.error(f"Error decoding message: {str(e)}")
                        except Exception as e:
                            logger.error(f"Error processing WebSocket message: {str(e)}")
            except Exception as e:
                logger.error(f"WebSocket connection error: {str(e)}")

            # Only retry if subscription is still active
            if subscription["active"]:
                logger.info(f"Retrying WebSocket connection in {retry_delay} seconds")
                await asyncio.sleep(retry_delay)

                # Exponential backoff with jitter
                retry_delay = min(max_retry_delay, retry_delay * 1.5)

        logger.info(f"WebSocket connection task ended for {subscription_id}")

    async def get_available_symbols(self) -> List[str]:
        """Get list of available trading symbols"""
        logger.info("Getting available trading symbols")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/market-data/symbols",
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                symbols = data.get('symbols', [])
                logger.info(f"Retrieved {len(symbols)} available symbols")
                return symbols

        except Exception as e:
            logger.error(f"Error getting available symbols: {str(e)}")
            raise

    async def get_market_summary(self, symbols: List[str] = None) -> Dict:
        """Get market summary for specified symbols or top markets"""
        logger.info(f"Getting market summary for: {symbols if symbols else 'top markets'}")

        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/market-data/summary"
                if symbols:
                    url += f"?symbols={','.join(symbols)}"

                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                logger.info(f"Retrieved market summary for {len(data.get('markets', []))} markets")
                return data

        except Exception as e:
            logger.error(f"Error getting market summary: {str(e)}")
            raise