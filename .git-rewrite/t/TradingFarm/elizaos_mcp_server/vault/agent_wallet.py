"""
Agent Wallet - Delegated wallet infrastructure for ElizaOS agents
Provides controlled access to funds with permissions and limits
"""
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from ..config import VAULT_CONFIG

logger = logging.getLogger('elizaos.vault')

class SpendingLimitExceeded(Exception):
    """Exception raised when a transaction exceeds spending limits"""
    pass

class AgentWallet:
    """
    The AgentWallet represents a controlled wallet assigned to an ElizaOS agent.
    It provides limited access to funds based on permissions and spending limits.
    """
    def __init__(self, agent_id: str, name: str = None, master_vault=None):
        """Initialize an agent wallet"""
        self.agent_id = agent_id
        self.name = name or f"Agent-{agent_id}"
        self.wallet_id = str(uuid.uuid4())
        self.created_at = datetime.now().isoformat()
        self.master_vault = master_vault
        self.chain_accounts = {}  # Chain ID -> Account details
        self.spending_limits = {}  # Asset -> Limit per time period
        self.spending_history = []  # Transaction history
        self.permissions = {
            'can_transfer_to_agents': False,
            'can_transfer_to_external': False,
            'can_receive_funds': True,
            'can_trade': False
        }
        self.purpose = None
        self.metadata = {}
        
        logger.info(f"Created agent wallet {self.wallet_id} for agent {agent_id}")
    
    def add_chain_account(self, chain_id: str, address: str, private_key: Optional[str] = None) -> Dict[str, Any]:
        """Add a chain-specific account to this wallet"""
        self.chain_accounts[chain_id] = {
            'address': address,
            'private_key': private_key,  # Note: This would be encrypted in production
            'created_at': datetime.now().isoformat(),
            'balances': {}
        }
        
        logger.info(f"Added {chain_id} account {address} to wallet {self.wallet_id}")
        return self.chain_accounts[chain_id]
    
    def set_spending_limit(self, asset: str, limit: float, period: str = 'daily') -> Dict[str, Any]:
        """Set spending limit for a specific asset"""
        self.spending_limits[asset] = {
            'limit': limit,
            'period': period,  # Options: 'daily', 'weekly', 'monthly', 'per_transaction'
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Set {period} spending limit of {limit} {asset} for wallet {self.wallet_id}")
        return self.spending_limits[asset]
    
    def set_permission(self, permission: str, value: bool) -> Dict[str, Any]:
        """Set a specific permission for this wallet"""
        if permission not in self.permissions:
            raise ValueError(f"Unknown permission: {permission}")
            
        self.permissions[permission] = value
        
        logger.info(f"Set permission {permission}={value} for wallet {self.wallet_id}")
        return {'permission': permission, 'value': value}
    
    def set_purpose(self, purpose: str) -> Dict[str, Any]:
        """Set the purpose for this wallet"""
        self.purpose = purpose
        self.metadata['purpose'] = purpose
        
        logger.info(f"Set purpose '{purpose}' for wallet {self.wallet_id}")
        return {'purpose': purpose}
    
    def get_balance(self, chain_id: str, asset: str) -> float:
        """Get current balance for a specific chain and asset"""
        # Placeholder - will be implemented with chain adapters
        account = self.chain_accounts.get(chain_id)
        if not account:
            raise ValueError(f"No account found for chain {chain_id}")
            
        # In production, this would query the actual blockchain
        # For now, we'll return a placeholder value
        return account.get('balances', {}).get(asset, 0.0)
    
    def get_all_balances(self) -> Dict[str, Dict[str, float]]:
        """Get all balances across all chains"""
        all_balances = {}
        for chain_id, account in self.chain_accounts.items():
            all_balances[chain_id] = account.get('balances', {})
        return all_balances
    
    def transfer_to_agent(self, recipient_agent_id: str, chain_id: str, 
                         asset: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Transfer funds to another agent wallet"""
        # Check permissions
        if not self.permissions['can_transfer_to_agents']:
            raise PermissionError(f"Agent wallet {self.wallet_id} doesn't have permission to transfer to other agents")
        
        # Check spending limits
        self._check_spending_limit(asset, amount)
        
        # Record the intent to spend
        self._record_spend(asset, amount)
        
        # Create a transfer request through the master vault
        # In a full implementation, this would go through the TransferNetwork
        transfer_data = {
            'id': str(uuid.uuid4()),
            'from_agent_id': self.agent_id,
            'to_agent_id': recipient_agent_id,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"Created transfer request from agent {self.agent_id} to {recipient_agent_id}: {amount} {asset}")
        return transfer_data
    
    def transfer_to_external(self, chain_id: str, external_address: str,
                           asset: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Transfer funds to an external address"""
        # Check permissions
        if not self.permissions['can_transfer_to_external']:
            raise PermissionError(f"Agent wallet {self.wallet_id} doesn't have permission to transfer to external addresses")
        
        # Check spending limits
        self._check_spending_limit(asset, amount)
        
        # Record the intent to spend
        self._record_spend(asset, amount)
        
        # Create a transfer request through the master vault
        transfer_data = {
            'id': str(uuid.uuid4()),
            'from_agent_id': self.agent_id,
            'to_external_address': external_address,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"Created external transfer request from agent {self.agent_id} to {external_address}: {amount} {asset}")
        return transfer_data
    
    def transfer_to_vault(self, chain_id: str, asset: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Transfer funds back to the master vault"""
        # This operation is always allowed as it's returning funds
        # Create a transfer request through the master vault
        transfer_data = {
            'id': str(uuid.uuid4()),
            'from_agent_id': self.agent_id,
            'to_vault': True,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"Created vault transfer request from agent {self.agent_id}: {amount} {asset}")
        return transfer_data
    
    def get_transaction_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transaction history for this wallet"""
        # For now, return spending history. In production, we'd query the ledger
        history = self.spending_history.copy()
        history.sort(key=lambda x: x['timestamp'], reverse=True)
        return history[:limit]
    
    def _check_spending_limit(self, asset: str, amount: float) -> bool:
        """Check if a transaction would exceed spending limits"""
        if asset not in self.spending_limits:
            # No specific limit for this asset
            return True
            
        limit_config = self.spending_limits[asset]
        limit = limit_config['limit']
        period = limit_config['period']
        
        if period == 'per_transaction' and amount > limit:
            raise SpendingLimitExceeded(f"Transaction amount {amount} {asset} exceeds per-transaction limit of {limit}")
            
        # For time-based periods, sum up recent transactions
        if period in ['daily', 'weekly', 'monthly']:
            time_window = self._get_time_window(period)
            recent_spend = self._sum_recent_spend(asset, time_window)
            
            if recent_spend + amount > limit:
                raise SpendingLimitExceeded(
                    f"Transaction amount {amount} {asset} would exceed {period} limit of {limit} "
                    f"(already spent {recent_spend})"
                )
                
        return True
    
    def _record_spend(self, asset: str, amount: float):
        """Record a spend for limit tracking"""
        self.spending_history.append({
            'asset': asset,
            'amount': amount,
            'timestamp': datetime.now().isoformat()
        })
    
    def _sum_recent_spend(self, asset: str, since_timestamp: str) -> float:
        """Sum up recent spending for an asset"""
        recent_spend = 0.0
        since_time = datetime.fromisoformat(since_timestamp)
        
        for spend in self.spending_history:
            if spend['asset'] != asset:
                continue
                
            spend_time = datetime.fromisoformat(spend['timestamp'])
            if spend_time >= since_time:
                recent_spend += spend['amount']
                
        return recent_spend
    
    def _get_time_window(self, period: str) -> str:
        """Get timestamp for start of time window"""
        now = datetime.now()
        
        if period == 'daily':
            window_start = datetime(now.year, now.month, now.day, 0, 0, 0)
        elif period == 'weekly':
            # Start of week (Monday)
            days_since_monday = now.weekday()
            window_start = datetime(now.year, now.month, now.day, 0, 0, 0) - datetime.timedelta(days=days_since_monday)
        elif period == 'monthly':
            window_start = datetime(now.year, now.month, 1, 0, 0, 0)
        else:
            raise ValueError(f"Unsupported period: {period}")
            
        return window_start.isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert wallet to dictionary representation"""
        return {
            'wallet_id': self.wallet_id,
            'agent_id': self.agent_id,
            'name': self.name,
            'created_at': self.created_at,
            'purpose': self.purpose,
            'permissions': self.permissions,
            'spending_limits': self.spending_limits,
            'chain_accounts': {
                chain_id: {
                    'address': account['address'],
                    # Exclude private key
                    'created_at': account['created_at'],
                    'balances': account.get('balances', {})
                }
                for chain_id, account in self.chain_accounts.items()
            },
            'metadata': self.metadata
        }
