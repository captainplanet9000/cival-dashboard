"""
Enhanced wallet management system for ElizaOS agents with Alchemy integration
Supports multi-chain wallets, NFTs, and real-time monitoring
"""
import os
import json
import time
import logging
import uuid
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from datetime import datetime
from eth_account import Account
from eth_account.signers.local import LocalAccount
import secrets

from ..blockchain.alchemy_integration import AlchemyIntegration, SUPPORTED_NETWORKS

logger = logging.getLogger(__name__)

# Load environment variables
DEFAULT_CONFIG_PATH = os.getenv("ALCHEMY_CONFIG_PATH", "config/alchemy_config.json")

class EnhancedWalletManager:
    """
    Enhanced wallet manager for ElizaOS agents with Alchemy integration
    
    Features:
    - Multi-chain wallet support (Ethereum, Polygon, Arbitrum, etc.)
    - Real-time balance monitoring
    - Token analytics
    - Transaction history
    - NFT management
    - Enhanced security
    """
    
    def __init__(
        self, 
        wallet_dir: str = "data/eliza_wallets",
        config_path: str = DEFAULT_CONFIG_PATH,
        default_network: str = "ethereum",
        default_network_type: str = "goerli"  # Using testnet by default for safety
    ):
        """
        Initialize the enhanced wallet manager
        
        Args:
            wallet_dir: Directory to store wallet files
            config_path: Path to Alchemy configuration file
            default_network: Default blockchain network
            default_network_type: Default network type (mainnet/testnet)
        """
        self.wallet_dir = wallet_dir
        self.config_path = config_path
        self.default_network = default_network
        self.default_network_type = default_network_type
        
        # Create wallet directory if it doesn't exist
        os.makedirs(self.wallet_dir, exist_ok=True)
        
        # Initialize Alchemy integrations for each network
        self.alchemy_integrations = {}
        
        # Try to initialize with config if it exists
        if os.path.exists(self.config_path):
            self._initialize_alchemy()
        else:
            logger.warning(f"Alchemy config not found at {self.config_path}")
            logger.warning("Creating a template config file - add your API keys to enable Alchemy features")
            self._create_template_config()
        
        logger.info(f"Enhanced wallet manager initialized with wallet directory: {self.wallet_dir}")
        
    def _initialize_alchemy(self):
        """Initialize Alchemy integrations for supported networks"""
        try:
            # Load config file
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Get Alchemy API keys
            api_keys = config.get("api_keys", {})
            
            # Initialize integrations for each network with an API key
            for network, networks_config in SUPPORTED_NETWORKS.items():
                api_key = api_keys.get(network)
                
                if api_key:
                    for network_type in networks_config.keys():
                        key = f"{network}:{network_type}"
                        self.alchemy_integrations[key] = AlchemyIntegration(
                            api_key=api_key,
                            network=network,
                            network_type=network_type
                        )
                        logger.info(f"Initialized Alchemy integration for {network} {network_type}")
            
            if not self.alchemy_integrations:
                logger.warning("No valid Alchemy API keys found in config")
        except Exception as e:
            logger.error(f"Error initializing Alchemy integrations: {str(e)}")
    
    def _create_template_config(self):
        """Create a template configuration file"""
        template = {
            "api_keys": {
                "ethereum": "YOUR_ETHEREUM_API_KEY",
                "polygon": "YOUR_POLYGON_API_KEY",
                "arbitrum": "YOUR_ARBITRUM_API_KEY",
                "optimism": "YOUR_OPTIMISM_API_KEY",
                "base": "YOUR_BASE_API_KEY"
            },
            "default_settings": {
                "network": self.default_network,
                "network_type": self.default_network_type
            }
        }
        
        try:
            # Create config directory if it doesn't exist
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            # Write template config
            with open(self.config_path, 'w') as f:
                json.dump(template, f, indent=4)
                
            logger.info(f"Created template Alchemy config at {self.config_path}")
        except Exception as e:
            logger.error(f"Error creating template config: {str(e)}")
    
    def _get_alchemy(self, network: str = None, network_type: str = None) -> Optional[AlchemyIntegration]:
        """
        Get Alchemy integration for specified network
        
        Args:
            network: Blockchain network
            network_type: Network type (mainnet/testnet)
            
        Returns:
            AlchemyIntegration instance or None if not available
        """
        network = network or self.default_network
        network_type = network_type or self.default_network_type
        
        key = f"{network}:{network_type}"
        return self.alchemy_integrations.get(key)
    
    def create_wallet(
        self, 
        name: str = None, 
        password: str = None,
        private_key: str = None,
        network: str = None,
        network_type: str = None
    ) -> Dict[str, Any]:
        """
        Create a new wallet or import existing wallet
        
        Args:
            name: Wallet name
            password: Optional password for encryption
            private_key: Optional private key for importing existing wallet
            network: Blockchain network
            network_type: Network type (mainnet/testnet)
            
        Returns:
            Wallet information
        """
        # Generate default name if not provided
        if not name:
            name = f"Wallet {int(time.time())}"
        
        # Generate or use provided private key
        if private_key:
            account = Account.from_key(private_key)
        else:
            # Generate a random private key
            private_key = "0x" + secrets.token_hex(32)
            account = Account.from_key(private_key)
        
        # Create wallet record
        wallet_id = str(uuid.uuid4())
        network = network or self.default_network
        network_type = network_type or self.default_network_type
        
        wallet_data = {
            "id": wallet_id,
            "name": name,
            "address": account.address,
            "private_key": private_key,  # Store securely in production
            "network": network,
            "network_type": network_type,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # In production, encrypt the private key with the password
        # This is a simplified example
        if password:
            # Here you would encrypt the private key using the password
            # For demonstration, we'll just note that it should be encrypted
            wallet_data["encrypted"] = True
            wallet_data["encryption_type"] = "password"
        else:
            wallet_data["encrypted"] = False
        
        # Save wallet to file
        wallet_path = os.path.join(self.wallet_dir, f"{wallet_id}.json")
        with open(wallet_path, 'w') as f:
            json.dump(wallet_data, f, indent=4)
        
        # Get wallet info (exclude private key from return)
        wallet_info = {
            "id": wallet_id,
            "name": name,
            "address": account.address,
            "network": network,
            "network_type": network_type,
            "created_at": wallet_data["created_at"]
        }
        
        logger.info(f"Created wallet: {wallet_id} - {name} ({account.address})")
        return wallet_info
    
    def list_wallets(self) -> List[Dict[str, Any]]:
        """
        List all wallets
        
        Returns:
            List of wallet information
        """
        wallets = []
        
        # Look for wallet files in wallet directory
        wallet_files = [f for f in os.listdir(self.wallet_dir) if f.endswith('.json')]
        
        for wallet_file in wallet_files:
            wallet_path = os.path.join(self.wallet_dir, wallet_file)
            try:
                with open(wallet_path, 'r') as f:
                    wallet_data = json.load(f)
                
                # Create wallet info (exclude private key)
                wallet_info = {
                    "id": wallet_data.get("id"),
                    "name": wallet_data.get("name"),
                    "address": wallet_data.get("address"),
                    "network": wallet_data.get("network", self.default_network),
                    "network_type": wallet_data.get("network_type", self.default_network_type),
                    "created_at": wallet_data.get("created_at")
                }
                
                # Get balance if Alchemy integration is available
                alchemy = self._get_alchemy(
                    network=wallet_data.get("network"),
                    network_type=wallet_data.get("network_type")
                )
                
                if alchemy:
                    native_balance = alchemy.get_native_balance(wallet_info["address"])
                    wallet_info["balance"] = native_balance
                    wallet_info["balance_updated_at"] = datetime.now().isoformat()
                
                wallets.append(wallet_info)
            except Exception as e:
                logger.error(f"Error reading wallet file {wallet_file}: {str(e)}")
        
        return wallets
    
    def get_wallet(self, wallet_id: str) -> Optional[Dict[str, Any]]:
        """
        Get wallet information
        
        Args:
            wallet_id: Wallet ID
            
        Returns:
            Wallet information or None if not found
        """
        wallet_path = os.path.join(self.wallet_dir, f"{wallet_id}.json")
        
        if not os.path.exists(wallet_path):
            logger.warning(f"Wallet not found: {wallet_id}")
            return None
        
        try:
            with open(wallet_path, 'r') as f:
                wallet_data = json.load(f)
            
            # Create wallet info (exclude private key)
            wallet_info = {
                "id": wallet_data.get("id"),
                "name": wallet_data.get("name"),
                "address": wallet_data.get("address"),
                "network": wallet_data.get("network", self.default_network),
                "network_type": wallet_data.get("network_type", self.default_network_type),
                "created_at": wallet_data.get("created_at")
            }
            
            # Get additional information if Alchemy is available
            alchemy = self._get_alchemy(
                network=wallet_data.get("network"),
                network_type=wallet_data.get("network_type")
            )
            
            if alchemy:
                # Get native token balance
                native_balance = alchemy.get_native_balance(wallet_info["address"])
                wallet_info["balance"] = native_balance
                
                # Get token balances
                token_balances = alchemy.get_token_balances(wallet_info["address"])
                wallet_info["tokens"] = token_balances
                
                # Get recent transactions (limited to 10 for performance)
                transactions = alchemy.get_transaction_history(wallet_info["address"], page_size=10)
                wallet_info["recent_transactions"] = transactions
                
                wallet_info["balance_updated_at"] = datetime.now().isoformat()
            
            return wallet_info
        except Exception as e:
            logger.error(f"Error getting wallet {wallet_id}: {str(e)}")
            return None
    
    def get_wallet_with_key(self, wallet_id: str, password: str = None) -> Optional[Dict[str, Any]]:
        """
        Get wallet with private key (for transaction signing)
        
        Args:
            wallet_id: Wallet ID
            password: Password for decryption if wallet is encrypted
            
        Returns:
            Wallet data including private key or None if not found/decryption fails
        """
        wallet_path = os.path.join(self.wallet_dir, f"{wallet_id}.json")
        
        if not os.path.exists(wallet_path):
            logger.warning(f"Wallet not found: {wallet_id}")
            return None
        
        try:
            with open(wallet_path, 'r') as f:
                wallet_data = json.load(f)
            
            # Check if wallet is encrypted and password is required
            if wallet_data.get("encrypted", False) and not password:
                logger.warning(f"Wallet {wallet_id} is encrypted and requires a password")
                return None
            
            # In production, decrypt the private key using the password
            # This is a simplified example
            if wallet_data.get("encrypted", False) and password:
                # Here you would decrypt the private key using the password
                # For demonstration, we'll assume the decryption is successful
                pass
            
            return wallet_data
        except Exception as e:
            logger.error(f"Error getting wallet with key {wallet_id}: {str(e)}")
            return None
    
    def assign_wallet_to_agent(self, wallet_id: str, agent_id: str) -> bool:
        """
        Assign a wallet to an agent
        
        Args:
            wallet_id: Wallet ID
            agent_id: Agent ID
            
        Returns:
            True if successful, False otherwise
        """
        # Check if wallet exists
        wallet = self.get_wallet(wallet_id)
        if not wallet:
            logger.warning(f"Cannot assign wallet {wallet_id} to agent {agent_id} - wallet not found")
            return False
        
        # Create agent wallet mapping file if it doesn't exist
        mappings_path = os.path.join(self.wallet_dir, "agent_wallet_mappings.json")
        
        if os.path.exists(mappings_path):
            with open(mappings_path, 'r') as f:
                mappings = json.load(f)
        else:
            mappings = {}
        
        # Update mapping
        mappings[agent_id] = wallet_id
        
        # Save mapping
        with open(mappings_path, 'w') as f:
            json.dump(mappings, f, indent=4)
        
        logger.info(f"Assigned wallet {wallet_id} to agent {agent_id}")
        return True
    
    def get_agent_wallet(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get wallet assigned to an agent
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Wallet information or None if not found
        """
        # Check if agent wallet mapping exists
        mappings_path = os.path.join(self.wallet_dir, "agent_wallet_mappings.json")
        
        if not os.path.exists(mappings_path):
            logger.warning(f"No wallet mappings found for agent {agent_id}")
            return None
        
        try:
            with open(mappings_path, 'r') as f:
                mappings = json.load(f)
            
            wallet_id = mappings.get(agent_id)
            if not wallet_id:
                logger.warning(f"No wallet assigned to agent {agent_id}")
                return None
            
            return self.get_wallet(wallet_id)
        except Exception as e:
            logger.error(f"Error getting agent wallet for {agent_id}: {str(e)}")
            return None
    
    def send_transaction(
        self,
        wallet_id: str,
        to_address: str,
        amount: float,
        password: str = None,
        token_address: str = None,
        network: str = None,
        network_type: str = None,
        gas_speed: str = "average"  # slow, average, fast
    ) -> Optional[str]:
        """
        Send a transaction from a wallet
        
        Args:
            wallet_id: Wallet ID
            to_address: Recipient address
            amount: Amount to send
            password: Password for wallet decryption if needed
            token_address: Token contract address (if sending tokens)
            network: Blockchain network (overrides wallet's network)
            network_type: Network type (overrides wallet's network type)
            gas_speed: Gas price strategy (slow, average, fast)
            
        Returns:
            Transaction hash if successful, None otherwise
        """
        # Get wallet with private key
        wallet_data = self.get_wallet_with_key(wallet_id, password)
        if not wallet_data:
            logger.error(f"Could not retrieve wallet {wallet_id} with key")
            return None
        
        # Determine which network to use
        network = network or wallet_data.get("network", self.default_network)
        network_type = network_type or wallet_data.get("network_type", self.default_network_type)
        
        # Get Alchemy integration
        alchemy = self._get_alchemy(network, network_type)
        if not alchemy:
            logger.error(f"No Alchemy integration available for {network} {network_type}")
            return None
        
        try:
            # Get gas price based on speed preference
            gas_prices = alchemy.get_gas_price()
            gas_price = gas_prices.get(gas_speed, gas_prices.get("average", gas_prices.get("gas_price")))
            
            # If sending native token (ETH, MATIC, etc.)
            if not token_address:
                tx_hash = alchemy.send_transaction(
                    private_key=wallet_data["private_key"],
                    to_address=to_address,
                    value=amount,
                    gas_price=gas_price
                )
                
                if tx_hash:
                    logger.info(f"Sent {amount} native tokens to {to_address}, tx: {tx_hash}")
                    return tx_hash
                else:
                    logger.error(f"Failed to send transaction from {wallet_id} to {to_address}")
                    return None
            else:
                # Token transfer functionality would go here
                # This would require creating a contract instance and calling transfer
                logger.warning("Token transfers not implemented yet")
                return None
        except Exception as e:
            logger.error(f"Error sending transaction: {str(e)}")
            return None
    
    def get_token_balances(self, wallet_id: str) -> List[Dict[str, Any]]:
        """
        Get token balances for a wallet
        
        Args:
            wallet_id: Wallet ID
            
        Returns:
            List of token balances
        """
        wallet = self.get_wallet(wallet_id)
        if not wallet:
            logger.warning(f"Wallet not found: {wallet_id}")
            return []
        
        alchemy = self._get_alchemy(
            network=wallet.get("network"),
            network_type=wallet.get("network_type")
        )
        
        if not alchemy:
            logger.warning(f"No Alchemy integration available for wallet {wallet_id}")
            return []
        
        try:
            return alchemy.get_token_balances(wallet["address"])
        except Exception as e:
            logger.error(f"Error getting token balances for {wallet_id}: {str(e)}")
            return []
    
    def get_nft_balances(self, wallet_id: str) -> List[Dict[str, Any]]:
        """
        Get NFT balances for a wallet
        
        Args:
            wallet_id: Wallet ID
            
        Returns:
            List of NFTs owned by the wallet
        """
        wallet = self.get_wallet(wallet_id)
        if not wallet:
            logger.warning(f"Wallet not found: {wallet_id}")
            return []
        
        alchemy = self._get_alchemy(
            network=wallet.get("network"),
            network_type=wallet.get("network_type")
        )
        
        if not alchemy:
            logger.warning(f"No Alchemy integration available for wallet {wallet_id}")
            return []
        
        try:
            return alchemy.get_nft_balance(wallet["address"])
        except Exception as e:
            logger.error(f"Error getting NFT balances for {wallet_id}: {str(e)}")
            return []
    
    def get_transaction_history(self, wallet_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get transaction history for a wallet
        
        Args:
            wallet_id: Wallet ID
            limit: Maximum number of transactions to retrieve
            
        Returns:
            List of transactions
        """
        wallet = self.get_wallet(wallet_id)
        if not wallet:
            logger.warning(f"Wallet not found: {wallet_id}")
            return []
        
        alchemy = self._get_alchemy(
            network=wallet.get("network"),
            network_type=wallet.get("network_type")
        )
        
        if not alchemy:
            logger.warning(f"No Alchemy integration available for wallet {wallet_id}")
            return []
        
        try:
            return alchemy.get_transaction_history(wallet["address"], page_size=limit)
        except Exception as e:
            logger.error(f"Error getting transaction history for {wallet_id}: {str(e)}")
            return []
