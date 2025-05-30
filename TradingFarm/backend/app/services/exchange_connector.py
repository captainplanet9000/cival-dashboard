import logging
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Union
import ccxt
import ccxt.async_support as ccxtasync

from app.models.trading import (
    Order, 
    OrderSide, 
    OrderType, 
    OrderStatus, 
    MarketData, 
    ExchangeCredentials, 
    WalletBalance
)
from app.db import get_db_connection

logger = logging.getLogger(__name__)


class ExchangeConnector:
    """
    Unified connector for interacting with multiple cryptocurrency exchanges
    using the CCXT library. Handles order placement, fetching market data,
    and account information.
    """
    
    def __init__(self):
        self.exchanges: Dict[str, Dict[str, Any]] = {}
        self.market_cache: Dict[str, Dict[str, MarketData]] = {}
        # Controls how long market data is considered fresh (seconds)
        self.market_data_ttl = 10  
    
    async def connect(self, credentials: ExchangeCredentials) -> bool:
        """
        Connect to an exchange using the provided API credentials
        and verify the connection is successful.
        
        Args:
            credentials: Encrypted API credentials
            
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Create a CCXT instance for the specified exchange
            exchange_id = credentials.exchange.lower()
            
            # Get exchange class from ccxt
            if not hasattr(ccxtasync, exchange_id):
                logger.error(f"Unsupported exchange: {exchange_id}")
                return False
            
            exchange_class = getattr(ccxtasync, exchange_id)
            
            # TODO: Decrypt credentials before passing to exchange
            # In a real implementation, we would decrypt the API key and secret
            # For now, assume they are passed in plaintext for development
            
            exchange = exchange_class({
                'apiKey': credentials.api_key_encrypted,  # These should be decrypted
                'secret': credentials.api_secret_encrypted,  # These should be decrypted
                'password': credentials.passphrase,
                'timeout': 30000,
                'enableRateLimit': True,
            })
            
            # Store exchange instance with user_id as part of the key
            key = f"{credentials.user_id}:{credentials.exchange}"
            self.exchanges[key] = {
                'instance': exchange,
                'credentials': credentials,
                'connected_at': datetime.now()
            }
            
            # Test connection by making a simple API call
            await exchange.load_markets()
            
            # Mark credentials as successfully used
            async with get_db_connection() as conn:
                await conn.execute(
                    """
                    UPDATE exchange_credentials 
                    SET last_used = NOW(), is_active = true 
                    WHERE id = $1
                    """,
                    credentials.id
                )
            
            logger.info(f"Successfully connected to {exchange_id} for user {credentials.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to {credentials.exchange}: {str(e)}")
            
            # Mark credentials as failed
            if hasattr(credentials, 'id') and credentials.id:
                async with get_db_connection() as conn:
                    await conn.execute(
                        """
                        UPDATE exchange_credentials 
                        SET last_failed = NOW() 
                        WHERE id = $1
                        """,
                        credentials.id
                    )
            
            return False
    
    async def disconnect(self, user_id: str, exchange: str) -> bool:
        """Close connection to an exchange"""
        key = f"{user_id}:{exchange}"
        if key in self.exchanges:
            try:
                await self.exchanges[key]['instance'].close()
                del self.exchanges[key]
                return True
            except Exception as e:
                logger.error(f"Error disconnecting from {exchange}: {str(e)}")
                return False
        return False
    
    def _get_exchange(self, user_id: str, exchange: str):
        """Get exchange instance for user"""
        key = f"{user_id}:{exchange}"
        if key not in self.exchanges:
            raise ValueError(f"Not connected to {exchange}. Call connect() first.")
        return self.exchanges[key]['instance']
    
    async def place_order(self, order: Order) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Place an order on the exchange
        
        Args:
            order: Order details
            
        Returns:
            Tuple of (success, transaction_id, error_message)
        """
        try:
            exchange = self._get_exchange(order.user_id, order.exchange)
            
            # Map our order model to CCXT parameters
            symbol = order.symbol
            side = order.side.value
            order_type = order.type.value
            amount = float(order.quantity)
            price = float(order.price) if order.price is not None else None
            
            params = {}
            
            # Place the order using ccxt
            if order_type == 'market':
                result = await exchange.create_market_order(symbol, side, amount, params=params)
            elif order_type in ['limit', 'stop', 'stop_limit']:
                if price is None:
                    return False, None, "Price is required for limit orders"
                result = await exchange.create_limit_order(symbol, side, amount, price, params=params)
            else:
                return False, None, f"Unsupported order type: {order_type}"
            
            # Extract transaction ID from response
            tx_id = result.get('id')
            
            # Update order status in database
            async with get_db_connection() as conn:
                await conn.execute(
                    """
                    UPDATE live_orders
                    SET tx_id = $1, status = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    tx_id, OrderStatus.OPEN.value, order.id
                )
            
            return True, tx_id, None
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error placing order on {order.exchange}: {error_msg}")
            
            # Update order status to rejected
            if order.id:
                async with get_db_connection() as conn:
                    await conn.execute(
                        """
                        UPDATE live_orders
                        SET status = $1, updated_at = NOW()
                        WHERE id = $2
                        """,
                        OrderStatus.REJECTED.value, order.id
                    )
            
            return False, None, error_msg
    
    async def get_order_status(self, user_id: str, exchange: str, tx_id: str) -> Optional[Dict[str, Any]]:
        """Fetch order status from the exchange"""
        try:
            exchange_instance = self._get_exchange(user_id, exchange)
            order = await exchange_instance.fetch_order(tx_id)
            
            # Map CCXT order status to our model
            status_map = {
                'open': OrderStatus.OPEN.value,
                'closed': OrderStatus.FILLED.value,
                'canceled': OrderStatus.CANCELLED.value,
                'expired': OrderStatus.CANCELLED.value, 
                'rejected': OrderStatus.REJECTED.value
            }
            
            status = status_map.get(order['status'], OrderStatus.PENDING.value)
            
            # Convert to our format
            result = {
                'tx_id': tx_id,
                'status': status,
                'executed_qty': float(order.get('filled', 0)),
                'price': float(order.get('price', 0)),
                'cost': float(order.get('cost', 0)),
                'timestamp': order.get('timestamp', 0),
                'raw': order  # Include original response for debugging
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching order status from {exchange} for {tx_id}: {str(e)}")
            return None
    
    async def get_market_data(self, user_id: str, exchange: str, symbol: str) -> Optional[MarketData]:
        """
        Fetch current market data for a symbol
        
        Args:
            user_id: ID of user making the request
            exchange: Exchange name
            symbol: Trading pair (e.g., 'BTC/USDT')
            
        Returns:
            MarketData object or None if error
        """
        try:
            # Check if we have fresh data in cache
            cache_key = f"{exchange}:{symbol}"
            if exchange in self.market_cache and symbol in self.market_cache.get(exchange, {}):
                cached = self.market_cache[exchange][symbol]
                age = (datetime.now() - cached.timestamp).total_seconds()
                if age < self.market_data_ttl:
                    return cached
            
            # Fetch fresh data
            exchange_instance = self._get_exchange(user_id, exchange)
            ticker = await exchange_instance.fetch_ticker(symbol)
            
            # Create market data object
            market_data = MarketData(
                symbol=symbol,
                exchange=exchange,
                price=float(ticker['last']) if ticker['last'] else 0,
                bid=float(ticker['bid']) if ticker['bid'] else None,
                ask=float(ticker['ask']) if ticker['ask'] else None,
                volume_24h=float(ticker['volume']) if ticker['volume'] else 0,
                timestamp=datetime.fromtimestamp(ticker['timestamp'] / 1000) if ticker['timestamp'] else datetime.now(),
                is_stale=False
            )
            
            # Update cache
            if exchange not in self.market_cache:
                self.market_cache[exchange] = {}
            self.market_cache[exchange][symbol] = market_data
            
            return market_data
            
        except Exception as e:
            logger.error(f"Error fetching market data from {exchange} for {symbol}: {str(e)}")
            return None
    
    async def get_wallet_balances(self, user_id: str, exchange: str) -> Optional[List[WalletBalance]]:
        """Fetch wallet balances from the exchange"""
        try:
            exchange_instance = self._get_exchange(user_id, exchange)
            balances = await exchange_instance.fetch_balance()
            
            # Convert to our model
            result = []
            for currency, data in balances['total'].items():
                if float(data) > 0:  # Only include non-zero balances
                    wallet = WalletBalance(
                        user_id=user_id,
                        exchange=exchange,
                        currency=currency,
                        free=float(balances['free'].get(currency, 0)),
                        locked=float(balances['used'].get(currency, 0)),
                        updated_at=datetime.now()
                    )
                    result.append(wallet)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching wallet balances from {exchange}: {str(e)}")
            return None
            
    async def cancel_order(self, user_id: str, exchange: str, tx_id: str, symbol: str) -> bool:
        """Cancel an order on the exchange"""
        try:
            exchange_instance = self._get_exchange(user_id, exchange)
            result = await exchange_instance.cancel_order(tx_id, symbol)
            return True
        except Exception as e:
            logger.error(f"Error cancelling order {tx_id} on {exchange}: {str(e)}")
            return False


# Singleton instance
exchange_connector = ExchangeConnector()
