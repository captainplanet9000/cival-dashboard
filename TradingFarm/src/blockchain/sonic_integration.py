"""
Sonic Protocol Integration Module for TradingFarm

This module provides core functionality for integrating with Sonic Protocol,
allowing ElizaOS agents to trade on the platform.

Sonic is a decentralized exchange on Sui network with concentrated liquidity.
"""

import os
import json
import time
import logging
import requests
import base64
import hashlib
from typing import Dict, List, Any, Optional, Tuple, Union
from decimal import Decimal

# Import Sui SDK when available
try:
    from pysui import SuiClient, SuiConfig
    from pysui.abstracts import SignatureScheme
    has_sui_sdk = True
except ImportError:
    has_sui_sdk = False
    logging.warning("Sui SDK not installed. Some functions will be limited.")

# Set up logging
logger = logging.getLogger(__name__)

class SonicClient:
    """
    Client for interacting with Sonic DEX on Sui Network
    """
    
    # Base URLs for API and RPC
    MAINNET_API_URL = "https://api.sonic.exchange/v1"
    TESTNET_API_URL = "https://api-testnet.sonic.exchange/v1"
    
    MAINNET_RPC_URL = "https://sui-mainnet.mystenlabs.com"
    TESTNET_RPC_URL = "https://sui-testnet.mystenlabs.com"
    
    # Sonic DEX package addresses
    MAINNET_PACKAGES = {
        "dex": "0x3a5143bb1196e3bcdfab6203d1683ae29edd26295c1e47b31d1a2896a3a1487d",
        "router": "0xe2c7a6843cb13d9549a9d2dc1c266555ac692332ab5a5a44f42d25364e4cd331",
        "pools": "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe0f0b76f13002e5"
    }
    
    TESTNET_PACKAGES = {
        "dex": "0x3a5143bb1196e3bcdfab6203d1683ae29edd26295c1e47b31d1a2896a3a1487d",
        "router": "0x4c7f35795a3c2cbc9c8b1d6b9098cb8d57eebcbfb7adbf12949e55cbc35d1a0b",
        "pools": "0x3f2d9f724f4a1ce5e71676448dc452be9a6243dac9c5b975a588c8c867066e92" 
    }
    
    # Token addresses for common coins
    MAINNET_TOKENS = {
        "SUI": "0x2::sui::SUI",
        "USDC": "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
        "USDT": "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
        "WETH": "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN"
    }
    
    TESTNET_TOKENS = {
        "SUI": "0x2::sui::SUI",
        "USDC": "0x7016aae72571c1ec8d6d65e6cc6657d2cc58f6a10343a802fcae2863e27ccee1::usdc::USDC",
        "USDT": "0x6674cab0f9b022627d2eea0b9676d3a5a593c3d44fd8cc431ac5e47713c21049::usdt::USDT",
        "WETH": "0xf0f6b8e2446d19b08abae0a0cc46f2ab16490fe9d068ac7936933d58324b7069::eth::ETH"
    }
    
    def __init__(self, private_key: str = None, use_testnet: bool = True, 
                 rpc_url: str = None, api_key: str = None):
        """
        Initialize the Sonic Protocol client
        
        Args:
            private_key: Sui private key for signing transactions
            use_testnet: Whether to use testnet or mainnet
            rpc_url: Custom RPC URL for Sui network
            api_key: API key for Sonic API (if required)
        """
        self.use_testnet = use_testnet
        self.api_key = api_key
        
        # Set base URLs based on network
        self.api_url = self.TESTNET_API_URL if use_testnet else self.MAINNET_API_URL
        self.rpc_url = rpc_url or (self.TESTNET_RPC_URL if use_testnet else self.MAINNET_RPC_URL)
        
        # Set package addresses based on network
        self.packages = self.TESTNET_PACKAGES if use_testnet else self.MAINNET_PACKAGES
        
        # Set token addresses based on network
        self.tokens = self.TESTNET_TOKENS if use_testnet else self.MAINNET_TOKENS
        
        # Initialize Sui client if SDK is available
        self.private_key = private_key
        self.address = None
        
        if has_sui_sdk and private_key:
            self._init_sui_client(private_key)
        
        # Cache for pool info
        self._pools_cache = None
        self._pools_cache_time = 0
        
        logger.info(f"Initialized Sonic client for {'testnet' if use_testnet else 'mainnet'}")
    
    def _init_sui_client(self, private_key: str):
        """
        Initialize the Sui client with private key
        
        Args:
            private_key: Sui private key
        """
        try:
            # For production, this would use the actual private key import mechanism
            # This is a simplified version for demonstration
            config = SuiConfig.user_config(rpc_url=self.rpc_url)
            config.add_keypair_from_keystring({
                "private_key": private_key,
                "scheme": SignatureScheme.ED25519
            })
            
            self.sui_client = SuiClient(config)
            
            # Get the address from the keypair
            self.address = config.active_address
            
            logger.info(f"Initialized Sui client with address: {self.address}")
        except Exception as e:
            logger.error(f"Failed to initialize Sui client: {str(e)}")
            raise Exception(f"Failed to initialize Sui client: {str(e)}")
    
    async def _make_api_request(self, endpoint: str, method: str = "GET", 
                             params: Dict = None, data: Dict = None) -> Dict[str, Any]:
        """
        Make a request to the Sonic API
        
        Args:
            endpoint: API endpoint
            method: HTTP method
            params: Query parameters
            data: Request data
            
        Returns:
            API response
        """
        url = f"{self.api_url}{endpoint}"
        
        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        try:
            if method == "GET":
                response = requests.get(url, params=params, headers=headers)
            elif method == "POST":
                headers["Content-Type"] = "application/json"
                response = requests.post(url, params=params, json=data, headers=headers)
            else:
                raise Exception(f"Unsupported HTTP method: {method}")
            
            if response.status_code != 200:
                logger.error(f"API request failed: {response.text}")
                raise Exception(f"API request failed: {response.status_code}")
            
            return response.json()
        except Exception as e:
            logger.error(f"API request error: {str(e)}")
            raise
    
    async def get_pools(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Get available liquidity pools from Sonic Protocol
        
        Args:
            force_refresh: Whether to force refresh the cached pools
            
        Returns:
            List of pool information
        """
        # Check cache first
        if not force_refresh and self._pools_cache and time.time() - self._pools_cache_time < 3600:
            return self._pools_cache
        
        response = await self._make_api_request("/pools")
        
        # Cache the pools
        self._pools_cache = response.get("pools", [])
        self._pools_cache_time = time.time()
        
        return self._pools_cache
    
    async def get_pool_by_tokens(self, token_a: str, token_b: str) -> Optional[Dict[str, Any]]:
        """
        Get pool information for a specific token pair
        
        Args:
            token_a: First token symbol (e.g., "SUI")
            token_b: Second token symbol (e.g., "USDC")
            
        Returns:
            Pool information or None if not found
        """
        # Get token addresses from symbols
        token_a_address = self.tokens.get(token_a.upper())
        token_b_address = self.tokens.get(token_b.upper())
        
        if not token_a_address or not token_b_address:
            raise ValueError(f"Unknown token symbol: {token_a if not token_a_address else token_b}")
        
        pools = await self.get_pools()
        
        for pool in pools:
            # Check if pool contains both tokens
            pool_tokens = pool.get("tokens", [])
            token_addresses = [token.get("address") for token in pool_tokens]
            
            if token_a_address in token_addresses and token_b_address in token_addresses:
                return pool
        
        return None
    
    async def get_pool_reserves(self, pool_id: str) -> Dict[str, Any]:
        """
        Get current reserves and liquidity information for a pool
        
        Args:
            pool_id: The pool ID
            
        Returns:
            Pool reserves information
        """
        return await self._make_api_request(f"/pools/{pool_id}/reserves")
    
    async def get_token_price(self, token_symbol: str, quote_currency: str = "USD") -> float:
        """
        Get token price from Sonic Protocol
        
        Args:
            token_symbol: Token symbol (e.g., "SUI")
            quote_currency: Quote currency (e.g., "USD")
            
        Returns:
            Token price
        """
        response = await self._make_api_request(f"/tokens/{token_symbol}/price", params={"quote": quote_currency})
        return float(response.get("price", 0))
    
    async def get_token_info(self, token_symbol: str) -> Dict[str, Any]:
        """
        Get detailed token information
        
        Args:
            token_symbol: Token symbol (e.g., "SUI")
            
        Returns:
            Token information
        """
        response = await self._make_api_request(f"/tokens/{token_symbol}")
        return response.get("token", {})
    
    async def get_swap_quote(self, input_token: str, output_token: str, 
                           amount: Union[float, Decimal], is_exact_input: bool = True) -> Dict[str, Any]:
        """
        Get a quote for swapping tokens
        
        Args:
            input_token: Input token symbol (e.g., "SUI")
            output_token: Output token symbol (e.g., "USDC")
            amount: Amount to swap (in input token if is_exact_input=True, otherwise in output token)
            is_exact_input: Whether the amount is in the input token (True) or output token (False)
            
        Returns:
            Swap quote information
        """
        # Get token addresses from symbols
        input_token_address = self.tokens.get(input_token.upper())
        output_token_address = self.tokens.get(output_token.upper())
        
        if not input_token_address or not output_token_address:
            raise ValueError(f"Unknown token symbol: {input_token if not input_token_address else output_token}")
        
        params = {
            "inputToken": input_token_address,
            "outputToken": output_token_address,
            "amount": str(amount),
            "exactIn": "true" if is_exact_input else "false"
        }
        
        return await self._make_api_request("/quote", params=params)
    
    async def build_swap_transaction(self, input_token: str, output_token: str, 
                                   amount: Union[float, Decimal], slippage: float = 0.005,
                                   is_exact_input: bool = True) -> Dict[str, Any]:
        """
        Build a transaction for swapping tokens
        
        Args:
            input_token: Input token symbol (e.g., "SUI")
            output_token: Output token symbol (e.g., "USDC")
            amount: Amount to swap (in input token if is_exact_input=True, otherwise in output token)
            slippage: Maximum slippage tolerance (default 0.5%)
            is_exact_input: Whether the amount is in the input token (True) or output token (False)
            
        Returns:
            Transaction building information
        """
        if not self.address:
            raise Exception("Wallet address is required for building transactions")
        
        # Get token addresses from symbols
        input_token_address = self.tokens.get(input_token.upper())
        output_token_address = self.tokens.get(output_token.upper())
        
        if not input_token_address or not output_token_address:
            raise ValueError(f"Unknown token symbol: {input_token if not input_token_address else output_token}")
        
        # First get a quote
        quote = await self.get_swap_quote(input_token, output_token, amount, is_exact_input)
        
        # Calculate minimum output amount with slippage
        if is_exact_input:
            # If exact input, calculate minimum output with slippage
            output_amount = float(quote.get("outputAmount", 0))
            min_output_amount = output_amount * (1 - slippage)
        else:
            # If exact output, calculate maximum input with slippage
            input_amount = float(quote.get("inputAmount", 0))
            max_input_amount = input_amount * (1 + slippage)
        
        # Build transaction data
        data = {
            "senderAddress": self.address,
            "inputToken": input_token_address,
            "outputToken": output_token_address,
            "amount": str(amount),
            "exactIn": is_exact_input,
            "slippage": slippage
        }
        
        return await self._make_api_request("/transactions/swap", method="POST", data=data)
    
    async def execute_swap(self, input_token: str, output_token: str, 
                         amount: Union[float, Decimal], slippage: float = 0.005,
                         is_exact_input: bool = True) -> Dict[str, Any]:
        """
        Execute a token swap on Sonic Protocol
        
        Args:
            input_token: Input token symbol (e.g., "SUI")
            output_token: Output token symbol (e.g., "USDC")
            amount: Amount to swap (in input token if is_exact_input=True, otherwise in output token)
            slippage: Maximum slippage tolerance (default 0.5%)
            is_exact_input: Whether the amount is in the input token (True) or output token (False)
            
        Returns:
            Transaction execution result
        """
        if not has_sui_sdk:
            raise Exception("Sui SDK is required for executing transactions")
        
        if not self.private_key:
            raise Exception("Private key is required for executing transactions")
        
        # Build the transaction
        tx_data = await self.build_swap_transaction(
            input_token, output_token, amount, slippage, is_exact_input)
        
        # In a real implementation, this would execute the transaction using the Sui SDK
        # This is a simplified version for demonstration
        tx_bytes = tx_data.get("txBytes")
        
        # Sign and execute transaction
        if not tx_bytes:
            raise Exception("Failed to get transaction bytes")
        
        # Sign and execute transaction using the Sui SDK
        # This is a placeholder for the actual implementation
        logger.info(f"Executing swap: {input_token} -> {output_token}, amount: {amount}")
        
        # In a real implementation, you would:
        # 1. Deserialize the transaction bytes
        # 2. Sign the transaction
        # 3. Execute the transaction
        # 4. Wait for confirmation
        
        # This is just a simulation for now
        return {
            "status": "success",
            "message": f"Simulated swap of {amount} {input_token} to {output_token}",
            "digest": "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
    
    async def get_pool_positions(self) -> List[Dict[str, Any]]:
        """
        Get current liquidity positions for the account
        
        Returns:
            List of liquidity positions
        """
        if not self.address:
            raise Exception("Wallet address is required to get positions")
        
        return await self._make_api_request(f"/positions", params={"address": self.address})
    
    async def get_balances(self) -> Dict[str, Any]:
        """
        Get current token balances for the account
        
        Returns:
            Account balances
        """
        if not self.address:
            raise Exception("Wallet address is required to get balances")
        
        if not has_sui_sdk:
            raise Exception("Sui SDK is required for getting balances")
        
        # In a real implementation, this would query the Sui blockchain for token balances
        # This is a simplified version for demonstration
        
        # Get list of tokens in our mapping
        token_symbols = list(self.tokens.keys())
        
        # Create a placeholder response
        balances = {}
        
        for symbol in token_symbols:
            # In a real implementation, you would:
            # 1. Get the token type
            # 2. Query the blockchain for the balance
            
            # This is just a simulation for now
            balances[symbol] = {
                "symbol": symbol,
                "name": symbol,
                "balance": "0",
                "decimals": 9 if symbol == "SUI" else 6
            }
        
        return {"balances": balances}
    
    async def add_liquidity(self, token_a: str, token_b: str, 
                          amount_a: Union[float, Decimal], amount_b: Union[float, Decimal], 
                          slippage: float = 0.005) -> Dict[str, Any]:
        """
        Add liquidity to a pool
        
        Args:
            token_a: First token symbol (e.g., "SUI")
            token_b: Second token symbol (e.g., "USDC")
            amount_a: Amount of first token
            amount_b: Amount of second token
            slippage: Maximum slippage tolerance (default 0.5%)
            
        Returns:
            Transaction execution result
        """
        if not has_sui_sdk:
            raise Exception("Sui SDK is required for executing transactions")
        
        if not self.private_key:
            raise Exception("Private key is required for executing transactions")
        
        # Get token addresses from symbols
        token_a_address = self.tokens.get(token_a.upper())
        token_b_address = self.tokens.get(token_b.upper())
        
        if not token_a_address or not token_b_address:
            raise ValueError(f"Unknown token symbol: {token_a if not token_a_address else token_b}")
        
        # Build transaction data
        data = {
            "senderAddress": self.address,
            "tokenA": token_a_address,
            "tokenB": token_b_address,
            "amountA": str(amount_a),
            "amountB": str(amount_b),
            "slippage": slippage
        }
        
        # Build the transaction
        tx_data = await self._make_api_request("/transactions/addLiquidity", method="POST", data=data)
        
        # In a real implementation, this would execute the transaction using the Sui SDK
        # This is a simplified version for demonstration
        tx_bytes = tx_data.get("txBytes")
        
        # This is just a simulation for now
        return {
            "status": "success",
            "message": f"Simulated adding liquidity: {amount_a} {token_a} and {amount_b} {token_b}",
            "digest": "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
    
    async def remove_liquidity(self, position_id: str, percentage: float = 1.0, 
                             slippage: float = 0.005) -> Dict[str, Any]:
        """
        Remove liquidity from a pool
        
        Args:
            position_id: ID of the liquidity position
            percentage: Percentage of liquidity to remove (0.0-1.0)
            slippage: Maximum slippage tolerance (default 0.5%)
            
        Returns:
            Transaction execution result
        """
        if not has_sui_sdk:
            raise Exception("Sui SDK is required for executing transactions")
        
        if not self.private_key:
            raise Exception("Private key is required for executing transactions")
        
        # Build transaction data
        data = {
            "senderAddress": self.address,
            "positionId": position_id,
            "percentage": percentage,
            "slippage": slippage
        }
        
        # Build the transaction
        tx_data = await self._make_api_request("/transactions/removeLiquidity", method="POST", data=data)
        
        # In a real implementation, this would execute the transaction using the Sui SDK
        # This is a simplified version for demonstration
        tx_bytes = tx_data.get("txBytes")
        
        # This is just a simulation for now
        return {
            "status": "success",
            "message": f"Simulated removing {percentage*100}% liquidity from position {position_id}",
            "digest": "0x0000000000000000000000000000000000000000000000000000000000000000"
        }

    async def get_transaction_status(self, digest: str) -> Dict[str, Any]:
        """
        Get the status of a transaction
        
        Args:
            digest: Transaction digest
            
        Returns:
            Transaction status information
        """
        return await self._make_api_request(f"/transactions/{digest}")
    
    async def get_market_data(self) -> Dict[str, Any]:
        """
        Get market data for all pools
        
        Returns:
            Market data information
        """
        return await self._make_api_request("/market")
    
    async def get_token_market_data(self, token_symbol: str) -> Dict[str, Any]:
        """
        Get market data for a specific token
        
        Args:
            token_symbol: Token symbol (e.g., "SUI")
            
        Returns:
            Token market data
        """
        return await self._make_api_request(f"/market/tokens/{token_symbol}")
    
    async def get_historical_prices(self, token_symbol: str, 
                                  timeframe: str = "1d") -> List[Dict[str, Any]]:
        """
        Get historical price data for a token
        
        Args:
            token_symbol: Token symbol (e.g., "SUI")
            timeframe: Timeframe for data points (1h, 1d, 7d, 30d)
            
        Returns:
            Historical price data
        """
        response = await self._make_api_request(f"/market/tokens/{token_symbol}/history", 
                                              params={"timeframe": timeframe})
        return response.get("history", [])
