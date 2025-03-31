"""
Wallet management for ElizaOS trading agents.
"""
import os
import json
import uuid
import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import eth_account
from eth_account.signers.local import LocalAccount
from web3 import Web3

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ElizaWalletManager:
    """
    Manages wallets for ElizaOS trading agents.
    Each agent can have its own wallet or share wallets with other agents.
    """
    
    def __init__(self, wallets_path: str = "data/eliza_wallets"):
        """
        Initialize wallet manager.
        
        Args:
            wallets_path: Path to wallet storage directory
        """
        self.wallets_path = wallets_path
        self.wallets: Dict[str, Dict[str, Any]] = {}
        self.agent_wallets: Dict[str, str] = {}  # Maps agent_id to wallet_id
        
        # Ensure wallets directory exists
        os.makedirs(self.wallets_path, exist_ok=True)
        
        # Load existing wallets
        self._load_wallets()
        
    def _load_wallets(self):
        """Load existing wallets from storage."""
        wallet_file = os.path.join(self.wallets_path, "wallets.json")
        agent_wallet_file = os.path.join(self.wallets_path, "agent_wallets.json")
        
        if os.path.exists(wallet_file):
            try:
                with open(wallet_file, "r") as f:
                    self.wallets = json.load(f)
            except Exception as e:
                logger.error(f"Error loading wallets: {str(e)}")
                
        if os.path.exists(agent_wallet_file):
            try:
                with open(agent_wallet_file, "r") as f:
                    self.agent_wallets = json.load(f)
            except Exception as e:
                logger.error(f"Error loading agent wallet mappings: {str(e)}")
                
    def _save_wallets(self):
        """Save wallets to storage."""
        wallet_file = os.path.join(self.wallets_path, "wallets.json")
        agent_wallet_file = os.path.join(self.wallets_path, "agent_wallets.json")
        
        try:
            with open(wallet_file, "w") as f:
                json.dump(self.wallets, f, indent=2)
                
            with open(agent_wallet_file, "w") as f:
                json.dump(self.agent_wallets, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving wallets: {str(e)}")
    
    def create_wallet(self, name: str, password: Optional[str] = None) -> str:
        """
        Create a new wallet for an agent.
        
        Args:
            name: Human-readable name for the wallet
            password: Optional password to encrypt the private key
            
        Returns:
            wallet_id: ID of the created wallet
        """
        # Generate new Ethereum account
        account: LocalAccount = eth_account.Account.create()
        
        # Generate wallet ID
        wallet_id = str(uuid.uuid4())
        
        # Store wallet information
        now = datetime.now().isoformat()
        self.wallets[wallet_id] = {
            "id": wallet_id,
            "name": name,
            "address": account.address,
            "created_at": now,
            "updated_at": now,
            "encrypted_private_key": account.key.hex(),  # In a real implementation, this would be encrypted
            "balance": "0.0"
        }
        
        # Save wallets to storage
        self._save_wallets()
        
        return wallet_id
    
    def assign_wallet_to_agent(self, agent_id: str, wallet_id: str) -> bool:
        """
        Assign a wallet to an agent.
        
        Args:
            agent_id: ID of the agent
            wallet_id: ID of the wallet
            
        Returns:
            bool: True if successful, False otherwise
        """
        if wallet_id not in self.wallets:
            logger.error(f"Wallet {wallet_id} does not exist")
            return False
            
        self.agent_wallets[agent_id] = wallet_id
        self._save_wallets()
        
        return True
    
    def get_agent_wallet(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the wallet assigned to an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Optional[Dict[str, Any]]: Wallet information or None if not found
        """
        if agent_id not in self.agent_wallets:
            return None
            
        wallet_id = self.agent_wallets[agent_id]
        return self.wallets.get(wallet_id)
    
    def list_wallets(self) -> List[Dict[str, Any]]:
        """
        List all wallets.
        
        Returns:
            List[Dict[str, Any]]: List of wallet information
        """
        return [
            {
                "id": wallet_id,
                "name": wallet["name"],
                "address": wallet["address"],
                "created_at": wallet["created_at"],
                "balance": wallet["balance"]
            }
            for wallet_id, wallet in self.wallets.items()
        ]
    
    def list_agent_wallets(self) -> Dict[str, str]:
        """
        List agent-wallet mappings.
        
        Returns:
            Dict[str, str]: Mapping of agent_id to wallet_id
        """
        return self.agent_wallets
    
    async def update_wallet_balances(self, web3_url: str = "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"):
        """
        Update wallet balances.
        
        Args:
            web3_url: URL of the Web3 provider
        """
        try:
            web3 = Web3(Web3.HTTPProvider(web3_url))
            
            for wallet_id, wallet in self.wallets.items():
                address = wallet["address"]
                balance_wei = web3.eth.get_balance(address)
                balance_eth = web3.from_wei(balance_wei, "ether")
                
                self.wallets[wallet_id]["balance"] = str(balance_eth)
            
            self._save_wallets()
            
        except Exception as e:
            logger.error(f"Error updating wallet balances: {str(e)}")
    
    def get_wallet_private_key(self, wallet_id: str, password: Optional[str] = None) -> Optional[str]:
        """
        Get private key for a wallet.
        
        Args:
            wallet_id: ID of the wallet
            password: Optional password to decrypt the private key
            
        Returns:
            Optional[str]: Private key or None if not found
        """
        if wallet_id not in self.wallets:
            logger.error(f"Wallet {wallet_id} does not exist")
            return None
        
        # In a real implementation, this would decrypt the private key
        return self.wallets[wallet_id]["encrypted_private_key"]
