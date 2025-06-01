"""
Transfer Network - Manages all fund transfers between entities
Provides cross-chain bridging and optimized routing
"""
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..config import VAULT_CONFIG

logger = logging.getLogger('elizaos.vault')

class TransferNetwork:
    """
    The TransferNetwork manages all fund transfers between entities in the system.
    It handles internal transfers, external transfers, and cross-chain operations.
    """
    def __init__(self, master_vault, wallet_factory):
        """Initialize the transfer network with references to master vault and wallet factory"""
        self.master_vault = master_vault
        self.wallet_factory = wallet_factory
        self.pending_transfers = {}
        self.completed_transfers = {}
        self.bridges = self._load_bridges()
        self.routes = self._load_routes()
        
        logger.info("Transfer Network initialized")
    
    def transfer_between_agents(self, from_agent_id: str, to_agent_id: str, 
                               chain_id: str, asset: str, amount: float, 
                               memo: str = None) -> Dict[str, Any]:
        """Transfer funds between two agent wallets"""
        # Get wallets for both agents
        from_wallets = self.wallet_factory.get_agent_wallets(from_agent_id)
        to_wallets = self.wallet_factory.get_agent_wallets(to_agent_id)
        
        if not from_wallets:
            raise ValueError(f"No wallets found for agent {from_agent_id}")
        
        if not to_wallets:
            raise ValueError(f"No wallets found for agent {to_agent_id}")
        
        # Find appropriate wallets for this chain
        from_wallet = next((w for w in from_wallets if chain_id in w.chain_accounts), None)
        to_wallet = next((w for w in to_wallets if chain_id in w.chain_accounts), None)
        
        if not from_wallet:
            raise ValueError(f"Agent {from_agent_id} has no wallet for chain {chain_id}")
        
        if not to_wallet:
            raise ValueError(f"Agent {to_agent_id} has no wallet for chain {chain_id}")
        
        # Check permissions
        if not from_wallet.permissions['can_transfer_to_agents']:
            raise PermissionError(f"Wallet {from_wallet.wallet_id} doesn't have permission to transfer to other agents")
        
        if not to_wallet.permissions['can_receive_funds']:
            raise PermissionError(f"Wallet {to_wallet.wallet_id} doesn't have permission to receive funds")
        
        # Check if sender has enough balance
        balance = from_wallet.get_balance(chain_id, asset)
        if balance < amount:
            raise ValueError(f"Insufficient balance: {balance} {asset} < {amount}")
        
        # Create transfer record
        transfer_id = str(uuid.uuid4())
        transfer = {
            'id': transfer_id,
            'type': 'agent_to_agent',
            'from_agent': from_agent_id,
            'from_wallet': from_wallet.wallet_id,
            'to_agent': to_agent_id,
            'to_wallet': to_wallet.wallet_id,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'completed_at': None,
            'tx_hash': None
        }
        
        self.pending_transfers[transfer_id] = transfer
        
        # Execute the transfer
        # In a real implementation, this would interact with chain adapters
        # For now, we'll simulate success after validation
        from_address = from_wallet.chain_accounts[chain_id]['address']
        to_address = to_wallet.chain_accounts[chain_id]['address']
        
        # Record the transaction in both wallets
        from_wallet._record_spend(asset, amount)
        
        # Update status
        transfer['status'] = 'completed'
        transfer['completed_at'] = datetime.now().isoformat()
        transfer['tx_hash'] = f"0x{uuid.uuid4().hex}"  # Simulated tx hash
        
        # Move to completed transfers
        self.completed_transfers[transfer_id] = transfer
        del self.pending_transfers[transfer_id]
        
        logger.info(f"Completed transfer {transfer_id} from agent {from_agent_id} to {to_agent_id}: {amount} {asset}")
        return transfer
    
    def transfer_from_vault(self, to_agent_id: str, chain_id: str, 
                           asset: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Transfer funds from master vault to an agent wallet"""
        # Get wallet for agent
        agent_wallets = self.wallet_factory.get_agent_wallets(to_agent_id)
        
        if not agent_wallets:
            raise ValueError(f"No wallets found for agent {to_agent_id}")
        
        # Find appropriate wallet for this chain
        to_wallet = next((w for w in agent_wallets if chain_id in w.chain_accounts), None)
        
        if not to_wallet:
            raise ValueError(f"Agent {to_agent_id} has no wallet for chain {chain_id}")
        
        # Check permissions
        if not to_wallet.permissions['can_receive_funds']:
            raise PermissionError(f"Wallet {to_wallet.wallet_id} doesn't have permission to receive funds")
        
        # Create transaction through master vault
        vault_tx = self.master_vault.create_transaction(
            chain_id=chain_id,
            to_address=to_wallet.chain_accounts[chain_id]['address'],
            amount=amount,
            asset=asset,
            metadata={
                'type': 'vault_to_agent',
                'agent_id': to_agent_id,
                'wallet_id': to_wallet.wallet_id,
                'memo': memo
            }
        )
        
        # Create transfer record
        transfer_id = str(uuid.uuid4())
        transfer = {
            'id': transfer_id,
            'type': 'vault_to_agent',
            'from_vault': True,
            'to_agent': to_agent_id,
            'to_wallet': to_wallet.wallet_id,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending_approval',
            'vault_tx_id': vault_tx['id'],
            'created_at': datetime.now().isoformat(),
            'completed_at': None,
            'tx_hash': None
        }
        
        self.pending_transfers[transfer_id] = transfer
        
        logger.info(f"Created vault transfer {transfer_id} to agent {to_agent_id}: {amount} {asset} (awaiting approval)")
        return transfer
    
    def transfer_to_vault(self, from_agent_id: str, chain_id: str, 
                         asset: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Transfer funds from an agent wallet to the master vault"""
        # Get wallets for agent
        from_wallets = self.wallet_factory.get_agent_wallets(from_agent_id)
        
        if not from_wallets:
            raise ValueError(f"No wallets found for agent {from_agent_id}")
        
        # Find appropriate wallet for this chain
        from_wallet = next((w for w in from_wallets if chain_id in w.chain_accounts), None)
        
        if not from_wallet:
            raise ValueError(f"Agent {from_agent_id} has no wallet for chain {chain_id}")
        
        # Check if sender has enough balance
        balance = from_wallet.get_balance(chain_id, asset)
        if balance < amount:
            raise ValueError(f"Insufficient balance: {balance} {asset} < {amount}")
        
        # Vault address for this chain
        vault_address = self.master_vault.vault_addresses.get(chain_id, {}).get('address')
        if not vault_address:
            raise ValueError(f"No vault address configured for chain {chain_id}")
        
        # Create transfer record
        transfer_id = str(uuid.uuid4())
        transfer = {
            'id': transfer_id,
            'type': 'agent_to_vault',
            'from_agent': from_agent_id,
            'from_wallet': from_wallet.wallet_id,
            'to_vault': True,
            'chain_id': chain_id,
            'asset': asset,
            'amount': amount,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'completed_at': None,
            'tx_hash': None
        }
        
        self.pending_transfers[transfer_id] = transfer
        
        # Execute the transfer
        # In a real implementation, this would interact with chain adapters
        from_address = from_wallet.chain_accounts[chain_id]['address']
        
        # Record the transaction
        from_wallet._record_spend(asset, amount)
        
        # Update status
        transfer['status'] = 'completed'
        transfer['completed_at'] = datetime.now().isoformat()
        transfer['tx_hash'] = f"0x{uuid.uuid4().hex}"  # Simulated tx hash
        
        # Move to completed transfers
        self.completed_transfers[transfer_id] = transfer
        del self.pending_transfers[transfer_id]
        
        logger.info(f"Completed transfer {transfer_id} from agent {from_agent_id} to vault: {amount} {asset}")
        return transfer
    
    def cross_chain_transfer(self, from_agent_id: str, from_chain_id: str, 
                            to_chain_id: str, asset: str, amount: float, 
                            to_agent_id: Optional[str] = None, memo: str = None) -> Dict[str, Any]:
        """Transfer funds across different chains"""
        # Get source wallet
        from_wallets = self.wallet_factory.get_agent_wallets(from_agent_id)
        
        if not from_wallets:
            raise ValueError(f"No wallets found for agent {from_agent_id}")
        
        # Find appropriate wallet for source chain
        from_wallet = next((w for w in from_wallets if from_chain_id in w.chain_accounts), None)
        
        if not from_wallet:
            raise ValueError(f"Agent {from_agent_id} has no wallet for chain {from_chain_id}")
        
        # Determine destination
        if to_agent_id:
            # Transfer to another agent
            to_wallets = self.wallet_factory.get_agent_wallets(to_agent_id)
            
            if not to_wallets:
                raise ValueError(f"No wallets found for agent {to_agent_id}")
            
            # Find appropriate wallet for destination chain
            to_wallet = next((w for w in to_wallets if to_chain_id in w.chain_accounts), None)
            
            if not to_wallet:
                raise ValueError(f"Agent {to_agent_id} has no wallet for chain {to_chain_id}")
                
            to_address = to_wallet.chain_accounts[to_chain_id]['address']
            destination_type = 'agent'
            destination_id = to_agent_id
            destination_wallet = to_wallet.wallet_id
        else:
            # Transfer to self on another chain
            # Check if agent has wallet on destination chain
            to_wallet = next((w for w in from_wallets if to_chain_id in w.chain_accounts), None)
            
            if not to_wallet:
                raise ValueError(f"Agent {from_agent_id} has no wallet for chain {to_chain_id}")
                
            to_address = to_wallet.chain_accounts[to_chain_id]['address']
            destination_type = 'self'
            destination_id = from_agent_id
            destination_wallet = to_wallet.wallet_id
        
        # Check permissions
        if destination_type == 'agent' and not from_wallet.permissions['can_transfer_to_agents']:
            raise PermissionError(f"Wallet {from_wallet.wallet_id} doesn't have permission to transfer to other agents")
        
        # Find optimal bridge and route
        bridge_info = self._find_optimal_bridge(from_chain_id, to_chain_id, asset)
        
        if not bridge_info:
            raise ValueError(f"No bridge available for {from_chain_id} -> {to_chain_id} for asset {asset}")
        
        # Check if sender has enough balance
        balance = from_wallet.get_balance(from_chain_id, asset)
        estimated_fee = bridge_info['estimated_fee']
        
        if balance < amount + estimated_fee:
            raise ValueError(f"Insufficient balance: {balance} {asset} < {amount + estimated_fee} (including bridge fee)")
        
        # Create transfer record
        transfer_id = str(uuid.uuid4())
        transfer = {
            'id': transfer_id,
            'type': 'cross_chain',
            'from_agent': from_agent_id,
            'from_wallet': from_wallet.wallet_id,
            'from_chain': from_chain_id,
            'to_chain': to_chain_id,
            'destination_type': destination_type,
            'destination_id': destination_id,
            'destination_wallet': destination_wallet,
            'asset': asset,
            'amount': amount,
            'bridge': bridge_info['name'],
            'estimated_fee': estimated_fee,
            'memo': memo,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'steps': [
                {
                    'step': 1,
                    'description': f"Initiate transfer on {from_chain_id}",
                    'status': 'pending'
                },
                {
                    'step': 2,
                    'description': f"Bridge from {from_chain_id} to {to_chain_id}",
                    'status': 'pending'
                },
                {
                    'step': 3,
                    'description': f"Confirm receipt on {to_chain_id}",
                    'status': 'pending'
                }
            ],
            'completed_at': None,
            'source_tx_hash': None,
            'destination_tx_hash': None
        }
        
        self.pending_transfers[transfer_id] = transfer
        
        # In a real implementation, this would interact with bridge adapters
        # For now, we'll simulate the process
        
        # Step 1: Initiate on source chain
        transfer['steps'][0]['status'] = 'completed'
        transfer['source_tx_hash'] = f"0x{uuid.uuid4().hex}"
        
        # Step 2: Bridge process
        transfer['steps'][1]['status'] = 'completed'
        
        # Step 3: Confirm on destination chain
        transfer['steps'][2]['status'] = 'completed'
        transfer['destination_tx_hash'] = f"0x{uuid.uuid4().hex}"
        
        # Record the transaction
        from_wallet._record_spend(asset, amount + estimated_fee)
        
        # Update status
        transfer['status'] = 'completed'
        transfer['completed_at'] = datetime.now().isoformat()
        
        # Move to completed transfers
        self.completed_transfers[transfer_id] = transfer
        del self.pending_transfers[transfer_id]
        
        logger.info(f"Completed cross-chain transfer {transfer_id} from {from_chain_id} to {to_chain_id}: {amount} {asset}")
        return transfer
    
    def get_transfer_status(self, transfer_id: str) -> Dict[str, Any]:
        """Get the status of a transfer"""
        if transfer_id in self.pending_transfers:
            return self.pending_transfers[transfer_id]
        elif transfer_id in self.completed_transfers:
            return self.completed_transfers[transfer_id]
        else:
            raise ValueError(f"Transfer {transfer_id} not found")
    
    def get_pending_transfers(self) -> List[Dict[str, Any]]:
        """Get all pending transfers"""
        return list(self.pending_transfers.values())
    
    def get_completed_transfers(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent completed transfers"""
        transfers = list(self.completed_transfers.values())
        transfers.sort(key=lambda x: x['completed_at'], reverse=True)
        return transfers[:limit]
    
    def get_agent_transfers(self, agent_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transfers for a specific agent"""
        # Get all transfers involving this agent
        all_transfers = list(self.completed_transfers.values()) + list(self.pending_transfers.values())
        
        # Filter transfers involving this agent
        agent_transfers = [
            t for t in all_transfers if 
            t.get('from_agent') == agent_id or 
            t.get('to_agent') == agent_id or
            t.get('destination_id') == agent_id
        ]
        
        # Sort by creation date, newest first
        agent_transfers.sort(key=lambda x: x['created_at'], reverse=True)
        
        return agent_transfers[:limit]
    
    def get_available_bridges(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get information about available bridges"""
        return self.bridges
    
    def get_optimal_route(self, from_chain_id: str, to_chain_id: str, 
                        asset: str) -> Dict[str, Any]:
        """Get the optimal route for a cross-chain transfer"""
        return self._find_optimal_bridge(from_chain_id, to_chain_id, asset)
    
    def _load_bridges(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load bridge configurations"""
        # In production, this would load from configuration
        # For now, we'll define some common bridges
        return {
            'ethereum': [
                {
                    'name': 'Arbitrum Bridge',
                    'target_chains': ['arbitrum'],
                    'assets': ['ETH', 'USDC', 'WETH'],
                    'estimated_time': 30,  # minutes
                    'estimated_fee': 0.001  # ETH
                },
                {
                    'name': 'Optimism Bridge',
                    'target_chains': ['optimism'],
                    'assets': ['ETH', 'USDC', 'WETH'],
                    'estimated_time': 25,  # minutes
                    'estimated_fee': 0.001  # ETH
                },
                {
                    'name': 'zkSync Bridge',
                    'target_chains': ['zksync'],
                    'assets': ['ETH', 'USDC'],
                    'estimated_time': 15,  # minutes
                    'estimated_fee': 0.0015  # ETH
                }
            ],
            'arbitrum': [
                {
                    'name': 'Arbitrum Bridge',
                    'target_chains': ['ethereum'],
                    'assets': ['ETH', 'USDC', 'WETH'],
                    'estimated_time': 7 * 24 * 60,  # 7 days in minutes
                    'estimated_fee': 0.0001  # ETH
                }
            ],
            'optimism': [
                {
                    'name': 'Optimism Bridge',
                    'target_chains': ['ethereum'],
                    'assets': ['ETH', 'USDC', 'WETH'],
                    'estimated_time': 7 * 24 * 60,  # 7 days in minutes
                    'estimated_fee': 0.0001  # ETH
                }
            ],
            'solana': [
                {
                    'name': 'Wormhole',
                    'target_chains': ['ethereum', 'sui'],
                    'assets': ['SOL', 'USDC'],
                    'estimated_time': 20,  # minutes
                    'estimated_fee': 0.0001  # SOL
                }
            ],
            'sui': [
                {
                    'name': 'Wormhole',
                    'target_chains': ['ethereum', 'solana'],
                    'assets': ['SUI', 'USDC'],
                    'estimated_time': 20,  # minutes
                    'estimated_fee': 0.01  # SUI
                }
            ]
        }
    
    def _load_routes(self) -> Dict[str, Dict[str, List[str]]]:
        """Load routing information for cross-chain transfers"""
        # In production, this would be more sophisticated
        # For now, we'll define direct routes based on bridges
        routes = {}
        
        for from_chain, bridges in self.bridges.items():
            routes[from_chain] = {}
            
            for bridge in bridges:
                for target_chain in bridge['target_chains']:
                    if target_chain not in routes[from_chain]:
                        routes[from_chain][target_chain] = []
                    
                    routes[from_chain][target_chain].append(bridge['name'])
        
        return routes
    
    def _find_optimal_bridge(self, from_chain_id: str, to_chain_id: str, 
                           asset: str) -> Optional[Dict[str, Any]]:
        """Find the optimal bridge for a cross-chain transfer"""
        if from_chain_id not in self.bridges:
            return None
        
        # Check for direct bridges
        bridges = self.bridges[from_chain_id]
        valid_bridges = []
        
        for bridge in bridges:
            if to_chain_id in bridge['target_chains'] and asset in bridge['assets']:
                valid_bridges.append(bridge)
        
        if not valid_bridges:
            return None
        
        # Find bridge with lowest fee
        return min(valid_bridges, key=lambda b: b['estimated_fee'])
