"""
Transaction - Models for transfer transactions and status tracking
Provides standardized representation for all transfer activities
"""
import uuid
import logging
from enum import Enum
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger('elizaos.vault')

class TransactionStatus(Enum):
    """Status values for transactions"""
    PENDING = "pending"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class Transaction:
    """
    Represents a transfer transaction in the vault banking system.
    Provides standardized representation for all transfer activities.
    """
    def __init__(self, 
                transaction_type: str,
                chain_id: str, 
                asset: str, 
                amount: float,
                from_entity: Dict[str, Any],
                to_entity: Dict[str, Any],
                memo: Optional[str] = None,
                metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new transaction"""
        self.id = str(uuid.uuid4())
        self.transaction_type = transaction_type  # agent_to_agent, vault_to_agent, agent_to_vault, cross_chain
        self.chain_id = chain_id
        self.asset = asset
        self.amount = amount
        self.from_entity = from_entity
        self.to_entity = to_entity
        self.memo = memo
        self.metadata = metadata or {}
        
        self.status = TransactionStatus.PENDING
        self.approvals = []
        self.required_approvals = 0
        
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.completed_at = None
        
        self.tx_hash = None
        self.error = None
        
        logger.info(f"Created transaction {self.id}: {transaction_type} {amount} {asset}")
    
    def update_status(self, status: TransactionStatus, reason: Optional[str] = None) -> None:
        """Update the transaction status"""
        self.status = status
        self.updated_at = datetime.now().isoformat()
        
        if status == TransactionStatus.COMPLETED:
            self.completed_at = self.updated_at
        
        if reason:
            self.metadata['status_reason'] = reason
        
        logger.info(f"Updated transaction {self.id} status to {status.value}" + 
                   (f": {reason}" if reason else ""))
    
    def add_approval(self, approver_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Add an approval to this transaction"""
        approval = {
            'approver_id': approver_id,
            'timestamp': datetime.now().isoformat(),
            'notes': notes
        }
        
        self.approvals.append(approval)
        self.updated_at = datetime.now().isoformat()
        
        logger.info(f"Added approval from {approver_id} to transaction {self.id}")
        return approval
    
    def set_transaction_hash(self, tx_hash: str) -> None:
        """Set the blockchain transaction hash"""
        self.tx_hash = tx_hash
        self.updated_at = datetime.now().isoformat()
        
        logger.info(f"Set tx hash {tx_hash} for transaction {self.id}")
    
    def set_error(self, error_message: str) -> None:
        """Set error information if transaction failed"""
        self.error = error_message
        self.updated_at = datetime.now().isoformat()
        
        logger.warning(f"Transaction {self.id} error: {error_message}")
    
    def is_approved(self) -> bool:
        """Check if transaction has sufficient approvals"""
        return len(self.approvals) >= self.required_approvals
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert transaction to dictionary representation"""
        return {
            'id': self.id,
            'transaction_type': self.transaction_type,
            'chain_id': self.chain_id,
            'asset': self.asset,
            'amount': self.amount,
            'from_entity': self.from_entity,
            'to_entity': self.to_entity,
            'memo': self.memo,
            'status': self.status.value,
            'approvals': self.approvals,
            'required_approvals': self.required_approvals,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'completed_at': self.completed_at,
            'tx_hash': self.tx_hash,
            'error': self.error,
            'metadata': self.metadata
        }
