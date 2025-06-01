"""
Bank - Main entry point for the vault banking system
Ties together master vault, agent wallets, transfer network, and ledger
"""
import os
import logging
from typing import Dict, List, Any, Optional
from .master_vault import MasterVault
from .wallet_factory import WalletFactory
from .transfer_network import TransferNetwork
from .ledger import TransactionLedger
from .transaction import TransactionStatus
from ..config import VAULT_CONFIG

logger = logging.getLogger('elizaos.vault')

class Bank:
    """
    The Bank class serves as the main entry point for the vault banking system.
    It coordinates all banking components and provides a clean API for the Trading Farm.
    """
    def __init__(self, config_path: Optional[str] = None, 
                data_dir: Optional[str] = None):
        """Initialize the banking system with all components"""
        # Set up data directory for transaction storage
        if data_dir:
            os.makedirs(data_dir, exist_ok=True)
            ledger_path = os.path.join(data_dir, "transactions.json")
        else:
            ledger_path = None
            
        # Initialize components
        self.master_vault = MasterVault(config_path=config_path, ledger_path=ledger_path)
        self.wallet_factory = WalletFactory(self.master_vault)
        self.transfer_network = TransferNetwork(self.master_vault, self.wallet_factory)
        
        # Connect components
        self.master_vault.set_wallet_factory(self.wallet_factory)
        self.master_vault.set_transfer_network(self.transfer_network)
        
        logger.info("Bank system initialized successfully")
    
    # === Master Vault Operations ===
    
    def create_vault_transaction(self, chain_id: str, to_address: str, 
                               amount: float, asset: str, 
                               metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new transaction from the master vault"""
        return self.master_vault.create_transaction(
            chain_id=chain_id,
            to_address=to_address,
            amount=amount,
            asset=asset,
            metadata=metadata
        )
    
    def approve_transaction(self, transaction_id: str, approver_key: str, 
                          notes: Optional[str] = None) -> Dict[str, Any]:
        """Approve a pending transaction"""
        return self.master_vault.approve_transaction(
            transaction_id=transaction_id,
            approver_key=approver_key,
            notes=notes
        )
    
    def execute_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """Execute an approved transaction"""
        return self.master_vault.execute_transaction(transaction_id)
    
    def reject_transaction(self, transaction_id: str, rejector_key: str, 
                         reason: str) -> Dict[str, Any]:
        """Reject a transaction"""
        return self.master_vault.reject_transaction(
            transaction_id=transaction_id,
            rejector_key=rejector_key,
            reason=reason
        )
    
    def freeze_vault(self, key: str, reason: str) -> Dict[str, Any]:
        """Freeze all vault operations (emergency measure)"""
        return self.master_vault.freeze_vault(key, reason)
    
    def unfreeze_vault(self, key: str, reason: str) -> Dict[str, Any]:
        """Unfreeze vault operations"""
        return self.master_vault.unfreeze_vault(key, reason)
    
    def add_authorized_key(self, admin_key: str, new_key: str, 
                         is_emergency: bool = False) -> Dict[str, Any]:
        """Add a new authorized key to the vault"""
        return self.master_vault.add_authorized_key(admin_key, new_key, is_emergency)
    
    def remove_authorized_key(self, admin_key: str, key_to_remove: str) -> Dict[str, Any]:
        """Remove an authorized key from the vault"""
        return self.master_vault.remove_authorized_key(admin_key, key_to_remove)
    
    def add_vault_address(self, admin_key: str, chain_id: str, 
                        address: str, private_key: Optional[str] = None) -> Dict[str, Any]:
        """Add or update a vault address for a specific chain"""
        return self.master_vault.add_vault_address(admin_key, chain_id, address, private_key)
    
    def get_pending_transactions(self) -> List[Dict[str, Any]]:
        """Get all pending transactions"""
        return self.master_vault.get_pending_transactions()
    
    def get_transaction_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transaction history"""
        return self.master_vault.get_transaction_history(limit)
    
    # === Agent Wallet Operations ===
    
    def create_agent_wallet(self, agent_id: str, name: Optional[str] = None, 
                          wallet_type: str = 'trading', purpose: Optional[str] = None,
                          custom_permissions: Optional[Dict[str, bool]] = None,
                          custom_limits: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Create a new wallet for an agent"""
        wallet = self.wallet_factory.create_wallet(
            agent_id=agent_id,
            name=name,
            wallet_type=wallet_type,
            purpose=purpose,
            custom_permissions=custom_permissions,
            custom_limits=custom_limits
        )
        return wallet.to_dict()
    
    def get_agent_wallets(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get all wallets for a specific agent"""
        wallets = self.wallet_factory.get_agent_wallets(agent_id)
        return [wallet.to_dict() for wallet in wallets]
    
    def get_wallet(self, wallet_id: str) -> Dict[str, Any]:
        """Get a wallet by ID"""
        wallet = self.wallet_factory.get_wallet(wallet_id)
        return wallet.to_dict()
    
    def update_wallet_limits(self, wallet_id: str, asset: str, 
                           limit: float, period: str = 'daily') -> Dict[str, Any]:
        """Update spending limits for a wallet"""
        return self.wallet_factory.update_wallet_limits(wallet_id, asset, limit, period)
    
    def update_wallet_permissions(self, wallet_id: str, 
                                permissions: Dict[str, bool]) -> Dict[str, Any]:
        """Update permissions for a wallet"""
        return self.wallet_factory.update_wallet_permissions(wallet_id, permissions)
    
    def register_agent_chain_account(self, wallet_id: str, chain_id: str, 
                                   address: str, private_key: Optional[str] = None) -> Dict[str, Any]:
        """Register a chain account for an agent wallet"""
        return self.wallet_factory.register_chain_account(wallet_id, chain_id, address, private_key)
    
    def fund_agent_wallet(self, admin_key: str, agent_id: str, chain_id: str, 
                        asset: str, amount: float, memo: Optional[str] = None) -> Dict[str, Any]:
        """Fund an agent wallet from the vault"""
        return self.master_vault.fund_agent_wallet(admin_key, agent_id, chain_id, asset, amount, memo)
    
    # === Transfer Operations ===
    
    def transfer_between_agents(self, from_agent_id: str, to_agent_id: str, 
                              chain_id: str, asset: str, amount: float, 
                              memo: Optional[str] = None) -> Dict[str, Any]:
        """Transfer funds between two agent wallets"""
        return self.transfer_network.transfer_between_agents(
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            memo=memo
        )
    
    def transfer_to_vault(self, from_agent_id: str, chain_id: str, 
                        asset: str, amount: float, memo: Optional[str] = None) -> Dict[str, Any]:
        """Transfer funds from an agent wallet to the master vault"""
        return self.transfer_network.transfer_to_vault(
            from_agent_id=from_agent_id,
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            memo=memo
        )
    
    def cross_chain_transfer(self, from_agent_id: str, from_chain_id: str, 
                           to_chain_id: str, asset: str, amount: float, 
                           to_agent_id: Optional[str] = None, memo: Optional[str] = None) -> Dict[str, Any]:
        """Transfer funds across different chains"""
        return self.transfer_network.cross_chain_transfer(
            from_agent_id=from_agent_id,
            from_chain_id=from_chain_id,
            to_chain_id=to_chain_id,
            asset=asset,
            amount=amount,
            to_agent_id=to_agent_id,
            memo=memo
        )
    
    def get_transfer_status(self, transfer_id: str) -> Dict[str, Any]:
        """Get the status of a transfer"""
        return self.transfer_network.get_transfer_status(transfer_id)
    
    def get_agent_transfers(self, agent_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transfers for a specific agent"""
        return self.transfer_network.get_agent_transfers(agent_id, limit)
    
    def get_optimal_route(self, from_chain_id: str, to_chain_id: str, 
                        asset: str) -> Dict[str, Any]:
        """Get the optimal route for a cross-chain transfer"""
        return self.transfer_network.get_optimal_route(from_chain_id, to_chain_id, asset)
    
    # === Ledger and Accounting ===
    
    def get_entity_balance(self, entity_id: str, chain_id: Optional[str] = None, 
                         asset: Optional[str] = None) -> Dict[str, Any]:
        """Get balance for a specific entity"""
        return self.master_vault.ledger.get_entity_balance(entity_id, chain_id, asset)
    
    def generate_account_statement(self, entity_id: str, 
                                 start_date: str, 
                                 end_date: Optional[str] = None) -> Dict[str, Any]:
        """Generate an account statement for an entity over a time period"""
        return self.master_vault.ledger.generate_account_statement(entity_id, start_date, end_date)
    
    # === Wallet Type Management ===
    
    def list_wallet_types(self) -> Dict[str, Dict[str, Any]]:
        """List all available wallet types with their default settings"""
        return self.wallet_factory.list_wallet_types()
    
    def add_wallet_type(self, type_name: str, default_permissions: Dict[str, bool],
                      default_limits: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Add a new wallet type with default settings"""
        return self.wallet_factory.add_wallet_type(type_name, default_permissions, default_limits)
