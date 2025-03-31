"""
Transaction Ledger - Records and tracks all transfers and transactions
Provides full accounting, auditability, and balance tracking
"""
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from .transaction import Transaction, TransactionStatus

logger = logging.getLogger('elizaos.vault')

class TransactionLedger:
    """
    The TransactionLedger records and tracks all transfers and transactions.
    It provides accounting functionality, balance tracking, and audit trails.
    """
    def __init__(self, storage_path: Optional[str] = None):
        """Initialize the transaction ledger"""
        self.transactions = {}
        self.balances = {}  # entity_id -> chain_id -> asset -> balance
        self.storage_path = storage_path
        self.last_sync = None
        
        logger.info("Transaction Ledger initialized")
        
        # Load transaction history if storage path provided
        if storage_path:
            self._load_transactions()
    
    def record_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Record a new transaction in the ledger"""
        tx_dict = transaction.to_dict()
        self.transactions[transaction.id] = tx_dict
        
        # Update balances if transaction is completed
        if transaction.status == TransactionStatus.COMPLETED:
            self._update_balances(transaction)
        
        # Persist to storage if available
        if self.storage_path:
            self._save_transactions()
        
        logger.info(f"Recorded transaction {transaction.id} in ledger")
        return tx_dict
    
    def update_transaction_status(self, transaction_id: str, 
                                status: TransactionStatus, 
                                reason: Optional[str] = None) -> Dict[str, Any]:
        """Update the status of a transaction in the ledger"""
        if transaction_id not in self.transactions:
            raise ValueError(f"Transaction {transaction_id} not found in ledger")
        
        tx = self.transactions[transaction_id]
        old_status = tx['status']
        tx['status'] = status.value
        tx['updated_at'] = datetime.now().isoformat()
        
        if status == TransactionStatus.COMPLETED:
            tx['completed_at'] = tx['updated_at']
            # Update balances
            transaction = Transaction(
                transaction_type=tx['transaction_type'],
                chain_id=tx['chain_id'],
                asset=tx['asset'],
                amount=tx['amount'],
                from_entity=tx['from_entity'],
                to_entity=tx['to_entity']
            )
            transaction.status = status
            self._update_balances(transaction)
        
        if reason:
            if 'metadata' not in tx:
                tx['metadata'] = {}
            tx['metadata']['status_reason'] = reason
        
        # Persist to storage if available
        if self.storage_path:
            self._save_transactions()
        
        logger.info(f"Updated transaction {transaction_id} status from {old_status} to {status.value}")
        return tx
    
    def get_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """Get a transaction by ID"""
        if transaction_id not in self.transactions:
            raise ValueError(f"Transaction {transaction_id} not found in ledger")
        
        return self.transactions[transaction_id]
    
    def get_transactions(self, limit: int = 50, 
                      status: Optional[TransactionStatus] = None,
                      entity_id: Optional[str] = None,
                      chain_id: Optional[str] = None,
                      asset: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get transactions with optional filtering"""
        transactions = list(self.transactions.values())
        
        # Apply filters
        if status:
            transactions = [tx for tx in transactions if tx['status'] == status.value]
        
        if entity_id:
            transactions = [tx for tx in transactions if 
                           (tx['from_entity'].get('entity_id') == entity_id or 
                            tx['to_entity'].get('entity_id') == entity_id)]
        
        if chain_id:
            transactions = [tx for tx in transactions if tx['chain_id'] == chain_id]
        
        if asset:
            transactions = [tx for tx in transactions if tx['asset'] == asset]
        
        # Sort by creation date, newest first
        transactions.sort(key=lambda x: x['created_at'], reverse=True)
        
        return transactions[:limit]
    
    def get_entity_balance(self, entity_id: str, chain_id: Optional[str] = None, 
                         asset: Optional[str] = None) -> Dict[str, Any]:
        """Get balance for a specific entity, optionally filtered by chain and asset"""
        if entity_id not in self.balances:
            return {}
        
        entity_balances = self.balances[entity_id]
        
        if chain_id:
            if chain_id not in entity_balances:
                return {}
            
            chain_balances = entity_balances[chain_id]
            
            if asset:
                return {
                    'entity_id': entity_id,
                    'chain_id': chain_id,
                    'asset': asset,
                    'balance': chain_balances.get(asset, 0.0)
                }
            else:
                return {
                    'entity_id': entity_id,
                    'chain_id': chain_id,
                    'balances': chain_balances
                }
        else:
            # Return all chains
            return {
                'entity_id': entity_id,
                'balances': entity_balances
            }
    
    def get_all_balances(self) -> Dict[str, Dict[str, Dict[str, float]]]:
        """Get all balances in the ledger"""
        return self.balances
    
    def generate_account_statement(self, entity_id: str, 
                                 start_date: str, 
                                 end_date: Optional[str] = None) -> Dict[str, Any]:
        """Generate an account statement for an entity over a time period"""
        if not end_date:
            end_date = datetime.now().isoformat()
            
        # Get all transactions involving this entity
        entity_transactions = self.get_transactions(
            limit=1000,  # High limit to get all
            entity_id=entity_id
        )
        
        # Filter by date range
        period_transactions = [
            tx for tx in entity_transactions
            if tx['created_at'] >= start_date and tx['created_at'] <= end_date
        ]
        
        # Calculate sums by chain and asset
        inflows = {}
        outflows = {}
        
        for tx in period_transactions:
            chain_id = tx['chain_id']
            asset = tx['asset']
            amount = tx['amount']
            
            # Determine if this is an inflow or outflow
            is_inflow = tx['to_entity'].get('entity_id') == entity_id
            target_dict = inflows if is_inflow else outflows
            
            # Initialize if not exists
            if chain_id not in target_dict:
                target_dict[chain_id] = {}
            
            if asset not in target_dict[chain_id]:
                target_dict[chain_id][asset] = 0.0
            
            # Add to the appropriate bucket
            target_dict[chain_id][asset] += amount
        
        # Get starting and ending balances
        # For now, we'll just use current balances as ending
        # In a real implementation, we'd calculate historical balances
        current_balances = self.get_entity_balance(entity_id)
        
        statement = {
            'entity_id': entity_id,
            'start_date': start_date,
            'end_date': end_date,
            'transactions': period_transactions,
            'transaction_count': len(period_transactions),
            'inflows': inflows,
            'outflows': outflows,
            'ending_balances': current_balances.get('balances', {})
        }
        
        return statement
    
    def _update_balances(self, transaction: Transaction) -> None:
        """Update balances based on a completed transaction"""
        if transaction.status != TransactionStatus.COMPLETED:
            return
        
        # Extract entity IDs
        from_entity_id = transaction.from_entity.get('entity_id')
        to_entity_id = transaction.to_entity.get('entity_id')
        chain_id = transaction.chain_id
        asset = transaction.asset
        amount = transaction.amount
        
        # Initialize balance structures if needed
        for entity_id in [from_entity_id, to_entity_id]:
            if entity_id:
                if entity_id not in self.balances:
                    self.balances[entity_id] = {}
                
                if chain_id not in self.balances[entity_id]:
                    self.balances[entity_id][chain_id] = {}
                
                if asset not in self.balances[entity_id][chain_id]:
                    self.balances[entity_id][chain_id][asset] = 0.0
        
        # Subtract from sender (if not None, as in case of minting)
        if from_entity_id:
            self.balances[from_entity_id][chain_id][asset] -= amount
        
        # Add to receiver (if not None, as in case of burning)
        if to_entity_id:
            self.balances[to_entity_id][chain_id][asset] += amount
        
        logger.debug(f"Updated balances for transaction {transaction.id}")
    
    def _load_transactions(self) -> None:
        """Load transactions from storage"""
        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
                self.transactions = data.get('transactions', {})
                self.balances = data.get('balances', {})
                self.last_sync = datetime.now().isoformat()
                
            logger.info(f"Loaded {len(self.transactions)} transactions from {self.storage_path}")
        except FileNotFoundError:
            logger.info(f"No transaction history found at {self.storage_path}, starting fresh")
        except Exception as e:
            logger.error(f"Error loading transactions: {str(e)}")
    
    def _save_transactions(self) -> None:
        """Save transactions to storage"""
        try:
            data = {
                'transactions': self.transactions,
                'balances': self.balances,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            self.last_sync = datetime.now().isoformat()
            logger.debug(f"Saved {len(self.transactions)} transactions to {self.storage_path}")
        except Exception as e:
            logger.error(f"Error saving transactions: {str(e)}")
