"""
External API integration module for the Trading Farm Platform.

This module provides functions to interact with various external APIs
and blockchain protocols, including exchanges, DEXes, and data providers.
"""

import asyncio
import base64
import hmac
import hashlib
import json
import time
import urllib.parse
from typing import Dict, List, Any, Optional, Union, Tuple
import logging
import os
from datetime import datetime, timedelta

import httpx
from web3 import Web3, HTTPProvider

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API Integration Classes
class ExchangeAPI:
    """Base class for exchange API integrations."""
    
    def __init__(self, api_key: str, api_secret: str, passphrase: Optional[str] = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        self.base_url = ""
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def get_account_balance(self) -> Dict[str, Any]:
        """Get account balance information."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def place_order(self, 
                         symbol: str, 
                         side: str, 
                         order_type: str, 
                         quantity: float, 
                         price: Optional[float] = None) -> Dict[str, Any]:
        """Place an order on the exchange."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get open orders."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def cancel_order(self, order_id: str, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Cancel an open order."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_order_history(self, 
                               symbol: Optional[str] = None, 
                               limit: int = 50) -> List[Dict[str, Any]]:
        """Get order history."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_deposit_history(self, 
                                 asset: Optional[str] = None, 
                                 status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get deposit history."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_withdrawal_history(self, 
                                    asset: Optional[str] = None, 
                                    status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get withdrawal history."""
        raise NotImplementedError("Subclasses must implement this method")

class BinanceAPI(ExchangeAPI):
    """Binance exchange API integration."""
    
    def __init__(self, api_key: str, api_secret: str):
        super().__init__(api_key, api_secret)
        self.base_url = "https://api.binance.com"
    
    def _generate_signature(self, data: Dict[str, Any]) -> str:
        """Generate HMAC signature for Binance API."""
        query_string = urllib.parse.urlencode(data)
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def _request(self, 
                      method: str, 
                      endpoint: str, 
                      params: Optional[Dict[str, Any]] = None, 
                      signed: bool = False) -> Any:
        """Make a request to the Binance API."""
        url = f"{self.base_url}{endpoint}"
        headers = {"X-MBX-APIKEY": self.api_key}
        
        if params is None:
            params = {}
        
        if signed:
            params['timestamp'] = int(time.time() * 1000)
            params['signature'] = self._generate_signature(params)
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, params=params, headers=headers)
            elif method.upper() == "POST":
                response = await self.client.post(url, params=params, headers=headers)
            elif method.upper() == "DELETE":
                response = await self.client.delete(url, params=params, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error making request to Binance API: {str(e)}")
            raise
    
    async def get_account_balance(self) -> Dict[str, Any]:
        """Get account balance information from Binance."""
        response = await self._request("GET", "/api/v3/account", signed=True)
        balances = response.get("balances", [])
        # Filter out zero balances
        filtered_balances = [
            {
                "asset": balance["asset"],
                "free": float(balance["free"]),
                "locked": float(balance["locked"]),
                "total": float(balance["free"]) + float(balance["locked"])
            }
            for balance in balances
            if float(balance["free"]) > 0 or float(balance["locked"]) > 0
        ]
        return {"balances": filtered_balances}
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol from Binance."""
        return await self._request("GET", "/api/v3/ticker/24hr", {"symbol": symbol})
    
    async def place_order(self, 
                         symbol: str, 
                         side: str, 
                         order_type: str, 
                         quantity: float, 
                         price: Optional[float] = None) -> Dict[str, Any]:
        """Place an order on Binance."""
        params = {
            "symbol": symbol,
            "side": side.upper(),
            "type": order_type.upper(),
            "quantity": quantity
        }
        
        if price is not None and order_type.upper() != "MARKET":
            params["price"] = price
            
        if order_type.upper() == "MARKET":
            params["newOrderRespType"] = "FULL"
            
        return await self._request("POST", "/api/v3/order", params, signed=True)
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get open orders from Binance."""
        params = {}
        if symbol:
            params["symbol"] = symbol
        return await self._request("GET", "/api/v3/openOrders", params, signed=True)
    
    async def cancel_order(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """Cancel an open order on Binance."""
        params = {
            "symbol": symbol,
            "orderId": order_id
        }
        return await self._request("DELETE", "/api/v3/order", params, signed=True)
    
    async def get_order_history(self, 
                               symbol: Optional[str] = None, 
                               limit: int = 50) -> List[Dict[str, Any]]:
        """Get order history from Binance."""
        params = {"limit": limit}
        if symbol:
            params["symbol"] = symbol
        return await self._request("GET", "/api/v3/allOrders", params, signed=True)
    
    async def get_deposit_history(self, 
                                 asset: Optional[str] = None, 
                                 status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get deposit history from Binance."""
        params = {}
        if asset:
            params["coin"] = asset
        if status:
            params["status"] = status
        results = await self._request("GET", "/sapi/v1/capital/deposit/hisrec", params, signed=True)
        return results
    
    async def get_withdrawal_history(self, 
                                    asset: Optional[str] = None, 
                                    status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get withdrawal history from Binance."""
        params = {}
        if asset:
            params["coin"] = asset
        if status:
            params["status"] = status
        results = await self._request("GET", "/sapi/v1/capital/withdraw/history", params, signed=True)
        return results

class CoinbaseAPI(ExchangeAPI):
    """Coinbase Pro exchange API integration."""
    
    def __init__(self, api_key: str, api_secret: str, passphrase: str):
        super().__init__(api_key, api_secret, passphrase)
        self.base_url = "https://api.exchange.coinbase.com"
    
    def _generate_signature(self, timestamp: str, method: str, request_path: str, body: str = "") -> Tuple[str, str]:
        """Generate HMAC signature for Coinbase API."""
        message = timestamp + method.upper() + request_path + body
        hmac_key = base64.b64decode(self.api_secret)
        signature = hmac.new(hmac_key, message.encode('utf-8'), hashlib.sha256)
        signature_b64 = base64.b64encode(signature.digest()).decode('utf-8')
        return signature_b64, message
    
    async def _request(self, 
                      method: str, 
                      endpoint: str, 
                      params: Optional[Dict[str, Any]] = None, 
                      data: Optional[Dict[str, Any]] = None) -> Any:
        """Make a request to the Coinbase API."""
        url = f"{self.base_url}{endpoint}"
        timestamp = str(int(time.time()))
        
        # Combine endpoint with query string for signature
        request_path = endpoint
        if params and method.upper() == "GET":
            query_string = urllib.parse.urlencode(params)
            request_path = f"{endpoint}?{query_string}"
        
        body = ""
        if data:
            body = json.dumps(data)
        
        signature, _ = self._generate_signature(timestamp, method, request_path, body)
        
        headers = {
            "CB-ACCESS-KEY": self.api_key,
            "CB-ACCESS-SIGN": signature,
            "CB-ACCESS-TIMESTAMP": timestamp,
            "CB-ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json"
        }
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, params=params, headers=headers)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = await self.client.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error making request to Coinbase API: {str(e)}")
            raise
    
    async def get_account_balance(self) -> Dict[str, Any]:
        """Get account balance information from Coinbase."""
        accounts = await self._request("GET", "/accounts")
        filtered_accounts = [
            {
                "asset": account["currency"],
                "free": float(account["available"]),
                "locked": float(account["hold"]),
                "total": float(account["balance"])
            }
            for account in accounts
            if float(account["balance"]) > 0
        ]
        return {"balances": filtered_accounts}
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol from Coinbase."""
        return await self._request("GET", f"/products/{symbol}/ticker")
    
    # Implement other methods similar to Binance with Coinbase-specific endpoints and parameters

# Blockchain API Classes
class BlockchainAPI:
    """Base class for blockchain API integrations."""
    
    def __init__(self, rpc_url: str):
        self.rpc_url = rpc_url
        self.web3 = Web3(HTTPProvider(rpc_url))
    
    async def get_balance(self, address: str) -> Dict[str, float]:
        """Get balance for an address."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Get transaction details."""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def send_transaction(self, private_key: str, to_address: str, amount: float, gas_price: Optional[float] = None) -> str:
        """Send a transaction."""
        raise NotImplementedError("Subclasses must implement this method")

class EthereumAPI(BlockchainAPI):
    """Ethereum blockchain API integration."""
    
    async def get_balance(self, address: str) -> Dict[str, float]:
        """Get ETH balance for an address."""
        try:
            balance_wei = self.web3.eth.get_balance(address)
            balance_eth = self.web3.from_wei(balance_wei, 'ether')
            return {
                "address": address,
                "balance_wei": balance_wei,
                "balance_eth": float(balance_eth),
                "symbol": "ETH"
            }
        except Exception as e:
            logger.error(f"Error getting ETH balance: {str(e)}")
            raise
    
    async def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Get Ethereum transaction details."""
        try:
            tx = self.web3.eth.get_transaction(tx_hash)
            receipt = self.web3.eth.get_transaction_receipt(tx_hash)
            
            # Convert to a serializable format
            result = {
                "hash": tx_hash,
                "blockNumber": tx.blockNumber,
                "from": tx["from"],
                "to": tx["to"],
                "value": float(self.web3.from_wei(tx.value, 'ether')),
                "status": receipt.status,
                "gasUsed": receipt.gasUsed,
                "timestamp": None  # Will be populated below
            }
            
            # Get block to extract timestamp
            block = self.web3.eth.get_block(tx.blockNumber)
            result["timestamp"] = block.timestamp
            
            return result
        except Exception as e:
            logger.error(f"Error getting transaction: {str(e)}")
            raise
    
    async def send_transaction(self, private_key: str, to_address: str, amount: float, gas_price: Optional[float] = None) -> str:
        """Send an Ethereum transaction."""
        try:
            account = self.web3.eth.account.from_key(private_key)
            from_address = account.address
            
            # Convert amount to wei
            amount_wei = self.web3.to_wei(amount, 'ether')
            
            # Prepare transaction
            tx_params = {
                'from': from_address,
                'to': to_address,
                'value': amount_wei,
                'nonce': self.web3.eth.get_transaction_count(from_address),
                'gas': 21000,  # Standard ETH transfer gas
            }
            
            # Set gas price if provided
            if gas_price:
                tx_params['gasPrice'] = self.web3.to_wei(gas_price, 'gwei')
            else:
                tx_params['gasPrice'] = self.web3.eth.gas_price
            
            # Sign and send transaction
            signed_tx = self.web3.eth.account.sign_transaction(tx_params, private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            return tx_hash.hex()
        except Exception as e:
            logger.error(f"Error sending transaction: {str(e)}")
            raise

# Token specific functions (ERC20, etc.)
class ERC20Token:
    """ERC20 token interaction class."""
    
    def __init__(self, web3: Web3, contract_address: str, abi: List[Dict[str, Any]]):
        self.web3 = web3
        self.contract_address = contract_address
        self.contract = web3.eth.contract(address=contract_address, abi=abi)
    
    async def get_balance(self, address: str) -> Dict[str, Any]:
        """Get token balance for an address."""
        try:
            balance = self.contract.functions.balanceOf(address).call()
            decimals = self.contract.functions.decimals().call()
            symbol = self.contract.functions.symbol().call()
            name = self.contract.functions.name().call()
            
            balance_formatted = balance / (10 ** decimals)
            
            return {
                "address": address,
                "token_address": self.contract_address,
                "token_name": name,
                "symbol": symbol,
                "balance_raw": balance,
                "balance": balance_formatted,
                "decimals": decimals
            }
        except Exception as e:
            logger.error(f"Error getting token balance: {str(e)}")
            raise
    
    async def transfer(self, private_key: str, to_address: str, amount: float, gas_price: Optional[float] = None) -> str:
        """Transfer tokens to an address."""
        try:
            account = self.web3.eth.account.from_key(private_key)
            from_address = account.address
            
            # Get token decimals
            decimals = self.contract.functions.decimals().call()
            
            # Convert amount to token units
            amount_in_units = int(amount * (10 ** decimals))
            
            # Prepare transaction
            tx_params = {
                'from': from_address,
                'nonce': self.web3.eth.get_transaction_count(from_address),
            }
            
            # Set gas price if provided
            if gas_price:
                tx_params['gasPrice'] = self.web3.to_wei(gas_price, 'gwei')
            else:
                tx_params['gasPrice'] = self.web3.eth.gas_price
            
            # Estimate gas
            tx_params['gas'] = self.contract.functions.transfer(
                to_address, amount_in_units
            ).estimate_gas(tx_params)
            
            # Build transaction
            transaction = self.contract.functions.transfer(
                to_address, amount_in_units
            ).build_transaction(tx_params)
            
            # Sign and send transaction
            signed_tx = self.web3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            return tx_hash.hex()
        except Exception as e:
            logger.error(f"Error transferring tokens: {str(e)}")
            raise

# Factory functions to create API instances
def create_exchange_api(exchange_name: str, credentials: Dict[str, str]) -> ExchangeAPI:
    """Create an instance of the appropriate exchange API based on the exchange name."""
    if exchange_name.lower() == "binance":
        if "api_key" not in credentials or "api_secret" not in credentials:
            raise ValueError("Binance API requires api_key and api_secret")
        return BinanceAPI(credentials["api_key"], credentials["api_secret"])
    elif exchange_name.lower() == "coinbase":
        if "api_key" not in credentials or "api_secret" not in credentials or "passphrase" not in credentials:
            raise ValueError("Coinbase API requires api_key, api_secret, and passphrase")
        return CoinbaseAPI(credentials["api_key"], credentials["api_secret"], credentials["passphrase"])
    else:
        raise ValueError(f"Unsupported exchange: {exchange_name}")

def create_blockchain_api(blockchain_name: str, rpc_url: str) -> BlockchainAPI:
    """Create an instance of the appropriate blockchain API based on the blockchain name."""
    if blockchain_name.lower() in ["ethereum", "eth"]:
        return EthereumAPI(rpc_url)
    # Add more blockchain implementations as needed
    else:
        raise ValueError(f"Unsupported blockchain: {blockchain_name}")

# Helper functions for multi-exchange operations
async def get_balances_from_multiple_exchanges(exchange_apis: List[ExchangeAPI]) -> Dict[str, Any]:
    """Get balances from multiple exchanges and combine them."""
    try:
        balances_by_exchange = {}
        aggregated_balances = {}
        
        # Fetch balances from all exchanges
        for api in exchange_apis:
            exchange_name = api.__class__.__name__.replace('API', '')
            balances = await api.get_account_balance()
            balances_by_exchange[exchange_name] = balances["balances"]
            
            # Aggregate balances by asset
            for balance in balances["balances"]:
                asset = balance["asset"]
                if asset not in aggregated_balances:
                    aggregated_balances[asset] = {
                        "asset": asset,
                        "total": 0.0,
                        "exchanges": {}
                    }
                aggregated_balances[asset]["total"] += balance["total"]
                aggregated_balances[asset]["exchanges"][exchange_name] = balance["total"]
        
        return {
            "by_exchange": balances_by_exchange,
            "by_asset": list(aggregated_balances.values())
        }
    except Exception as e:
        logger.error(f"Error getting balances from multiple exchanges: {str(e)}")
        raise

# Example usage:
async def example_usage():
    # Example credentials - these would come from a secure storage in production
    binance_creds = {
        "api_key": "your_binance_api_key",
        "api_secret": "your_binance_api_secret"
    }
    
    coinbase_creds = {
        "api_key": "your_coinbase_api_key",
        "api_secret": "your_coinbase_api_secret",
        "passphrase": "your_coinbase_passphrase"
    }
    
    # Create exchange API instances
    binance_api = create_exchange_api("binance", binance_creds)
    coinbase_api = create_exchange_api("coinbase", coinbase_creds)
    
    try:
        # Get balances from both exchanges
        all_balances = await get_balances_from_multiple_exchanges([binance_api, coinbase_api])
        print("Balances by exchange:", all_balances["by_exchange"])
        print("Balances by asset:", all_balances["by_asset"])
        
        # Get ETH balance from blockchain
        eth_api = create_blockchain_api("ethereum", "https://eth-mainnet.alchemyapi.io/v2/your_api_key")
        eth_balance = await eth_api.get_balance("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
        print("ETH balance:", eth_balance)
        
    finally:
        # Always close clients
        await binance_api.close()
        await coinbase_api.close()

if __name__ == "__main__":
    # Run example usage
    asyncio.run(example_usage()) 