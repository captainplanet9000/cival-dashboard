"""
Exchange API Endpoints

Provides API endpoints for managing exchange connections and performing
exchange operations, with integration to ElizaOS for AI-powered analysis.
"""

import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..exchanges.exchange_manager import ExchangeManager
from ..exchanges.exchange_base import (
    ExchangeCredentials, OrderType, OrderSide, TimeInForce
)
from ..utils.security import require_api_key, get_current_user
from ..eliza.client import ElizaClient


# Pydantic models for request/response validation
class ExchangeCredentialsModel(BaseModel):
    apiKey: str = Field(..., description="API key")
    apiSecret: str = Field(..., description="API secret")
    passphrase: Optional[str] = Field(None, description="Optional passphrase (required for some exchanges)")
    isTestnet: bool = Field(False, description="Whether to use testnet/sandbox")
    description: str = Field("", description="Optional description")


class ExchangeConfigModel(ExchangeCredentialsModel):
    name: str = Field(..., description="Exchange name")


class WithdrawProtectionModel(BaseModel):
    enabled: bool = Field(..., description="Whether withdraw protection is enabled")
    maxDailyWithdrawal: Optional[float] = Field(None, description="Maximum daily withdrawal amount")
    whitelistedAddresses: Optional[List[str]] = Field(None, description="Whitelisted withdrawal addresses")
    requireConfirmation: Optional[bool] = Field(None, description="Whether to require confirmation for withdrawals")
    timeDelayMinutes: Optional[int] = Field(None, description="Time delay before withdrawals are processed")


class BalanceAlertModel(BaseModel):
    enabled: bool = Field(..., description="Whether balance alerts are enabled")
    minBalanceAlerts: Optional[Dict[str, float]] = Field(None, description="Minimum balance thresholds by currency")
    maxBalanceAlerts: Optional[Dict[str, float]] = Field(None, description="Maximum balance thresholds by currency")
    balanceChangeThreshold: Optional[float] = Field(None, description="Balance change threshold percentage")
    notificationChannels: Optional[List[str]] = Field(None, description="Notification channels")


class WithdrawalStatusModel(BaseModel):
    enabled: bool = Field(..., description="Whether withdrawals are enabled")


class OrderModel(BaseModel):
    symbol: str = Field(..., description="Trading pair symbol")
    side: str = Field(..., description="Order side (BUY or SELL)")
    orderType: str = Field(..., description="Order type (MARKET, LIMIT, etc.)")
    quantity: float = Field(..., description="Order quantity")
    price: Optional[float] = Field(None, description="Price (required for limit orders)")
    timeInForce: Optional[str] = Field(None, description="Time in force")
    clientOrderId: Optional[str] = Field(None, description="Client order ID")


class ElizaCommandModel(BaseModel):
    command: str = Field(..., description="Command to send to ElizaOS")
    context: str = Field("exchange_management", description="Command context")


# Set up logger
logger = logging.getLogger("api.exchange")


