"""
Vault Banking System for ElizaOS and Trading Farm
Provides a hierarchical banking system for agents to manage funds and cryptocurrencies
while maintaining master control for the owner.
"""

# Import core components
from .master_vault import MasterVault
from .agent_wallet import AgentWallet
from .wallet_factory import WalletFactory
from .transfer_network import TransferNetwork
from .transaction import Transaction, TransactionStatus
from .ledger import TransactionLedger
from .bank import Bank

# Export all components
__all__ = [
    'MasterVault',
    'AgentWallet',
    'WalletFactory',
    'TransferNetwork',
    'Transaction',
    'TransactionStatus',
    'TransactionLedger',
    'Bank'
]
