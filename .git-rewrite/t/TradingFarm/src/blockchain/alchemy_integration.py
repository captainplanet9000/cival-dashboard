"""
Alchemy API integration for TradingFarm with ElizaOS
Provides multi-chain blockchain interaction capabilities
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional, Union
from web3 import Web3
from alchemy_web3 import AlchemyWeb3, AlchemyHTTPProvider

logger = logging.getLogger(__name__)

# Supported blockchain networks
SUPPORTED_NETWORKS = {
    "ethereum": {
        "mainnet": "https://eth-mainnet.g.alchemy.com/v2/",
        "goerli": "https://eth-goerli.g.alchemy.com/v2/",
        "sepolia": "https://eth-sepolia.g.alchemy.com/v2/",
    },
    "polygon": {
        "mainnet": "https://polygon-mainnet.g.alchemy.com/v2/",
        "mumbai": "https://polygon-mumbai.g.alchemy.com/v2/",
    },
    "arbitrum": {
        "mainnet": "https://arb-mainnet.g.alchemy.com/v2/",
        "goerli": "https://arb-goerli.g.alchemy.com/v2/",
    },
    "optimism": {
        "mainnet": "https://opt-mainnet.g.alchemy.com/v2/",
        "goerli": "https://opt-goerli.g.alchemy.com/v2/",
    },
    "base": {
        "mainnet": "https://base-mainnet.g.alchemy.com/v2/",
        "goerli": "https://base-goerli.g.alchemy.com/v2/",
    }
}

class AlchemyIntegration:
    """
    Alchemy API integration for blockchain interaction
    
    Provides:
    - Multi-chain support
    - Token data and analytics
    - NFT capabilities
    - Transaction monitoring
    - Enhanced wallet management
    """
    
    def __init__(
        self,
        api_key: str = None,
        network: str = "ethereum",
        network_type: str = "mainnet",
        config_path: str = None
    ):
        """
        Initialize Alchemy integration
        
        Args:
            api_key: Alchemy API key
            network: Blockchain network (ethereum, polygon, arbitrum, etc.)
            network_type: Network type (mainnet, testnet, etc.)
            config_path: Path to configuration file with API keys
        """
        self.api_key = api_key
        self.network = network.lower()
        self.network_type = network_type.lower()
        
        # Load API key from config if not provided
        if not self.api_key and config_path:
            self._load_config(config_path)
        
        # Validate network
        if self.network not in SUPPORTED_NETWORKS:
            supported = ", ".join(SUPPORTED_NETWORKS.keys())
            raise ValueError(f"Unsupported network: {network}. Supported networks: {supported}")
        
        # Validate network type
        if self.network_type not in SUPPORTED_NETWORKS[self.network]:
            supported = ", ".join(SUPPORTED_NETWORKS[self.network].keys())
            raise ValueError(f"Unsupported network type: {network_type}. Supported types: {supported}")
        
        # Initialize Alchemy provider
        self.provider_url = f"{SUPPORTED_NETWORKS[self.network][self.network_type]}{self.api_key}"
        self.alchemy = AlchemyWeb3(AlchemyHTTPProvider(self.provider_url))
        
        logger.info(f"Initialized Alchemy integration for {self.network} {self.network_type}")

    def _load_config(self, config_path: str) -> None:
        """Load configuration from file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            self.api_key = config.get("alchemy_api_key")
            if not self.api_key:
                raise ValueError("No Alchemy API key found in config file")
        except Exception as e:
            logger.error(f"Error loading config: {str(e)}")
            raise

    def get_token_balances(self, address: str) -> List[Dict[str, Any]]:
        """
        Get token balances for an address
        
        Args:
            address: Wallet address to check
            
        Returns:
            List of token balances
        """
        try:
            # Use Alchemy Token API
            result = self.alchemy.alchemy.getTokenBalances(address)
            
            # Format the response
            tokens = []
            for token in result.get("tokenBalances", []):
                contract_address = token.get("contractAddress")
                
                # Get token metadata
                metadata = self.alchemy.alchemy.getTokenMetadata(contract_address)
                
                # Calculate token balance
                balance = int(token.get("tokenBalance", "0"), 16)
                if metadata.get("decimals"):
                    balance = balance / (10 ** metadata.get("decimals"))
                
                tokens.append({
                    "contract_address": contract_address,
                    "name": metadata.get("name", "Unknown Token"),
                    "symbol": metadata.get("symbol", "UNKNOWN"),
                    "decimals": metadata.get("decimals", 18),
                    "balance": balance,
                    "logo": metadata.get("logo", None)
                })
                
            return tokens
        except Exception as e:
            logger.error(f"Error getting token balances: {str(e)}")
            return []

    def get_native_balance(self, address: str) -> float:
        """
        Get native token balance (ETH, MATIC, etc.)
        
        Args:
            address: Wallet address to check
            
        Returns:
            Native token balance in decimal form
        """
        try:
            balance_wei = self.alchemy.eth.get_balance(address)
            balance = self.alchemy.from_wei(balance_wei, 'ether')
            return float(balance)
        except Exception as e:
            logger.error(f"Error getting native balance: {str(e)}")
            return 0.0

    def get_token_price(self, token_address: str) -> Optional[float]:
        """
        Get current price of a token
        Uses Alchemy Token API
        
        Args:
            token_address: Contract address of the token
            
        Returns:
            Current price in USD or None if not available
        """
        try:
            # This is a placeholder - Alchemy doesn't have a direct price API
            # In a real implementation, you would use an additional price oracle
            # or the Alchemy Transfers API to get the latest swap price
            
            # For demonstration, we'll return a mock price
            # In production, integrate with a price oracle like CoinGecko or Chainlink
            return None
        except Exception as e:
            logger.error(f"Error getting token price: {str(e)}")
            return None

    def get_transaction_history(self, address: str, page_size: int = 100) -> List[Dict[str, Any]]:
        """
        Get transaction history for an address
        Uses Alchemy Transfers API
        
        Args:
            address: Wallet address
            page_size: Number of transactions to retrieve
            
        Returns:
            List of transactions
        """
        try:
            # Get transactions using the Transfers API
            params = {
                "fromAddress": address,
                "category": ["external", "internal", "erc20", "erc721", "erc1155"],
                "maxCount": page_size
            }
            
            result = self.alchemy.alchemy.core.get_asset_transfers(params)
            
            # Format the response
            transactions = []
            for tx in result.get("transfers", []):
                transactions.append({
                    "hash": tx.get("hash"),
                    "from_address": tx.get("from"),
                    "to_address": tx.get("to"),
                    "value": tx.get("value"),
                    "asset": tx.get("asset"),
                    "category": tx.get("category"),
                    "timestamp": tx.get("metadata", {}).get("blockTimestamp")
                })
                
            return transactions
        except Exception as e:
            logger.error(f"Error getting transaction history: {str(e)}")
            return []

    def get_nft_balance(self, address: str) -> List[Dict[str, Any]]:
        """
        Get NFTs owned by an address
        Uses Alchemy NFT API
        
        Args:
            address: Wallet address
            
        Returns:
            List of NFTs owned by the address
        """
        try:
            # Get NFTs using the NFT API
            nfts = self.alchemy.alchemy.nft.get_nfts_for_owner(address)
            
            # Format the response
            results = []
            for nft in nfts.get("ownedNfts", []):
                results.append({
                    "contract_address": nft.get("contract", {}).get("address"),
                    "token_id": nft.get("id", {}).get("tokenId"),
                    "name": nft.get("title", "Unknown NFT"),
                    "description": nft.get("description", ""),
                    "image_url": nft.get("media", [{}])[0].get("gateway", "") if nft.get("media") else "",
                    "collection": nft.get("contract", {}).get("name", "Unknown Collection")
                })
                
            return results
        except Exception as e:
            logger.error(f"Error getting NFT balance: {str(e)}")
            return []

    def send_transaction(
        self, 
        private_key: str, 
        to_address: str, 
        value: float, 
        gas_price: Optional[int] = None,
        gas_limit: int = 21000,
        data: str = ""
    ) -> Optional[str]:
        """
        Send a transaction
        Uses Alchemy Transact API for faster transaction processing
        
        Args:
            private_key: Private key of the sender
            to_address: Recipient address
            value: Amount to send in ETH/MATIC/etc.
            gas_price: Gas price in wei (if None, estimated)
            gas_limit: Gas limit
            data: Transaction data (for contract interactions)
            
        Returns:
            Transaction hash if successful, None otherwise
        """
        try:
            # Create account from private key
            account = self.alchemy.eth.account.from_key(private_key)
            from_address = account.address
            
            # Convert ETH to Wei
            value_wei = self.alchemy.to_wei(value, 'ether')
            
            # Get gas price if not provided
            if gas_price is None:
                gas_price = self.alchemy.eth.gas_price
            
            # Get nonce
            nonce = self.alchemy.eth.get_transaction_count(from_address)
            
            # Build transaction
            tx = {
                'nonce': nonce,
                'to': to_address,
                'value': value_wei,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'data': data
            }
            
            # Sign transaction
            signed_tx = self.alchemy.eth.account.sign_transaction(tx, private_key)
            
            # Send transaction
            tx_hash = self.alchemy.eth.send_raw_transaction(signed_tx.rawTransaction)
            return self.alchemy.to_hex(tx_hash)
        except Exception as e:
            logger.error(f"Error sending transaction: {str(e)}")
            return None

    def is_contract(self, address: str) -> bool:
        """
        Check if an address is a contract
        
        Args:
            address: Address to check
            
        Returns:
            True if the address is a contract, False otherwise
        """
        try:
            code = self.alchemy.eth.get_code(address)
            return code != "0x"
        except Exception as e:
            logger.error(f"Error checking if address is contract: {str(e)}")
            return False
            
    def get_gas_price(self) -> Dict[str, int]:
        """
        Get current gas prices
        
        Returns:
            Dictionary with gas price information
        """
        try:
            # Get current gas price
            gas_price = self.alchemy.eth.gas_price
            
            # For networks with EIP-1559, get fee history
            try:
                fee_history = self.alchemy.eth.fee_history(1, 'latest', [25, 50, 75])
                base_fee = fee_history.base_fee_per_gas[-1]
                priority_fees = {
                    "slow": fee_history.reward[0][0],
                    "average": fee_history.reward[0][1],
                    "fast": fee_history.reward[0][2]
                }
                
                return {
                    "gas_price": gas_price,
                    "base_fee": base_fee,
                    "priority_fees": priority_fees,
                    "max_fee_slow": base_fee + priority_fees["slow"],
                    "max_fee_average": base_fee + priority_fees["average"],
                    "max_fee_fast": base_fee + priority_fees["fast"]
                }
            except:
                # Fallback for networks without EIP-1559
                return {
                    "gas_price": gas_price,
                    "slow": int(gas_price * 0.9),
                    "average": gas_price,
                    "fast": int(gas_price * 1.2)
                }
        except Exception as e:
            logger.error(f"Error getting gas prices: {str(e)}")
            return {"gas_price": 0}
