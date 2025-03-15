"""
Master Vault - Central authority for the vault banking system
Controls all transactions, agent wallets, and security policies
"""
import uuid
import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from .transaction import Transaction, TransactionStatus
from .ledger import TransactionLedger
from ..config import VAULT_CONFIG

logger = logging.getLogger('elizaos.vault')

class MasterVault:
    """
    The MasterVault class serves as the central authority for the vault banking system.
    It manages transactions, agent wallets, and security policies.
    """
    def __init__(self, config_path: Optional[str] = None, 
                ledger_path: Optional[str] = None):
        """Initialize the master vault"""
        self.vault_id = str(uuid.uuid4())
        self.config = VAULT_CONFIG or {}
        
        # Load custom config if provided
        if config_path:
            try:
                with open(config_path, 'r') as f:
                    self.config.update(json.load(f))
            except Exception as e:
                logger.error(f"Failed to load vault config: {str(e)}")
        
        # Initialize vault properties
        self.authorized_keys = self.config.get('authorized_keys', [])
        self.approval_threshold = self.config.get('approval_threshold', 1.0)
        self.emergency_contacts = self.config.get('emergency_contacts', [])
        self.vault_addresses = self.config.get('vault_addresses', {})
        self.frozen = False
        
        # Initialize transaction storage
        self.pending_transactions = {}
        self.approved_transactions = {}
        self.executed_transactions = {}
        self.rejected_transactions = {}
        
        # Initialize ledger
        self.ledger = TransactionLedger(storage_path=ledger_path)
        
        # References to other components (will be set later)
        self.wallet_factory = None
        self.transfer_network = None
        
        logger.info(f"Master Vault initialized with ID: {self.vault_id}")
    
    def set_wallet_factory(self, wallet_factory) -> None:
        """Set the wallet factory instance"""
        self.wallet_factory = wallet_factory
        logger.info("Wallet Factory registered with Master Vault")
    
    def set_transfer_network(self, transfer_network) -> None:
        """Set the transfer network instance"""
        self.transfer_network = transfer_network
        logger.info("Transfer Network registered with Master Vault")
    
    def create_transaction(self, chain_id: str, to_address: str, amount: float, 
                         asset: str, from_address: Optional[str] = None,
                         metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new transaction from vault to external address
        """
        if self.frozen:
            raise PermissionError("Vault is currently frozen. No transactions allowed.")
        
        # Determine from address (use vault address for chain if not specified)
        if not from_address:
            if chain_id not in self.vault_addresses:
                raise ValueError(f"No vault address configured for chain {chain_id}")
            from_address = self.vault_addresses[chain_id]['address']
        
        # Create transaction object
        transaction = Transaction(
            transaction_type="vault_to_external",
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            from_entity={
                'entity_type': 'vault',
                'entity_id': self.vault_id,
                'address': from_address
            },
            to_entity={
                'entity_type': 'external',
                'address': to_address
            },
            metadata=metadata
        )
        
        # Set required approvals based on amount and threshold
        required_approvals = self._calculate_required_approvals(amount, asset)
        transaction.required_approvals = required_approvals
        
        # Store transaction
        tx_dict = transaction.to_dict()
        self.pending_transactions[transaction.id] = tx_dict
        
        # Record in ledger
        self.ledger.record_transaction(transaction)
        
        logger.info(f"Created transaction {transaction.id}: {amount} {asset} to {to_address} on {chain_id}")
        return tx_dict
    
    def approve_transaction(self, transaction_id: str, approver_key: str, 
                          notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Approve a pending transaction
        """
        if self.frozen:
            raise PermissionError("Vault is currently frozen. No approvals allowed.")
        
        # Validate approver key
        if approver_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized key: {approver_key}")
        
        # Get transaction
        if transaction_id not in self.pending_transactions:
            raise ValueError(f"Transaction {transaction_id} not found or not pending")
        
        tx = self.pending_transactions[transaction_id]
        
        # Check if already approved by this key
        for approval in tx['approvals']:
            if approval['approver_id'] == approver_key:
                raise ValueError(f"Transaction already approved by key {approver_key}")
        
        # Add approval
        approval = {
            'approver_id': approver_key,
            'timestamp': datetime.now().isoformat(),
            'notes': notes
        }
        
        tx['approvals'].append(approval)
        tx['updated_at'] = datetime.now().isoformat()
        
        # Check if we have enough approvals
        if len(tx['approvals']) >= tx['required_approvals']:
            # Move to approved
            tx['status'] = TransactionStatus.APPROVED.value
            self.approved_transactions[transaction_id] = tx
            del self.pending_transactions[transaction_id]
            
            # Update in ledger
            self.ledger.update_transaction_status(
                transaction_id, 
                TransactionStatus.APPROVED,
                reason=f"Approved by {approver_key}"
            )
            
            logger.info(f"Transaction {transaction_id} approved and ready for execution")
        else:
            logger.info(f"Transaction {transaction_id} received approval from {approver_key} " +
                       f"({len(tx['approvals'])}/{tx['required_approvals']} approvals)")
            
            # Update in ledger
            self.ledger.update_transaction_status(
                transaction_id,
                TransactionStatus.PENDING,
                reason=f"Approval added by {approver_key}"
            )
        
        return tx
    
    def execute_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """
        Execute an approved transaction
        """
        if self.frozen:
            raise PermissionError("Vault is currently frozen. No transactions allowed.")
        
        # Get transaction
        if transaction_id not in self.approved_transactions:
            raise ValueError(f"Transaction {transaction_id} not found or not approved")
        
        tx = self.approved_transactions[transaction_id]
        
        # Update status
        tx['status'] = TransactionStatus.EXECUTING.value
        tx['updated_at'] = datetime.now().isoformat()
        
        # Update in ledger
        self.ledger.update_transaction_status(
            transaction_id,
            TransactionStatus.EXECUTING,
            reason="Execution started"
        )
        
        logger.info(f"Executing transaction {transaction_id}")
        
        try:
            # Here we would integrate with chain adapters to execute the transaction
            # For now, we'll simulate success with a mock transaction hash
            tx_hash = f"0x{uuid.uuid4().hex}"
            
            # Update transaction with success
            tx['status'] = TransactionStatus.COMPLETED.value
            tx['completed_at'] = datetime.now().isoformat()
            tx['tx_hash'] = tx_hash
            
            # Move to executed
            self.executed_transactions[transaction_id] = tx
            del self.approved_transactions[transaction_id]
            
            # Update in ledger
            self.ledger.update_transaction_status(
                transaction_id,
                TransactionStatus.COMPLETED,
                reason=f"Successfully executed with hash {tx_hash}"
            )
            
            logger.info(f"Transaction {transaction_id} executed successfully with hash {tx_hash}")
        except Exception as e:
            # Update transaction with failure
            tx['status'] = TransactionStatus.FAILED.value
            tx['error'] = str(e)
            
            # Keep in approved transactions for retry
            
            # Update in ledger
            self.ledger.update_transaction_status(
                transaction_id,
                TransactionStatus.FAILED,
                reason=f"Execution failed: {str(e)}"
            )
            
            logger.error(f"Transaction {transaction_id} execution failed: {str(e)}")
            raise
        
        return tx
    
    def reject_transaction(self, transaction_id: str, rejector_key: str, 
                         reason: str) -> Dict[str, Any]:
        """
        Reject a pending transaction
        """
        # Validate rejector key
        if rejector_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized key: {rejector_key}")
        
        # Get transaction from pending or approved
        tx = None
        source = None
        
        if transaction_id in self.pending_transactions:
            tx = self.pending_transactions[transaction_id]
            source = self.pending_transactions
        elif transaction_id in self.approved_transactions:
            tx = self.approved_transactions[transaction_id]
            source = self.approved_transactions
        
        if not tx:
            raise ValueError(f"Transaction {transaction_id} not found or not in a rejectable state")
        
        # Update transaction
        tx['status'] = TransactionStatus.REJECTED.value
        tx['updated_at'] = datetime.now().isoformat()
        tx['rejection'] = {
            'rejector': rejector_key,
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        }
        
        # Move to rejected
        self.rejected_transactions[transaction_id] = tx
        del source[transaction_id]
        
        # Update in ledger
        self.ledger.update_transaction_status(
            transaction_id,
            TransactionStatus.REJECTED,
            reason=f"Rejected by {rejector_key}: {reason}"
        )
        
        logger.info(f"Transaction {transaction_id} rejected by {rejector_key}: {reason}")
        return tx
    
    def get_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """
        Get a transaction by ID from any status category
        """
        # Check all transaction collections
        if transaction_id in self.pending_transactions:
            return self.pending_transactions[transaction_id]
        elif transaction_id in self.approved_transactions:
            return self.approved_transactions[transaction_id]
        elif transaction_id in self.executed_transactions:
            return self.executed_transactions[transaction_id]
        elif transaction_id in self.rejected_transactions:
            return self.rejected_transactions[transaction_id]
        else:
            # Check ledger as fallback
            try:
                return self.ledger.get_transaction(transaction_id)
            except ValueError:
                raise ValueError(f"Transaction {transaction_id} not found")
    
    def get_pending_transactions(self) -> List[Dict[str, Any]]:
        """Get all pending transactions"""
        return list(self.pending_transactions.values())
    
    def get_approved_transactions(self) -> List[Dict[str, Any]]:
        """Get all approved transactions"""
        return list(self.approved_transactions.values())
    
    def get_executed_transactions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent executed transactions"""
        transactions = list(self.executed_transactions.values())
        transactions.sort(key=lambda x: x['completed_at'], reverse=True)
        return transactions[:limit]
    
    def get_rejected_transactions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent rejected transactions"""
        transactions = list(self.rejected_transactions.values())
        transactions.sort(key=lambda x: x['updated_at'], reverse=True)
        return transactions[:limit]
    
    def get_transaction_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transaction history from ledger"""
        return self.ledger.get_transactions(limit=limit)
    
    def freeze_vault(self, key: str, reason: str) -> Dict[str, Any]:
        """
        Freeze all vault operations (emergency measure)
        """
        # Validate key (require it to be in emergency contacts)
        if key not in self.emergency_contacts:
            raise PermissionError(f"Unauthorized emergency key: {key}")
        
        self.frozen = True
        
        freeze_event = {
            'event': 'vault_frozen',
            'timestamp': datetime.now().isoformat(),
            'by': key,
            'reason': reason
        }
        
        logger.warning(f"VAULT FROZEN by {key}: {reason}")
        
        return freeze_event
    
    def unfreeze_vault(self, key: str, reason: str) -> Dict[str, Any]:
        """
        Unfreeze vault operations
        """
        # Validate key (require it to be in emergency contacts)
        if key not in self.emergency_contacts:
            raise PermissionError(f"Unauthorized emergency key: {key}")
        
        self.frozen = False
        
        unfreeze_event = {
            'event': 'vault_unfrozen',
            'timestamp': datetime.now().isoformat(),
            'by': key,
            'reason': reason
        }
        
        logger.info(f"Vault unfrozen by {key}: {reason}")
        
        return unfreeze_event
    
    def is_frozen(self) -> bool:
        """Check if vault is frozen"""
        return self.frozen
    
    def add_authorized_key(self, admin_key: str, new_key: str, 
                          is_emergency: bool = False) -> Dict[str, Any]:
        """
        Add a new authorized key to the vault
        """
        # Validate admin key
        if admin_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized admin key: {admin_key}")
        
        # Add the new key
        if new_key not in self.authorized_keys:
            self.authorized_keys.append(new_key)
        
        # Add as emergency contact if requested
        if is_emergency and new_key not in self.emergency_contacts:
            self.emergency_contacts.append(new_key)
        
        key_event = {
            'event': 'key_added',
            'timestamp': datetime.now().isoformat(),
            'by': admin_key,
            'key': new_key,
            'is_emergency': is_emergency
        }
        
        logger.info(f"Added authorized key {new_key} by {admin_key}" + 
                   (" with emergency privileges" if is_emergency else ""))
        
        return key_event
    
    def remove_authorized_key(self, admin_key: str, key_to_remove: str) -> Dict[str, Any]:
        """
        Remove an authorized key from the vault
        """
        # Validate admin key
        if admin_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized admin key: {admin_key}")
        
        # Prevent removing yourself
        if admin_key == key_to_remove:
            raise ValueError("Cannot remove your own key")
        
        # Remove the key
        if key_to_remove in self.authorized_keys:
            self.authorized_keys.remove(key_to_remove)
        
        # Also remove from emergency contacts if present
        if key_to_remove in self.emergency_contacts:
            self.emergency_contacts.remove(key_to_remove)
        
        key_event = {
            'event': 'key_removed',
            'timestamp': datetime.now().isoformat(),
            'by': admin_key,
            'key': key_to_remove
        }
        
        logger.info(f"Removed authorized key {key_to_remove} by {admin_key}")
        
        return key_event
    
    def set_approval_threshold(self, admin_key: str, threshold: float) -> Dict[str, Any]:
        """
        Set the approval threshold for transactions
        """
        # Validate admin key
        if admin_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized admin key: {admin_key}")
        
        # Validate threshold
        if threshold <= 0 or threshold > 1.0:
            raise ValueError("Threshold must be between 0 and 1")
        
        old_threshold = self.approval_threshold
        self.approval_threshold = threshold
        
        threshold_event = {
            'event': 'threshold_updated',
            'timestamp': datetime.now().isoformat(),
            'by': admin_key,
            'old_threshold': old_threshold,
            'new_threshold': threshold
        }
        
        logger.info(f"Updated approval threshold from {old_threshold} to {threshold} by {admin_key}")
        
        return threshold_event
    
    def add_vault_address(self, admin_key: str, chain_id: str, 
                        address: str, private_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Add or update a vault address for a specific chain
        """
        # Validate admin key
        if admin_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized admin key: {admin_key}")
        
        # Initialize chain if not exists
        if chain_id not in self.vault_addresses:
            self.vault_addresses[chain_id] = {}
        
        # Update address info
        self.vault_addresses[chain_id]['address'] = address
        if private_key:
            self.vault_addresses[chain_id]['private_key'] = private_key
        
        address_event = {
            'event': 'vault_address_added',
            'timestamp': datetime.now().isoformat(),
            'by': admin_key,
            'chain_id': chain_id,
            'address': address
        }
        
        logger.info(f"Added vault address for chain {chain_id}: {address} by {admin_key}")
        
        return address_event
    
    def fund_agent_wallet(self, admin_key: str, agent_id: str, chain_id: str, 
                        asset: str, amount: float, memo: Optional[str] = None) -> Dict[str, Any]:
        """
        Fund an agent wallet from the vault
        """
        if self.frozen:
            raise PermissionError("Vault is currently frozen. No transfers allowed.")
        
        # Validate admin key
        if admin_key not in self.authorized_keys:
            raise PermissionError(f"Unauthorized admin key: {admin_key}")
        
        # Ensure we have a transfer network
        if not self.transfer_network:
            raise RuntimeError("Transfer network not set")
        
        # Execute the transfer
        transfer = self.transfer_network.transfer_from_vault(
            to_agent_id=agent_id,
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            memo=memo or f"Funding from vault by {admin_key}"
        )
        
        # Approve the transfer automatically
        vault_tx_id = transfer['vault_tx_id']
        self.approve_transaction(vault_tx_id, admin_key, notes="Automatic approval for funding")
        
        # Execute immediately if only one approval required
        if self.get_transaction(vault_tx_id)['status'] == TransactionStatus.APPROVED.value:
            self.execute_transaction(vault_tx_id)
        
        return transfer
    
    def _calculate_required_approvals(self, amount: float, asset: str) -> int:
        """
        Calculate required approvals based on amount and threshold
        """
        # Get threshold tiers from config
        threshold_tiers = self.config.get('threshold_tiers', {}).get(asset, [])
        
        # Default to 1 if no tiers defined
        if not threshold_tiers:
            return 1
        
        # Find applicable tier
        for tier in sorted(threshold_tiers, key=lambda x: x['threshold']):
            if amount <= tier['threshold']:
                return tier['required_approvals']
        
        # If amount exceeds all tiers, use the highest tier
        return max(threshold_tiers, key=lambda x: x['threshold'])['required_approvals']
