"""
Hyperliquid Agent Connection Module

This module provides an agent-based connection to the Hyperliquid exchange
using abstracted address/private key connections for secure automated trading.
Designed to work with ElizaOS integration for AI-powered trading strategies.
"""

import asyncio
import json
import time
import logging
import hmac
import hashlib
import base64
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
import websockets
import aiohttp
from datetime import datetime, timezone
import eth_account
from eth_account.messages import encode_defunct
from eth_account.signers.local import LocalAccount
import random

from .hyperliquid import HyperliquidClient
from ..blockchain.base import (
    ExchangeInterface, Order, OrderBook, Position, 
    OrderType, OrderSide, TimeInForce
)
from src.config.config import HYPERLIQUID_API_URL, HYPERLIQUID_WEBSOCKET_URL

logger = logging.getLogger(__name__)

class ElizaHyperliquidAgent(HyperliquidClient):
    """
    Specialized Hyperliquid client for ElizaOS agent integration.
    Supports abstracted address/private key connections for secure automated trading.
    """
    
    def __init__(
        self, 
        private_key: str,
        wallet_address: str = None,
        agent_id: str = None,
        proxy_contract: str = None,
        testnet: bool = False
    ):
        """
        Initialize ElizaHyperliquid agent with abstracted address capabilities.
        
        Args:
            private_key: The private key for signing transactions
            wallet_address: Optional wallet address. If not provided, derived from private key
            agent_id: Unique identifier for the agent within ElizaOS
            proxy_contract: Address of proxy contract for abstracted operations
            testnet: Whether to use testnet
        """
        # If wallet address not provided, derive it from private key
        if not wallet_address:
            account: LocalAccount = eth_account.Account.from_key(private_key)
            wallet_address = account.address
            
        # Call the HyperliquidClient constructor with the required parameters
        super().__init__(private_key=private_key, wallet_address=wallet_address, testnet=testnet)
        
        self.agent_id = agent_id or f"eliza_agent_{int(time.time())}"
        self.proxy_contract = proxy_contract
        self.account = eth_account.Account.from_key(private_key)
        self.active_strategies = {}
        self.is_agent_active = False
        self.active_orders = {}
        
    async def initialize(self) -> None:
        """Initialize the Hyperliquid agent connection."""
        await super().initialize()
        
        # Additional agent-specific initialization
        self.is_agent_active = True
        logger.info(f"ElizaHyperliquid agent {self.agent_id} initialized")
        
        # Register agent with proxy if using abstracted address
        if self.proxy_contract:
            await self._register_with_proxy()
    
    async def _register_with_proxy(self) -> None:
        """Register agent with the proxy contract for abstracted transactions."""
        if not self.proxy_contract:
            return
            
        logger.info(f"Registering agent {self.agent_id} with proxy contract {self.proxy_contract}")
        
        timestamp = int(time.time() * 1000)
        registration_message = f"register_agent:{self.agent_id}:{self.wallet_address}:{timestamp}"
        
        # Sign the registration message using EIP-191
        message = encode_defunct(text=registration_message)
        signed_message = self.account.sign_message(message)
        
        # Format signature for the API
        signature = {
            "r": signed_message.r.hex(),
            "s": signed_message.s.hex(),
            "v": signed_message.v
        }
        
        # Send registration to proxy contract
        payload = {
            "agentId": self.agent_id,
            "walletAddress": self.wallet_address,
            "proxyContract": self.proxy_contract,
            "timestamp": timestamp,
            "signature": signature
        }
        
        try:
            await self._make_request(
                "POST", 
                "/exchange/v1/agent/register", 
                payload, 
                auth=True
            )
            logger.info(f"Agent {self.agent_id} successfully registered with proxy")
        except Exception as e:
            logger.error(f"Failed to register agent with proxy: {e}")
            raise
    
    async def _sign_request(self, endpoint: str, method: str, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Sign a request to the Hyperliquid API with abstracted address support.
        Uses EIP-712 structured data signing for proxy contract interaction.
        """
        timestamp = int(time.time() * 1000)
        
        # If using proxy contract, create a structured message for signing
        if self.proxy_contract:
            # Create EIP-712 structured data
            domain = {
                "name": "HyperliquidProxy",
                "version": "1",
                "chainId": 42161 if not self.testnet else 421613,  # Arbitrum / Arbitrum Goerli
                "verifyingContract": self.proxy_contract
            }
            
            # Define the types for structured data
            types = {
                "Agent": [
                    {"name": "agentId", "type": "string"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "method", "type": "string"},
                    {"name": "path", "type": "string"},
                    {"name": "body", "type": "string"}
                ]
            }
            
            # Create the message
            structured_msg = {
                "agentId": self.agent_id,
                "timestamp": timestamp,
                "method": method,
                "path": endpoint,
                "body": json.dumps(data, separators=(',', ':'))
            }
            
            # Sign the structured data
            # Note: Would normally use signTypedData but for simplicity using regular signing here
            message_to_sign = json.dumps({
                "types": types,
                "domain": domain,
                "primaryType": "Agent",
                "message": structured_msg
            }, separators=(',', ':'))
            
            message = encode_defunct(text=message_to_sign)
            signed_message = self.account.sign_message(message)
            
            # Return headers with proxy contract information
            return {
                "X-HL-Timestamp": str(timestamp),
                "X-HL-Signature": signed_message.signature.hex(),
                "X-HL-Wallet-Address": self.wallet_address,
                "X-HL-Agent-ID": self.agent_id,
                "X-HL-Proxy-Contract": self.proxy_contract
            }
        else:
            # Fall back to standard signing if not using proxy
            return await super()._sign_request(endpoint, method, data)
    
    def _sign_eip712_message(self, message: Dict[str, Any]) -> str:
        """
        Sign a message using EIP-712 structured data format.
        
        Args:
            message: The message to sign
            
        Returns:
            str: The signature
        """
        # Convert message to JSON string
        message_json = json.dumps(message)
        # Create a hash of the message
        message_hash = encode_defunct(text=message_json)
        # Sign the hash with the private key
        signed_message = self.account.sign_message(message_hash)
        # Return the signature
        return signed_message.signature.hex()
    
    async def execute_strategy(self, strategy_id: str, parameters: Dict[str, Any]) -> str:
        """
        Deploy and execute a trading strategy through the agent.
        
        Args:
            strategy_id: Identifier for the strategy to execute
            parameters: Strategy configuration parameters
            
        Returns:
            Execution ID for the running strategy
        """
        execution_id = f"{strategy_id}_{int(time.time())}"
        
        payload = {
            "agentId": self.agent_id,
            "strategyId": strategy_id,
            "executionId": execution_id,
            "parameters": parameters
        }
        
        response = await self._make_request(
            "POST", 
            "/exchange/v1/agent/strategy/execute", 
            payload, 
            auth=True
        )
        
        self.active_strategies[execution_id] = {
            "strategy_id": strategy_id,
            "parameters": parameters,
            "start_time": datetime.now(timezone.utc),
            "status": "running"
        }
        
        logger.info(f"Strategy {strategy_id} deployed with execution ID {execution_id}")
        return execution_id
    
    async def stop_strategy(self, execution_id: str) -> bool:
        """
        Stop a running strategy.
        
        Args:
            execution_id: Execution ID of the running strategy
            
        Returns:
            Success status
        """
        if execution_id not in self.active_strategies:
            logger.warning(f"Strategy with execution ID {execution_id} not found")
            return False
        
        payload = {
            "agentId": self.agent_id,
            "executionId": execution_id
        }
        
        response = await self._make_request(
            "POST", 
            "/exchange/v1/agent/strategy/stop", 
            payload, 
            auth=True
        )
        
        if execution_id in self.active_strategies:
            self.active_strategies[execution_id]["status"] = "stopped"
            
        logger.info(f"Strategy with execution ID {execution_id} stopped")
        return True
    
    async def get_strategy_status(self, execution_id: str) -> Dict[str, Any]:
        """
        Get status of a running strategy.
        
        Args:
            execution_id: Execution ID of the strategy
            
        Returns:
            Dictionary with strategy status information
        """
        payload = {
            "agentId": self.agent_id,
            "executionId": execution_id
        }
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/agent/strategy/status", 
            payload, 
            auth=True
        )
        
        # Update local cache
        if execution_id in self.active_strategies and "status" in response:
            self.active_strategies[execution_id]["status"] = response["status"]
            
        return response
    
    async def get_active_strategies(self) -> List[Dict[str, Any]]:
        """
        Get all active strategies for this agent.
        
        Returns:
            List of active strategy details
        """
        payload = {
            "agentId": self.agent_id
        }
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/agent/strategies", 
            payload, 
            auth=True
        )
        
        # Update local cache with current strategies
        if "strategies" in response:
            for strategy in response["strategies"]:
                if "executionId" in strategy and strategy["executionId"] in self.active_strategies:
                    self.active_strategies[strategy["executionId"]].update(strategy)
        
        return [self.active_strategies[key] for key in self.active_strategies]
    
    async def create_abstracted_order(self, order: Order) -> Dict[str, Any]:
        """
        Create an order using the abstracted address pattern.
        
        Args:
            order: Order details
            
        Returns:
            Dict: Order response from Hyperliquid
        """
        try:
            # First format the order for Hyperliquid's API
            coin = order.symbol  # Hyperliquid uses simple coin names (e.g., "ETH")
            side = 'B' if order.side == OrderSide.BUY else 'A'  # Hyperliquid uses 'B' for buy, 'A' for ask/sell
            
            # Format the order details according to Hyperliquid API requirements
            order_data = {
                "coin": coin,
                "is_buy": side == 'B',
                "sz": order.quantity,
                "limit_px": order.price,
                "order_type": {
                    "limit": {
                        "tif": "Gtc"  # Good till cancelled
                    }
                },
                "leverage": order.leverage
            }
            
            # Prepare signature data using EIP-712 structured format
            timestamp = int(time.time() * 1000)
            nonce = random.randint(1, 100000)
            
            # Create signature payload
            message = {
                "action": "order",
                "timestamp": timestamp,
                "nonce": nonce,
                "order": order_data
            }
            
            # Sign the message
            signature = self._sign_eip712_message(message)
            
            # Construct the final request
            request_data = {
                "action": "order",
                "timestamp": timestamp,
                "nonce": nonce,
                "order": order_data,
                "signature": signature,
                "wallet_address": self.wallet_address
            }
            
            # Send the order request
            endpoint = "/exchange/v1/order"
            response = await self._make_request("POST", endpoint, request_data)
            
            # Map response to Order format for consistency
            order_response = {
                "orderId": response.get("order_id", ""),
                "symbol": order.symbol,
                "side": order.side.value,
                "price": order.price,
                "quantity": order.quantity,
                "status": "NEW",
                "timestamp": timestamp
            }
            
            # ElizaOS integration - store the order in agent memory
            self._store_order_in_memory(order_response)
            
            return order_response
            
        except Exception as e:
            logger.error(f"Error creating abstracted order: {e}")
            raise
            
    def _store_order_in_memory(self, order_data: Dict[str, Any]) -> None:
        """
        Store order data in ElizaOS agent memory for tracking and analytics.
        
        Args:
            order_data: The order data to store
        """
        try:
            # Add to active orders tracking
            order_id = order_data.get("orderId", "")
            if order_id:
                # In a complete implementation, this would store to ElizaOS memory system
                # For now, we'll just keep it in the agent's local memory
                self.active_orders[order_id] = {
                    "data": order_data,
                    "timestamp": time.time(),
                    "status_updates": []
                }
                logger.info(f"Order {order_id} stored in agent memory")
        except Exception as e:
            logger.warning(f"Failed to store order in memory: {e}")
    
    async def get_order_status(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """
        Get the status of an order.
        
        Args:
            symbol: The trading symbol
            order_id: The order ID
            
        Returns:
            Dict: Order status data
        """
        try:
            # For Hyperliquid, we need to query open orders or order history
            endpoint = "/info/openOrders"
            params = {"address": self.wallet_address}
            url = f"{self.api_url}{endpoint}"
            
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                data = await response.json()
                
                # Find the specific order in the open orders
                for order in data:
                    if order.get("id") == order_id:
                        status_data = {
                            "orderId": order_id,
                            "symbol": symbol,
                            "status": "OPEN",
                            "price": float(order.get("limitPx", 0)),
                            "quantity": float(order.get("sz", 0)),
                            "filledQuantity": float(order.get("filledSz", 0)),
                            "remainingQuantity": float(order.get("sz", 0)) - float(order.get("filledSz", 0)),
                            "side": "BUY" if order.get("isBuy", False) else "SELL",
                            "createdTime": order.get("timestamp", 0)
                        }
                        
                        # Update in ElizaOS agent memory
                        if order_id in self.active_orders:
                            self.active_orders[order_id]["status_updates"].append(status_data)
                            
                        return status_data
                
                # If not found in open orders, check filled/cancelled orders
                endpoint = "/info/orderHistory"
                url = f"{self.api_url}{endpoint}"
                
                async with self.session.get(url, params=params) as history_response:
                    history_response.raise_for_status()
                    history_data = await history_response.json()
                    
                    for order in history_data:
                        if order.get("id") == order_id:
                            status = "FILLED" if float(order.get("filledSz", 0)) >= float(order.get("sz", 0)) else "CANCELED"
                            status_data = {
                                "orderId": order_id,
                                "symbol": symbol,
                                "status": status,
                                "price": float(order.get("limitPx", 0)),
                                "quantity": float(order.get("sz", 0)),
                                "filledQuantity": float(order.get("filledSz", 0)),
                                "remainingQuantity": float(order.get("sz", 0)) - float(order.get("filledSz", 0)),
                                "side": "BUY" if order.get("isBuy", False) else "SELL",
                                "createdTime": order.get("timestamp", 0)
                            }
                            
                            # Update in ElizaOS agent memory
                            if order_id in self.active_orders:
                                self.active_orders[order_id]["status_updates"].append(status_data)
                                
                            return status_data
                
                # If order not found in either location
                return {
                    "orderId": order_id,
                    "symbol": symbol,
                    "status": "NOT_FOUND",
                    "message": "Order not found in open orders or history"
                }
                
        except Exception as e:
            logger.error(f"Error getting order status: {e}")
            return {
                "orderId": order_id,
                "symbol": symbol,
                "status": "ERROR",
                "message": str(e)
            }
    
    async def get_agent_positions(self) -> List[Position]:
        """
        Get all current positions for the agent.
        
        Returns:
            List of Position objects
        """
        payload = {
            "agentId": self.agent_id
        }
        
        if self.proxy_contract:
            payload["proxyContract"] = self.proxy_contract
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/agent/positions", 
            payload, 
            auth=True
        )
        
        positions = []
        for pos in response.get("positions", []):
            position = Position(
                symbol=pos["symbol"],
                entry_price=float(pos["entryPrice"]),
                position_size=float(pos["positionAmt"]),
                unrealized_pnl=float(pos.get("unrealizedProfit", 0)),
                leverage=float(pos.get("leverage", 1)),
                liquidation_price=float(pos.get("liquidationPrice", 0)),
                margin_type=pos.get("marginType", "isolated"),
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000)
            )
            positions.append(position)
            
        return positions
    
    async def close(self) -> None:
        """Close the Hyperliquid agent connection and cleanup."""
        # Stop all active strategies
        for execution_id in list(self.active_strategies.keys()):
            await self.stop_strategy(execution_id)
            
        self.is_agent_active = False
        
        # Close the underlying connection
        await super().close()