class ExchangeAPI:
    """
    API endpoints for exchange operations.
    
    Provides endpoints for managing exchange connections and
    performing exchange operations.
    """
    
    def __init__(
        self,
        exchange_manager: ExchangeManager,
        eliza_client: Optional[ElizaClient] = None
    ):
        """
        Initialize the exchange API.
        
        Args:
            exchange_manager: Exchange manager instance
            eliza_client: Optional ElizaOS client instance
        """
        self.exchange_manager = exchange_manager
        self.eliza_client = eliza_client
        self.router = APIRouter(prefix="/exchanges", tags=["exchanges"])
        
        # Storage for withdraw protection settings and balance alerts
        self.withdraw_protection: Dict[str, WithdrawProtectionModel] = {}
        self.balance_alerts: Dict[str, BalanceAlertModel] = {}
        
        # Register routes
        self._setup_routes()
    
    def _setup_routes(self):
        """Set up API routes."""
        router = self.router
        
        # Exchange management
        router.get("", response_model=List[str], dependencies=[Depends(require_api_key)])(self.get_available_exchanges)
        router.get("/status", response_model=Dict[str, Any], dependencies=[Depends(require_api_key)])(self.get_exchange_status)
        router.post("", dependencies=[Depends(require_api_key)])(self.add_exchange)
        router.put("/{exchange_name}", dependencies=[Depends(require_api_key)])(self.update_exchange)
        router.delete("/{exchange_name}", dependencies=[Depends(require_api_key)])(self.delete_exchange)
        router.post("/test-connection", dependencies=[Depends(require_api_key)])(self.test_connection)
        
        # Account information
        router.get("/account-balance/{exchange_name}", dependencies=[Depends(require_api_key)])(self.get_account_balance)
        
        # Trading operations
        router.post("/{exchange_name}/order", dependencies=[Depends(require_api_key)])(self.create_order)
        router.delete("/{exchange_name}/order", dependencies=[Depends(require_api_key)])(self.cancel_order)
        router.get("/{exchange_name}/orders", dependencies=[Depends(require_api_key)])(self.get_open_orders)
        
        # Market data
        router.get("/{exchange_name}/ticker/{symbol}", dependencies=[Depends(require_api_key)])(self.get_ticker)
        router.get("/{exchange_name}/orderbook/{symbol}", dependencies=[Depends(require_api_key)])(self.get_order_book)
        
        # Withdrawal protection
        router.post("/{exchange_name}/withdrawals", dependencies=[Depends(require_api_key)])(self.set_withdrawal_status)
        router.post("/withdraw-protection/{exchange_name}", dependencies=[Depends(require_api_key)])(self.set_withdraw_protection)
        router.get("/withdraw-protection/{exchange_name}", dependencies=[Depends(require_api_key)])(self.get_withdraw_protection)
        
        # Balance alerts
        router.post("/balance-alerts/{exchange_name}", dependencies=[Depends(require_api_key)])(self.set_balance_alerts)
        router.get("/balance-alerts/{exchange_name}", dependencies=[Depends(require_api_key)])(self.get_balance_alerts)
        
        # ElizaOS integration
        if self.eliza_client:
            router.get("/eliza/analyze", dependencies=[Depends(require_api_key)])(self.eliza_analyze_exchanges)
            router.post("/eliza/command", dependencies=[Depends(require_api_key)])(self.eliza_command)
    
    async def get_available_exchanges(self):
        """
        Get a list of available exchange types.
        
        Returns:
            List of available exchange types
        """
        return list(self.exchange_manager.exchange_classes.keys())
    
    async def get_exchange_status(self):
        """
        Get status of all configured exchanges.
        
        Returns:
            Dictionary mapping exchange names to status information
        """
        status = await self.exchange_manager.get_all_exchanges_status()
        
        # Format the status for the frontend
        formatted_status = {}
        for name, exchange_status in status.items():
            formatted_status[name] = {
                "name": name,
                "connected": exchange_status["connected"],
                "testnet": exchange_status["testnet"],
                "last_check": exchange_status["timestamp"],
                "has_credentials": exchange_status["has_credentials"],
                "balances": exchange_status.get("balances")
            }
        
        return formatted_status
    
    async def add_exchange(self, config: ExchangeConfigModel):
        """
        Add a new exchange.
        
        Args:
            config: Exchange configuration
        """
        try:
            # Create credentials
            credentials = ExchangeCredentials(
                api_key=config.apiKey,
                api_secret=config.apiSecret,
                passphrase=config.passphrase,
                description=config.description,
                key_manager=self.exchange_manager.api_key_manager
            )
            
            # Register the exchange
            await self.exchange_manager.register_exchange(
                name=config.name.lower(),
                credentials=credentials,
                testnet=config.isTestnet
            )
            
            # Notify ElizaOS if available
            if self.eliza_client:
                await self._notify_eliza_exchange_added(config.name.lower())
            
            return {"status": "success", "message": f"Exchange {config.name} added successfully"}
            
        except Exception as e:
            logger.error(f"Error adding exchange: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def update_exchange(self, exchange_name: str, config: ExchangeCredentialsModel):
        """
        Update an existing exchange.
        
        Args:
            exchange_name: Exchange name
            config: Exchange credentials
        """
        try:
            # Create credentials
            credentials = ExchangeCredentials(
                api_key=config.apiKey,
                api_secret=config.apiSecret,
                passphrase=config.passphrase,
                description=config.description,
                key_manager=self.exchange_manager.api_key_manager
            )
            
            # Update the exchange
            await self.exchange_manager.update_exchange(
                name=exchange_name.lower(),
                credentials=credentials,
                testnet=config.isTestnet
            )
            
            return {"status": "success", "message": f"Exchange {exchange_name} updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating exchange: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def delete_exchange(self, exchange_name: str):
        """
        Delete an exchange.
        
        Args:
            exchange_name: Exchange name
        """
        try:
            result = await self.exchange_manager.remove_exchange(exchange_name.lower())
            
            if result:
                # Notify ElizaOS if available
                if self.eliza_client:
                    await self._notify_eliza_exchange_removed(exchange_name.lower())
                
                return {"status": "success", "message": f"Exchange {exchange_name} removed successfully"}
            else:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
        except Exception as e:
            logger.error(f"Error removing exchange: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def test_connection(self, config: ExchangeConfigModel):
        """
        Test an exchange connection without saving it.
        
        Args:
            config: Exchange configuration
        
        Returns:
            Test result
        """
        try:
            # Create credentials
            credentials = ExchangeCredentials(
                api_key=config.apiKey,
                api_secret=config.apiSecret,
                passphrase=config.passphrase,
                description=config.description
            )
            
            # Test the connection
            result = await self.exchange_manager.test_exchange_connection(
                name=config.name.lower(),
                credentials=credentials,
                testnet=config.isTestnet
            )
            
            if result["connected"]:
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": result.get("details", {})
                }
            else:
                return {
                    "success": False,
                    "message": result.get("error", "Connection failed"),
                    "details": result.get("details", {})
                }
            
        except Exception as e:
            logger.error(f"Error testing exchange connection: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def get_account_balance(self, exchange_name: str):
        """
        Get account balance for an exchange.
        
        Args:
            exchange_name: Exchange name
        
        Returns:
            Account balance
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            balance = await exchange.get_account_balance()
            
            # Check for balance alerts if configured
            if exchange_name.lower() in self.balance_alerts:
                await self._check_balance_alerts(exchange_name.lower(), balance.balances)
            
            return {
                "exchange": exchange.name,
                "balances": balance.balances,
                "timestamp": balance.timestamp
            }
            
        except Exception as e:
            logger.error(f"Error getting account balance: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def create_order(self, exchange_name: str, order: OrderModel):
        """
        Create an order on an exchange.
        
        Args:
            exchange_name: Exchange name
            order: Order details
        
        Returns:
            Order result
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            # Map order side and type
            try:
                side = OrderSide[order.side.upper()]
                order_type = OrderType[order.orderType.upper()]
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid order side or type")
            
            # Map time in force if provided
            time_in_force = None
            if order.timeInForce:
                try:
                    time_in_force = TimeInForce[order.timeInForce.upper()]
                except KeyError:
                    raise HTTPException(status_code=400, detail=f"Invalid time in force")
            
            # Create the order
            result = await exchange.create_order(
                symbol=order.symbol,
                side=side,
                order_type=order_type,
                qty=order.quantity,
                price=order.price,
                time_in_force=time_in_force,
                client_order_id=order.clientOrderId
            )
            
            # Notify ElizaOS if available
            if self.eliza_client:
                await self._notify_eliza_order_created(exchange_name.lower(), order)
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def cancel_order(self, exchange_name: str, order_id: str, symbol: str):
        """
        Cancel an order on an exchange.
        
        Args:
            exchange_name: Exchange name
            order_id: Order ID
            symbol: Trading pair symbol
        
        Returns:
            Cancellation result
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            result = await exchange.cancel_order(symbol=symbol, order_id=order_id)
            
            return result
            
        except Exception as e:
            logger.error(f"Error canceling order: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_open_orders(self, exchange_name: str, symbol: Optional[str] = None):
        """
        Get open orders on an exchange.
        
        Args:
            exchange_name: Exchange name
            symbol: Optional trading pair symbol
        
        Returns:
            List of open orders
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            if symbol:
                result = await exchange.get_open_orders(symbol=symbol)
            else:
                # Get open orders for all symbols
                result = []
                exchange_info = await exchange.get_symbols()
                
                for info in exchange_info:
                    symbol = info["symbol"] if isinstance(info, dict) else info
                    try:
                        orders = await exchange.get_open_orders(symbol=symbol)
                        result.extend(orders)
                    except Exception as e:
                        logger.warning(f"Error getting open orders for {symbol}: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting open orders: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_ticker(self, exchange_name: str, symbol: str):
        """
        Get ticker for a symbol.
        
        Args:
            exchange_name: Exchange name
            symbol: Trading pair symbol
        
        Returns:
            Ticker data
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            result = await exchange.get_ticker(symbol=symbol)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting ticker: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_order_book(self, exchange_name: str, symbol: str, limit: int = 20):
        """
        Get order book for a symbol.
        
        Args:
            exchange_name: Exchange name
            symbol: Trading pair symbol
            limit: Maximum number of bids/asks
        
        Returns:
            Order book data
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            result = await exchange.get_order_book(symbol=symbol, limit=limit)
            
            return {
                "symbol": result.symbol,
                "asks": result.asks,
                "bids": result.bids,
                "timestamp": result.timestamp
            }
            
        except Exception as e:
            logger.error(f"Error getting order book: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def set_withdrawal_status(self, exchange_name: str, status: WithdrawalStatusModel):
        """
        Enable or disable withdrawals for an exchange.
        
        Args:
            exchange_name: Exchange name
            status: Withdrawal status
        
        Returns:
            Status update result
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            if status.enabled:
                result = await exchange.enable_withdrawals(confirm=True)
                message = "Withdrawals enabled successfully"
            else:
                await exchange.disable_withdrawals()
                result = True
                message = "Withdrawals disabled successfully"
            
            if result:
                return {"status": "success", "message": message}
            else:
                return {"status": "error", "message": "Failed to update withdrawal status"}
            
        except Exception as e:
            logger.error(f"Error setting withdrawal status: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def set_withdraw_protection(self, exchange_name: str, settings: WithdrawProtectionModel):
        """
        Configure withdraw protection settings for an exchange.
        
        Args:
            exchange_name: Exchange name
            settings: Withdraw protection settings
        
        Returns:
            Configuration result
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            # Store the settings
            self.withdraw_protection[exchange_name.lower()] = settings
            
            # Notify ElizaOS if available
            if self.eliza_client:
                await self._notify_eliza_protection_updated(exchange_name.lower(), "withdraw", settings.dict())
            
            return {"status": "success", "message": "Withdraw protection configured successfully"}
            
        except Exception as e:
            logger.error(f"Error configuring withdraw protection: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_withdraw_protection(self, exchange_name: str):
        """
        Get withdraw protection settings for an exchange.
        
        Args:
            exchange_name: Exchange name
        
        Returns:
            Withdraw protection settings
        """
        try:
            # Check if exchange exists
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            # Return settings or default
            settings = self.withdraw_protection.get(exchange_name.lower())
            
            if not settings:
                return {
                    "enabled": False,
                    "maxDailyWithdrawal": None,
                    "whitelistedAddresses": [],
                    "requireConfirmation": True,
                    "timeDelayMinutes": 0
                }
            
            return settings
            
        except Exception as e:
            logger.error(f"Error getting withdraw protection settings: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def set_balance_alerts(self, exchange_name: str, settings: BalanceAlertModel):
        """
        Configure balance alerts for an exchange.
        
        Args:
            exchange_name: Exchange name
            settings: Balance alert settings
        
        Returns:
            Configuration result
        """
        try:
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            # Store the settings
            self.balance_alerts[exchange_name.lower()] = settings
            
            # Notify ElizaOS if available
            if self.eliza_client:
                await self._notify_eliza_protection_updated(exchange_name.lower(), "balance", settings.dict())
            
            return {"status": "success", "message": "Balance alerts configured successfully"}
            
        except Exception as e:
            logger.error(f"Error configuring balance alerts: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_balance_alerts(self, exchange_name: str):
        """
        Get balance alert settings for an exchange.
        
        Args:
            exchange_name: Exchange name
        
        Returns:
            Balance alert settings
        """
        try:
            # Check if exchange exists
            exchange = await self.exchange_manager.get_exchange(exchange_name.lower())
            
            if not exchange:
                raise HTTPException(status_code=404, detail=f"Exchange {exchange_name} not found")
            
            # Return settings or default
            settings = self.balance_alerts.get(exchange_name.lower())
            
            if not settings:
                return {
                    "enabled": False,
                    "minBalanceAlerts": {},
                    "maxBalanceAlerts": {},
                    "balanceChangeThreshold": 5.0,
                    "notificationChannels": ["email"]
                }
            
            return settings
            
        except Exception as e:
            logger.error(f"Error getting balance alert settings: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def _check_balance_alerts(self, exchange_name: str, balances: Dict[str, Any]):
        """
        Check for balance alerts.
        
        Args:
            exchange_name: Exchange name
            balances: Account balances
        """
        settings = self.balance_alerts.get(exchange_name)
        
        if not settings or not settings.enabled:
            return
        
        # Check for minimum balance alerts
        if settings.minBalanceAlerts:
            for currency, min_balance in settings.minBalanceAlerts.items():
                if currency in balances:
                    balance = balances[currency]["free"] + balances[currency]["locked"]
                    if balance < min_balance:
                        logger.warning(f"Balance alert: {currency} balance ({balance}) is below minimum ({min_balance}) on {exchange_name}")
                        # Add notification logic here
        
        # Check for maximum balance alerts
        if settings.maxBalanceAlerts:
            for currency, max_balance in settings.maxBalanceAlerts.items():
                if currency in balances:
                    balance = balances[currency]["free"] + balances[currency]["locked"]
                    if balance > max_balance:
                        logger.warning(f"Balance alert: {currency} balance ({balance}) exceeds maximum ({max_balance}) on {exchange_name}")
                        # Add notification logic here
    
    async def eliza_analyze_exchanges(self):
        """
        Request ElizaOS to analyze exchange connectivity.
        
        Returns:
            Analysis result
        """
        if not self.eliza_client:
            raise HTTPException(status_code=400, detail="ElizaOS integration not available")
        
        try:
            # Get exchange status
            status = await self.exchange_manager.get_all_exchanges_status()
            
            # Send to ElizaOS for analysis
            result = await self.eliza_client.analyze({
                "context": "exchange_analysis",
                "exchange_status": status,
                "timestamp": int(time.time())
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing exchanges with ElizaOS: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def eliza_command(self, command_data: ElizaCommandModel):
        """
        Send a command to ElizaOS.
        
        Args:
            command_data: Command data
        
        Returns:
            Command result
        """
        if not self.eliza_client:
            raise HTTPException(status_code=400, detail="ElizaOS integration not available")
        
        try:
            result = await self.eliza_client.command(
                command=command_data.command,
                context=command_data.context
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending command to ElizaOS: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def _notify_eliza_exchange_added(self, exchange_name: str):
        """
        Notify ElizaOS when an exchange is added.
        
        Args:
            exchange_name: Exchange name
        """
        if not self.eliza_client:
            return
        
        try:
            await self.eliza_client.notify({
                "event": "exchange_added",
                "exchange_name": exchange_name,
                "timestamp": int(time.time())
            })
        except Exception as e:
            logger.warning(f"Error notifying ElizaOS about exchange addition: {str(e)}")
    
    async def _notify_eliza_exchange_removed(self, exchange_name: str):
        """
        Notify ElizaOS when an exchange is removed.
        
        Args:
            exchange_name: Exchange name
        """
        if not self.eliza_client:
            return
        
        try:
            await self.eliza_client.notify({
                "event": "exchange_removed",
                "exchange_name": exchange_name,
                "timestamp": int(time.time())
            })
        except Exception as e:
            logger.warning(f"Error notifying ElizaOS about exchange removal: {str(e)}")
    
    async def _notify_eliza_order_created(self, exchange_name: str, order: OrderModel):
        """
        Notify ElizaOS when an order is created.
        
        Args:
            exchange_name: Exchange name
            order: Order details
        """
        if not self.eliza_client:
            return
        
        try:
            await self.eliza_client.notify({
                "event": "order_created",
                "exchange_name": exchange_name,
                "order": order.dict(),
                "timestamp": int(time.time())
            })
        except Exception as e:
            logger.warning(f"Error notifying ElizaOS about order creation: {str(e)}")
    
    async def _notify_eliza_protection_updated(
        self,
        exchange_name: str,
        protection_type: str,
        settings: Dict[str, Any]
    ):
        """
        Notify ElizaOS when protection settings are updated.
        
        Args:
            exchange_name: Exchange name
            protection_type: Protection type
            settings: Protection settings
        """
        if not self.eliza_client:
            return
        
        try:
            await self.eliza_client.notify({
                "event": "protection_updated",
                "exchange_name": exchange_name,
                "protection_type": protection_type,
                "settings": settings,
                "timestamp": int(time.time())
            })
        except Exception as e:
            logger.warning(f"Error notifying ElizaOS about protection update: {str(e)}")


def create_exchange_router(
    exchange_manager: ExchangeManager,
    eliza_client: Optional[ElizaClient] = None
) -> APIRouter:
    """
    Create a FastAPI router for exchange endpoints.
    
    Args:
        exchange_manager: Exchange manager instance
        eliza_client: Optional ElizaOS client instance
        
    Returns:
        FastAPI router
    """
    api = ExchangeAPI(exchange_manager, eliza_client)
    return api.router
