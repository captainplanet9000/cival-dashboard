"""
Vertex Protocol Integration Module for TradingFarm

This module provides core functionality for integrating with Vertex Protocol markets,
allowing ElizaOS agents to trade on the platform.

API Documentation: https://docs.vertexprotocol.com/
"""

import os
import json
import time
import logging
import requests
from typing import Dict, List, Any, Optional, Tuple, Union
from decimal import Decimal

import web3
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

# Set up logging
logger = logging.getLogger(__name__)

class VertexClient:
    """
    Client for interacting with Vertex Protocol
    """
    
    # Base URLs
    MAINNET_URL = "https://gateway.vertex.trade"
    TESTNET_URL = "https://gateway-testnet.vertex.trade"
    
    # Contract addresses
    MAINNET_CONTRACTS = {
        "clearinghouse": "0xAE5D884Bd24CBE8b21D95729cE4F5DF23fFAE1DC",
        "endpoint": "0xbbEE07B3e8121227aB4A6eA9342F229ce5208f3F", 
        "quoter": "0x3ac652CC31e6BB8C6bF4dEd460D85B23DC95AC5c"
    }
    
    TESTNET_CONTRACTS = {
        "clearinghouse": "0x13A7dCc9D2094CeAE0533B545627536AF1a17DA8",
        "endpoint": "0x1c2ca0C514D9874F6A1715c7BC5Bf92251658a3F",
        "quoter": "0xF7579f2c5bcAbd7425cB4B2efdDB01E298d99F56"
    }
    
    # Asset decimals
    DEFAULT_DECIMALS = {
        "ETH": 18,
        "BTC": 8,
        "USDC": 6,
        "USDT": 6,
        "SOL": 9
    }
    
    def __init__(self, private_key: str = None, address: str = None, 
                 use_testnet: bool = True, rpc_url: str = None):
        """
        Initialize the Vertex Protocol client
        
        Args:
            private_key: Ethereum private key for signing transactions
            address: Ethereum address if private_key is not provided
            use_testnet: Whether to use testnet or mainnet
            rpc_url: Custom RPC URL for web3 provider
        """
        self.use_testnet = use_testnet
        
        # Set base URL based on network
        self.base_url = self.TESTNET_URL if use_testnet else self.MAINNET_URL
        
        # Set contract addresses based on network
        self.contracts = self.TESTNET_CONTRACTS if use_testnet else self.MAINNET_CONTRACTS
        
        # Initialize web3 for transaction signing
        if rpc_url:
            self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        else:
            # Use default RPCs
            default_rpc = "https://arb-goerli.g.alchemy.com/v2/demo" if use_testnet else "https://arb1.arbitrum.io/rpc"
            self.web3 = Web3(Web3.HTTPProvider(default_rpc))
        
        # Set up account for signing
        self.private_key = private_key
        if private_key:
            self.account = Account.from_key(private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = address if address else None
            
        # Cache for product info
        self._products_cache = None
        self._products_cache_time = 0
        
        logger.info(f"Initialized Vertex client for {'testnet' if use_testnet else 'mainnet'}")
    
    async def get_products(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Get available products from Vertex Protocol
        
        Args:
            force_refresh: Whether to force refresh the cached products
            
        Returns:
            List of product information
        """
        # Check cache first
        if not force_refresh and self._products_cache and time.time() - self._products_cache_time < 3600:
            return self._products_cache
        
        endpoint = f"{self.base_url}/api/v1/products"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get products: {response.text}")
            raise Exception(f"Failed to get products: {response.status_code}")
        
        products = response.json()
        
        # Cache the products
        self._products_cache = products
        self._products_cache_time = time.time()
        
        return products
    
    async def get_orderbook(self, product_id: int) -> Dict[str, Any]:
        """
        Get orderbook for a specific product
        
        Args:
            product_id: The product ID
            
        Returns:
            Orderbook information
        """
        endpoint = f"{self.base_url}/api/v1/orderbook/{product_id}"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get orderbook: {response.text}")
            raise Exception(f"Failed to get orderbook: {response.status_code}")
        
        return response.json()
    
    async def get_markets(self) -> Dict[str, Any]:
        """
        Get market data from Vertex Protocol
        
        Returns:
            Dictionary of market data
        """
        endpoint = f"{self.base_url}/api/v1/markets"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get markets: {response.text}")
            raise Exception(f"Failed to get markets: {response.status_code}")
        
        return response.json()
    
    async def place_order(self, product_id: int, is_buy: bool, price: Union[float, Decimal], 
                        amount: Union[float, Decimal], reduce_only: bool = False) -> Dict[str, Any]:
        """
        Place a limit order on Vertex Protocol
        
        Args:
            product_id: The product ID
            is_buy: Whether it's a buy (True) or sell (False) order
            price: The order price
            amount: The order amount
            reduce_only: Whether the order should be reduce-only
            
        Returns:
            Order response information
        """
        if not self.private_key:
            raise Exception("Private key is required for placing orders")
        
        # Prepare order payload
        payload = {
            "sender": self.address,
            "productId": product_id,
            "isBuy": is_buy,
            "limitPrice": str(price),
            "amount": str(amount),
            "reduceOnly": reduce_only,
            "timestamp": int(time.time() * 1000)
        }
        
        # Sign the payload
        message = json.dumps(payload, separators=(',', ':'))
        message_hash = encode_defunct(text=message)
        signed_message = self.web3.eth.account.sign_message(message_hash, private_key=self.private_key)
        
        # Add signature to payload
        payload["signature"] = signed_message.signature.hex()
        
        # Submit order
        endpoint = f"{self.base_url}/api/v1/orders"
        response = requests.post(endpoint, json=payload)
        
        if response.status_code != 200:
            logger.error(f"Failed to place order: {response.text}")
            raise Exception(f"Failed to place order: {response.status_code}")
        
        return response.json()
    
    async def place_market_order(self, product_id: int, is_buy: bool, 
                               amount: Union[float, Decimal]) -> Dict[str, Any]:
        """
        Place a market order on Vertex Protocol
        
        Args:
            product_id: The product ID
            is_buy: Whether it's a buy (True) or sell (False) order
            amount: The order amount
            
        Returns:
            Order response information
        """
        # Get current orderbook to determine appropriate price for market order
        orderbook = await self.get_orderbook(product_id)
        
        # For market buy, use the lowest ask price with a small premium
        # For market sell, use the highest bid price with a small discount
        if is_buy:
            # Get best ask price and add 0.5% to ensure it executes immediately
            if len(orderbook['asks']) > 0:
                best_price = float(orderbook['asks'][0]['px']) * 1.005
            else:
                raise Exception("No asks available for market buy")
        else:
            # Get best bid price and subtract 0.5% to ensure it executes immediately
            if len(orderbook['bids']) > 0:
                best_price = float(orderbook['bids'][0]['px']) * 0.995
            else:
                raise Exception("No bids available for market sell")
        
        # Place limit order with calculated price for immediate execution
        return await self.place_order(product_id, is_buy, best_price, amount)
    
    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """
        Cancel an order on Vertex Protocol
        
        Args:
            order_id: The order ID to cancel
            
        Returns:
            Cancellation response information
        """
        if not self.private_key:
            raise Exception("Private key is required for cancelling orders")
        
        # Prepare cancel payload
        payload = {
            "sender": self.address,
            "orderId": order_id,
            "timestamp": int(time.time() * 1000)
        }
        
        # Sign the payload
        message = json.dumps(payload, separators=(',', ':'))
        message_hash = encode_defunct(text=message)
        signed_message = self.web3.eth.account.sign_message(message_hash, private_key=self.private_key)
        
        # Add signature to payload
        payload["signature"] = signed_message.signature.hex()
        
        # Submit cancellation
        endpoint = f"{self.base_url}/api/v1/orders/cancel"
        response = requests.post(endpoint, json=payload)
        
        if response.status_code != 200:
            logger.error(f"Failed to cancel order: {response.text}")
            raise Exception(f"Failed to cancel order: {response.status_code}")
        
        return response.json()
    
    async def get_orders(self, status: str = "open") -> List[Dict[str, Any]]:
        """
        Get orders for the current account
        
        Args:
            status: Filter by order status ("open", "filled", "cancelled")
            
        Returns:
            List of orders
        """
        if not self.address:
            raise Exception("Address is required to get orders")
        
        endpoint = f"{self.base_url}/api/v1/orders?address={self.address}&status={status}"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get orders: {response.text}")
            raise Exception(f"Failed to get orders: {response.status_code}")
        
        return response.json()
    
    async def get_positions(self) -> List[Dict[str, Any]]:
        """
        Get current positions for the account
        
        Returns:
            List of positions
        """
        if not self.address:
            raise Exception("Address is required to get positions")
        
        endpoint = f"{self.base_url}/api/v1/positions?address={self.address}"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get positions: {response.text}")
            raise Exception(f"Failed to get positions: {response.status_code}")
        
        return response.json()
    
    async def get_balances(self) -> Dict[str, Any]:
        """
        Get current balances for the account
        
        Returns:
            Account balances
        """
        if not self.address:
            raise Exception("Address is required to get balances")
        
        endpoint = f"{self.base_url}/api/v1/balances?address={self.address}"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get balances: {response.text}")
            raise Exception(f"Failed to get balances: {response.status_code}")
        
        return response.json()

    async def get_market_data(self, product_id: int) -> Dict[str, Any]:
        """
        Get detailed market data for a specific product
        
        Args:
            product_id: The product ID
            
        Returns:
            Market data information
        """
        endpoint = f"{self.base_url}/api/v1/market/{product_id}"
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get market data: {response.text}")
            raise Exception(f"Failed to get market data: {response.status_code}")
        
        return response.json()
    
    async def get_candle_data(self, product_id: int, interval: str = "1h", 
                            start_time: int = None, end_time: int = None, 
                            limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get candlestick data for a specific product
        
        Args:
            product_id: The product ID
            interval: Time interval (1m, 5m, 15m, 1h, 4h, 1d)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds
            limit: Maximum number of candles to return
            
        Returns:
            List of candlestick data
        """
        endpoint = f"{self.base_url}/api/v1/candles/{product_id}?interval={interval}&limit={limit}"
        
        if start_time:
            endpoint += f"&start_time={start_time}"
        
        if end_time:
            endpoint += f"&end_time={end_time}"
        
        response = requests.get(endpoint)
        
        if response.status_code != 200:
            logger.error(f"Failed to get candle data: {response.text}")
            raise Exception(f"Failed to get candle data: {response.status_code}")
        
        return response.json()
    
    async def get_product_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get product information by symbol (e.g., "ETH-PERP")
        
        Args:
            symbol: The product symbol
            
        Returns:
            Product information or None if not found
        """
        products = await self.get_products()
        
        for product in products:
            if product.get("symbol") == symbol:
                return product
        
        return None
    
    async def get_product_id_by_symbol(self, symbol: str) -> Optional[int]:
        """
        Get product ID by symbol (e.g., "ETH-PERP")
        
        Args:
            symbol: The product symbol
            
        Returns:
            Product ID or None if not found
        """
        product = await self.get_product_by_symbol(symbol)
        return product.get("productId") if product else None

    async def deposit(self, token: str, amount: Union[float, Decimal]) -> Dict[str, Any]:
        """
        Deposit funds to Vertex Protocol
        
        Args:
            token: Token symbol (e.g., "ETH", "USDC")
            amount: Amount to deposit
            
        Returns:
            Deposit transaction details
        """
        # This is a placeholder for the deposit process
        # In a real implementation, this would involve creating and submitting a transaction
        # to the Vertex clearinghouse contract
        
        if not self.private_key:
            raise Exception("Private key is required for deposits")
        
        # This is just a simulation for now
        logger.info(f"Simulating deposit of {amount} {token}")
        
        # In a real implementation, you would:
        # 1. Get the token contract address
        # 2. Approve the clearinghouse to spend tokens
        # 3. Call the deposit function on the clearinghouse contract
        
        return {
            "status": "success",
            "message": f"Simulated deposit of {amount} {token}",
            "txHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
    
    async def withdraw(self, token: str, amount: Union[float, Decimal]) -> Dict[str, Any]:
        """
        Withdraw funds from Vertex Protocol
        
        Args:
            token: Token symbol (e.g., "ETH", "USDC")
            amount: Amount to withdraw
            
        Returns:
            Withdrawal transaction details
        """
        # This is a placeholder for the withdrawal process
        # In a real implementation, this would involve creating and submitting a transaction
        # to the Vertex clearinghouse contract
        
        if not self.private_key:
            raise Exception("Private key is required for withdrawals")
        
        # This is just a simulation for now
        logger.info(f"Simulating withdrawal of {amount} {token}")
        
        # In a real implementation, you would:
        # 1. Call the withdraw function on the clearinghouse contract
        
        return {
            "status": "success",
            "message": f"Simulated withdrawal of {amount} {token}",
            "txHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
