"""
Wallet Factory - Creates and manages agent wallets
Serves as a registry and creation system for all agent wallets
"""
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from .agent_wallet import AgentWallet
from ..config import VAULT_CONFIG

logger = logging.getLogger('elizaos.vault')

class WalletFactory:
    """
    The WalletFactory creates and manages agent wallets.
    It serves as a registry for all wallets in the system and 
    handles wallet lifecycle events.
    """
    def __init__(self, master_vault):
        """Initialize the wallet factory with reference to master vault"""
        self.master_vault = master_vault
        self.wallets = {}  # wallet_id -> AgentWallet
        self.agent_wallets = {}  # agent_id -> [wallet_ids]
        self.wallet_types = {
            'trading': {
                'default_permissions': {
                    'can_transfer_to_agents': True,
                    'can_transfer_to_external': False,
                    'can_receive_funds': True,
                    'can_trade': True
                },
                'default_limits': {
                    'ETH': {'limit': 5.0, 'period': 'daily'},
                    'USDC': {'limit': 10000.0, 'period': 'daily'},
                    'BTC': {'limit': 0.5, 'period': 'daily'}
                }
            },
            'treasury': {
                'default_permissions': {
                    'can_transfer_to_agents': True,
                    'can_transfer_to_external': False,
                    'can_receive_funds': True,
                    'can_trade': False
                },
                'default_limits': {
                    'ETH': {'limit': 10.0, 'period': 'daily'},
                    'USDC': {'limit': 50000.0, 'period': 'daily'},
                    'BTC': {'limit': 1.0, 'period': 'daily'}
                }
            },
            'operations': {
                'default_permissions': {
                    'can_transfer_to_agents': True,
                    'can_transfer_to_external': True,
                    'can_receive_funds': True,
                    'can_trade': False
                },
                'default_limits': {
                    'ETH': {'limit': 2.0, 'period': 'daily'},
                    'USDC': {'limit': 5000.0, 'period': 'daily'},
                    'BTC': {'limit': 0.1, 'period': 'daily'}
                }
            }
        }
        logger.info("Wallet Factory initialized")
        
    def create_wallet(self, agent_id: str, name: Optional[str] = None, 
                     wallet_type: str = 'trading', purpose: Optional[str] = None,
                     custom_permissions: Optional[Dict[str, bool]] = None,
                     custom_limits: Optional[Dict[str, Dict[str, Any]]] = None) -> AgentWallet:
        """Create a new wallet for an agent with specified type and settings"""
        # Check if wallet type exists
        if wallet_type not in self.wallet_types:
            raise ValueError(f"Unknown wallet type: {wallet_type}")
            
        # Create the wallet
        wallet = AgentWallet(agent_id, name=name, master_vault=self.master_vault)
        
        # Set purpose
        if purpose:
            wallet.set_purpose(purpose)
        else:
            wallet.set_purpose(f"{wallet_type} operations")
            
        # Apply default permissions based on wallet type
        default_permissions = self.wallet_types[wallet_type]['default_permissions']
        for perm, value in default_permissions.items():
            wallet.set_permission(perm, value)
            
        # Override with custom permissions if provided
        if custom_permissions:
            for perm, value in custom_permissions.items():
                wallet.set_permission(perm, value)
                
        # Apply default spending limits based on wallet type
        default_limits = self.wallet_types[wallet_type]['default_limits']
        for asset, limit_config in default_limits.items():
            wallet.set_spending_limit(asset, limit_config['limit'], limit_config['period'])
            
        # Override with custom limits if provided
        if custom_limits:
            for asset, limit_config in custom_limits.items():
                wallet.set_spending_limit(asset, limit_config['limit'], limit_config['period'])
                
        # Store the wallet in our registry
        self.wallets[wallet.wallet_id] = wallet
        
        # Associate with agent
        if agent_id not in self.agent_wallets:
            self.agent_wallets[agent_id] = []
        self.agent_wallets[agent_id].append(wallet.wallet_id)
        
        logger.info(f"Created {wallet_type} wallet {wallet.wallet_id} for agent {agent_id}")
        return wallet
    
    def get_wallet(self, wallet_id: str) -> AgentWallet:
        """Get a wallet by its ID"""
        if wallet_id not in self.wallets:
            raise ValueError(f"Wallet {wallet_id} not found")
        return self.wallets[wallet_id]
    
    def get_agent_wallets(self, agent_id: str) -> List[AgentWallet]:
        """Get all wallets for a specific agent"""
        if agent_id not in self.agent_wallets:
            return []
        
        return [self.wallets[wallet_id] for wallet_id in self.agent_wallets[agent_id]]
    
    def register_chain_account(self, wallet_id: str, chain_id: str, 
                              address: str, private_key: Optional[str] = None) -> Dict[str, Any]:
        """Register a chain account for a wallet"""
        wallet = self.get_wallet(wallet_id)
        return wallet.add_chain_account(chain_id, address, private_key)
    
    def update_wallet_limits(self, wallet_id: str, asset: str, 
                           limit: float, period: str = 'daily') -> Dict[str, Any]:
        """Update spending limits for a wallet"""
        wallet = self.get_wallet(wallet_id)
        return wallet.set_spending_limit(asset, limit, period)
    
    def update_wallet_permissions(self, wallet_id: str, 
                                permissions: Dict[str, bool]) -> Dict[str, Any]:
        """Update permissions for a wallet"""
        wallet = self.get_wallet(wallet_id)
        results = {}
        for perm, value in permissions.items():
            results[perm] = wallet.set_permission(perm, value)
        return results
    
    def list_all_wallets(self) -> List[Dict[str, Any]]:
        """List all wallets in the registry"""
        return [wallet.to_dict() for wallet in self.wallets.values()]
    
    def list_wallet_types(self) -> Dict[str, Dict[str, Any]]:
        """List all available wallet types with their default settings"""
        return self.wallet_types
    
    def add_wallet_type(self, type_name: str, default_permissions: Dict[str, bool],
                      default_limits: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Add a new wallet type with default settings"""
        if type_name in self.wallet_types:
            raise ValueError(f"Wallet type {type_name} already exists")
            
        self.wallet_types[type_name] = {
            'default_permissions': default_permissions,
            'default_limits': default_limits
        }
        
        logger.info(f"Added new wallet type: {type_name}")
        return self.wallet_types[type_name]
