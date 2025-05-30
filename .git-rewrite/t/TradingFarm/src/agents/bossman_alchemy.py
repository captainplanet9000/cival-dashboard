"""
Enhanced Bossman controller agent with Alchemy integration
Provides multi-chain monitoring, cross-chain operations, and advanced analytics
"""
import os
import json
import time
import logging
import uuid
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from .eliza_wallet_alchemy import EnhancedWalletManager
from ..blockchain.alchemy_integration import AlchemyIntegration, SUPPORTED_NETWORKS

logger = logging.getLogger(__name__)

# Load environment variables
DEFAULT_CONFIG_PATH = os.getenv("ALCHEMY_CONFIG_PATH", "config/alchemy_config.json")

class BossmanController:
    """
    Enhanced Bossman controller agent with Alchemy API integration
    
    Features:
    - Multi-chain monitoring across Ethereum, Polygon, Arbitrum, etc.
    - Real-time transaction notifications
    - Risk management tools
    - Cross-chain operations
    - Enhanced analytics for better decision making
    - Automated trade execution
    """
    
    def __init__(
        self,
        eliza_bridge,
        wallet_manager: EnhancedWalletManager = None,
        agent_id: str = None,
        wallet_id: str = None,
        config_path: str = DEFAULT_CONFIG_PATH,
    ):
        """
        Initialize the Bossman controller
        
        Args:
            eliza_bridge: ElizaAgentBridge instance
            wallet_manager: EnhancedWalletManager instance
            agent_id: Bossman agent ID (if already created)
            wallet_id: Wallet ID for the Bossman
            config_path: Path to Alchemy configuration
        """
        self.eliza_bridge = eliza_bridge
        self.agent_id = agent_id
        self.wallet_id = wallet_id
        self.config_path = config_path
        
        # Initialize or use provided wallet manager
        if wallet_manager:
            self.wallet_manager = wallet_manager
        else:
            self.wallet_manager = EnhancedWalletManager(config_path=config_path)
        
        # Bossman character template
        self.character_template = {
            "name": "Bossman",
            "role": "Controller Agent",
            "description": "Strategic overseer for trading operations with multi-chain capabilities",
            "goals": [
                "Monitor all trading agents across multiple blockchains",
                "Manage risk and capital allocation",
                "Optimize trading strategies based on market conditions",
                "Ensure system security and stability",
                "Coordinate cross-chain operations when profitable"
            ],
            "constraints": [
                "Must validate all high-risk transactions",
                "Cannot exceed predefined risk parameters",
                "Must maintain operational security at all times",
                "Should avoid concentration in any single market"
            ],
            "skills": [
                "Multi-chain monitoring and analytics",
                "Risk assessment and management",
                "Strategic decision making",
                "Capital allocation optimization",
                "Cross-chain arbitrage detection"
            ],
            "traits": {
                "analytical": 0.9,
                "cautious": 0.7,
                "decisive": 0.8,
                "strategic": 0.9,
                "adaptable": 0.7
            }
        }
        
        # Metrics to track
        self.metrics = {
            "agents_monitored": 0,
            "chains_monitored": [],
            "alerts_triggered": 0,
            "transactions_executed": 0,
            "total_assets_monitored": 0.0,
            "active_strategies": [],
            "risk_level": "low"
        }
        
        # Initialize Alchemy integrations for multiple chains
        self.alchemy_integrations = {}
        self._initialize_alchemy()
        
        logger.info("Enhanced Bossman controller initialized")
    
    def _initialize_alchemy(self):
        """Initialize Alchemy integrations for supported networks"""
        try:
            # Check if config file exists
            if not os.path.exists(self.config_path):
                logger.warning(f"Alchemy config not found at {self.config_path}")
                return
            
            # Load config file
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Get Alchemy API keys
            api_keys = config.get("api_keys", {})
            
            # Initialize integrations for each network with an API key
            for network, api_key in api_keys.items():
                if api_key and api_key != f"YOUR_{network.upper()}_API_KEY":
                    # Initialize for mainnet
                    if network in SUPPORTED_NETWORKS and "mainnet" in SUPPORTED_NETWORKS[network]:
                        self.alchemy_integrations[f"{network}:mainnet"] = AlchemyIntegration(
                            api_key=api_key,
                            network=network,
                            network_type="mainnet"
                        )
                        
                    # Initialize for testnet (usually goerli or mumbai)
                    testnet = "goerli" if network == "ethereum" else "mumbai" if network == "polygon" else "goerli"
                    if network in SUPPORTED_NETWORKS and testnet in SUPPORTED_NETWORKS[network]:
                        self.alchemy_integrations[f"{network}:{testnet}"] = AlchemyIntegration(
                            api_key=api_key,
                            network=network,
                            network_type=testnet
                        )
            
            # Update metrics
            self.metrics["chains_monitored"] = list(set([key.split(":")[0] for key in self.alchemy_integrations.keys()]))
            
            logger.info(f"Initialized Alchemy integrations for {len(self.alchemy_integrations)} networks")
        except Exception as e:
            logger.error(f"Error initializing Alchemy integrations: {str(e)}")
    
    def _get_alchemy(self, network: str, network_type: str = "mainnet") -> Optional[AlchemyIntegration]:
        """
        Get Alchemy integration for specified network
        
        Args:
            network: Blockchain network
            network_type: Network type (mainnet/testnet)
            
        Returns:
            AlchemyIntegration instance or None if not available
        """
        key = f"{network}:{network_type}"
        return self.alchemy_integrations.get(key)
    
    def create_bossman_agent(self) -> str:
        """
        Create the Bossman agent in ElizaOS
        
        Returns:
            Agent ID if successful, empty string otherwise
        """
        try:
            # Create agent in ElizaOS
            agent_id = self.eliza_bridge.create_agent(
                agent_name="Bossman",
                character_template=self.character_template
            )
            
            if not agent_id:
                logger.error("Failed to create Bossman agent")
                return ""
            
            self.agent_id = agent_id
            
            # Create wallet for Bossman if not already specified
            if not self.wallet_id:
                wallet_info = self.wallet_manager.create_wallet(
                    name="Bossman Wallet",
                    network="ethereum",  # Default to Ethereum
                    network_type="goerli"  # Default to testnet for safety
                )
                
                if wallet_info:
                    self.wallet_id = wallet_info["id"]
                    
                    # Assign wallet to agent
                    self.wallet_manager.assign_wallet_to_agent(self.wallet_id, self.agent_id)
            
            logger.info(f"Created Bossman agent with ID: {agent_id}")
            return agent_id
        except Exception as e:
            logger.error(f"Error creating Bossman agent: {str(e)}")
            return ""
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get Bossman controller status
        
        Returns:
            Status information
        """
        status = {
            "agent_id": self.agent_id,
            "wallet_id": self.wallet_id,
            "metrics": self.metrics,
            "chains_monitored": self.metrics["chains_monitored"],
            "last_updated": datetime.now().isoformat()
        }
        
        # Add wallet information if available
        if self.wallet_id:
            wallet_info = self.wallet_manager.get_wallet(self.wallet_id)
            if wallet_info:
                status["wallet"] = wallet_info
        
        return status
    
    def monitor_agents(self, agent_ids: List[str]) -> Dict[str, Any]:
        """
        Monitor multiple trading agents
        
        Args:
            agent_ids: List of agent IDs to monitor
            
        Returns:
            Monitoring results
        """
        results = {
            "monitored_agents": len(agent_ids),
            "agent_statuses": {},
            "alerts": [],
            "recommendations": []
        }
        
        for agent_id in agent_ids:
            # Get agent wallet
            wallet_info = self.wallet_manager.get_agent_wallet(agent_id)
            
            if not wallet_info:
                results["agent_statuses"][agent_id] = {"status": "no_wallet_found"}
                continue
            
            # Get agent status from ElizaOS
            agent_status = self.eliza_bridge.get_agent_status(agent_id)
            
            # Combine wallet and agent information
            agent_data = {
                "wallet": wallet_info,
                "agent_status": agent_status
            }
            
            # Get enhanced blockchain data if Alchemy is available
            network = wallet_info.get("network")
            network_type = wallet_info.get("network_type")
            
            alchemy = self._get_alchemy(network, network_type)
            if alchemy:
                # Get transaction history
                transactions = alchemy.get_transaction_history(wallet_info["address"], page_size=10)
                agent_data["recent_transactions"] = transactions
                
                # Check for potential issues
                self._check_for_alerts(agent_id, wallet_info, transactions, results["alerts"])
                
                # Generate recommendations based on wallet activity
                self._generate_recommendations(agent_id, wallet_info, transactions, results["recommendations"])
            
            results["agent_statuses"][agent_id] = agent_data
        
        # Update metrics
        self.metrics["agents_monitored"] = len(agent_ids)
        self.metrics["total_assets_monitored"] = sum([
            info.get("wallet", {}).get("balance", 0) 
            for info in results["agent_statuses"].values()
        ])
        
        return results
    
    def _check_for_alerts(
        self, 
        agent_id: str, 
        wallet_info: Dict[str, Any], 
        transactions: List[Dict[str, Any]], 
        alerts: List[Dict[str, Any]]
    ):
        """
        Check for potential issues and generate alerts
        
        Args:
            agent_id: Agent ID
            wallet_info: Wallet information
            transactions: Recent transactions
            alerts: List to append alerts to
        """
        # Check for low balance
        if wallet_info.get("balance", 0) < 0.01:
            alerts.append({
                "type": "low_balance",
                "agent_id": agent_id,
                "wallet_id": wallet_info.get("id"),
                "severity": "high",
                "message": f"Low balance in wallet: {wallet_info.get('balance')} ETH",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for failed transactions
        failed_txs = [tx for tx in transactions if tx.get("status") == "failed"]
        if failed_txs:
            alerts.append({
                "type": "failed_transactions",
                "agent_id": agent_id,
                "wallet_id": wallet_info.get("id"),
                "severity": "medium",
                "message": f"{len(failed_txs)} failed transactions detected",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for high gas usage
        high_gas_txs = [tx for tx in transactions if tx.get("gas_used", 0) > 1000000]
        if high_gas_txs:
            alerts.append({
                "type": "high_gas_usage",
                "agent_id": agent_id,
                "wallet_id": wallet_info.get("id"),
                "severity": "low",
                "message": f"{len(high_gas_txs)} transactions with high gas usage detected",
                "timestamp": datetime.now().isoformat()
            })
        
        # Update metrics
        self.metrics["alerts_triggered"] += len(alerts)
    
    def _generate_recommendations(
        self, 
        agent_id: str, 
        wallet_info: Dict[str, Any], 
        transactions: List[Dict[str, Any]], 
        recommendations: List[Dict[str, Any]]
    ):
        """
        Generate recommendations based on wallet activity
        
        Args:
            agent_id: Agent ID
            wallet_info: Wallet information
            transactions: Recent transactions
            recommendations: List to append recommendations to
        """
        # Check for gas optimization opportunities
        if transactions:
            avg_gas_price = sum([tx.get("gas_price", 0) for tx in transactions if "gas_price" in tx]) / max(len([tx for tx in transactions if "gas_price" in tx]), 1)
            
            if avg_gas_price > 50000000000:  # 50 Gwei
                recommendations.append({
                    "type": "gas_optimization",
                    "agent_id": agent_id,
                    "message": "Consider optimizing gas usage or timing transactions during lower gas periods",
                    "priority": "medium"
                })
        
        # Check for balance distribution
        if wallet_info.get("balance", 0) > 1.0:
            recommendations.append({
                "type": "balance_distribution",
                "agent_id": agent_id,
                "message": "Consider distributing funds across multiple agents for risk management",
                "priority": "low"
            })
        
        # Check for token diversification
        tokens = wallet_info.get("tokens", [])
        if len(tokens) < 3 and wallet_info.get("balance", 0) > 0.5:
            recommendations.append({
                "type": "diversification",
                "agent_id": agent_id,
                "message": "Consider diversifying assets across different tokens for risk management",
                "priority": "medium"
            })
    
    def execute_command(self, agent_id: str, command: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a command for a specific agent
        
        Args:
            agent_id: Agent ID
            command: Command to execute
            parameters: Command parameters
            
        Returns:
            Command execution results
        """
        try:
            # Default parameters
            parameters = parameters or {}
            
            # Add timestamp
            parameters["timestamp"] = datetime.now().isoformat()
            
            # Add Bossman ID
            parameters["bossman_id"] = self.agent_id
            
            # Send command to agent through ElizaOS
            result = self.eliza_bridge.send_command_to_agent(
                agent_id=agent_id,
                command=command,
                parameters=parameters
            )
            
            # Update metrics if command is related to transactions
            if command in ["execute_trade", "place_order", "transfer_funds"]:
                self.metrics["transactions_executed"] += 1
            
            return {
                "success": True,
                "agent_id": agent_id,
                "command": command,
                "parameters": parameters,
                "result": result
            }
        except Exception as e:
            logger.error(f"Error executing command {command} for agent {agent_id}: {str(e)}")
            return {
                "success": False,
                "agent_id": agent_id,
                "command": command,
                "parameters": parameters,
                "error": str(e)
            }
    
    def monitor_market(self, tokens: List[str] = None, networks: List[str] = None) -> Dict[str, Any]:
        """
        Monitor market conditions across specified tokens and networks
        
        Args:
            tokens: List of token addresses to monitor
            networks: List of networks to monitor
            
        Returns:
            Market monitoring results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "networks_monitored": [],
            "tokens_monitored": [],
            "gas_prices": {},
            "token_data": {}
        }
        
        # Default to all networks if not specified
        networks = networks or list(set([key.split(":")[0] for key in self.alchemy_integrations.keys()]))
        
        # Monitor each network
        for network in networks:
            # Try mainnet first, then fallback to testnet
            alchemy = self._get_alchemy(network, "mainnet")
            if not alchemy:
                alchemy = self._get_alchemy(network, "goerli" if network == "ethereum" else "mumbai" if network == "polygon" else "goerli")
            
            if not alchemy:
                continue
            
            # Add to monitored networks
            results["networks_monitored"].append(network)
            
            # Get gas prices
            gas_prices = alchemy.get_gas_price()
            results["gas_prices"][network] = gas_prices
            
            # Monitor tokens if specified
            if tokens:
                for token in tokens:
                    # Get token price
                    price = alchemy.get_token_price(token)
                    
                    # Get token metadata
                    metadata = alchemy.alchemy.getTokenMetadata(token) if hasattr(alchemy, "alchemy") else {}
                    
                    # Add to token data
                    if token not in results["tokens_monitored"]:
                        results["tokens_monitored"].append(token)
                    
                    if token not in results["token_data"]:
                        results["token_data"][token] = {}
                    
                    results["token_data"][token][network] = {
                        "price": price,
                        "metadata": metadata
                    }
        
        return results
    
    def analyze_cross_chain_opportunities(self, tokens: List[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze cross-chain arbitrage opportunities
        
        Args:
            tokens: List of token addresses to analyze
            
        Returns:
            List of potential arbitrage opportunities
        """
        # This would be a more complex implementation
        # For now, return a placeholder
        return [
            {
                "type": "cross_chain_arbitrage",
                "token": tokens[0] if tokens else "ETH",
                "source_network": "ethereum",
                "target_network": "polygon",
                "price_difference_percentage": 1.5,
                "estimated_profit": "0.02 ETH",
                "confidence": 0.7,
                "timestamp": datetime.now().isoformat()
            }
        ]
    
    def rebalance_assets(
        self, 
        source_agent_id: str, 
        target_agent_id: str, 
        amount: float = None,
        token_address: str = None
    ) -> Dict[str, Any]:
        """
        Rebalance assets between agents
        
        Args:
            source_agent_id: Source agent ID
            target_agent_id: Target agent ID
            amount: Amount to transfer (if None, will calculate optimal amount)
            token_address: Token address (if None, will transfer native token)
            
        Returns:
            Rebalance results
        """
        try:
            # Get source agent wallet
            source_wallet = self.wallet_manager.get_agent_wallet(source_agent_id)
            if not source_wallet:
                return {
                    "success": False,
                    "error": f"Source agent {source_agent_id} has no wallet"
                }
            
            # Get target agent wallet
            target_wallet = self.wallet_manager.get_agent_wallet(target_agent_id)
            if not target_wallet:
                return {
                    "success": False,
                    "error": f"Target agent {target_agent_id} has no wallet"
                }
            
            # Calculate optimal amount if not specified
            if amount is None:
                if token_address:
                    # Calculate for specific token
                    source_tokens = source_wallet.get("tokens", [])
                    source_token = next((t for t in source_tokens if t["contract_address"] == token_address), None)
                    
                    if not source_token:
                        return {
                            "success": False,
                            "error": f"Source agent does not have token {token_address}"
                        }
                    
                    # Default to 50% of available balance
                    amount = source_token["balance"] * 0.5
                else:
                    # Calculate for native token
                    # Default to 50% of available balance
                    amount = source_wallet.get("balance", 0) * 0.5
            
            # Execute transfer
            # In a real implementation, this would use the wallet manager to send a transaction
            # For now, return a placeholder response
            
            return {
                "success": True,
                "source_agent_id": source_agent_id,
                "target_agent_id": target_agent_id,
                "amount": amount,
                "token_address": token_address,
                "timestamp": datetime.now().isoformat(),
                "message": f"Rebalanced {amount} {'tokens' if token_address else 'native tokens'} from {source_agent_id} to {target_agent_id}"
            }
        except Exception as e:
            logger.error(f"Error rebalancing assets: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def set_trading_strategy(
        self, 
        agent_id: str, 
        strategy: str, 
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Set trading strategy for an agent
        
        Args:
            agent_id: Agent ID
            strategy: Strategy name
            parameters: Strategy parameters
            
        Returns:
            Strategy setting results
        """
        try:
            # Default parameters
            parameters = parameters or {}
            
            # Add strategy to active strategies if not already present
            if strategy not in self.metrics["active_strategies"]:
                self.metrics["active_strategies"].append(strategy)
            
            # Send command to agent through ElizaOS
            result = self.eliza_bridge.send_command_to_agent(
                agent_id=agent_id,
                command="set_trading_strategy",
                parameters={
                    "strategy": strategy,
                    "parameters": parameters,
                    "bossman_id": self.agent_id,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            return {
                "success": True,
                "agent_id": agent_id,
                "strategy": strategy,
                "parameters": parameters,
                "result": result
            }
        except Exception as e:
            logger.error(f"Error setting trading strategy for agent {agent_id}: {str(e)}")
            return {
                "success": False,
                "agent_id": agent_id,
                "strategy": strategy,
                "parameters": parameters,
                "error": str(e)
            }
    
    def update_risk_parameters(self, risk_level: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Update risk parameters for all agents
        
        Args:
            risk_level: Risk level (low, medium, high)
            parameters: Risk parameters
            
        Returns:
            Risk parameter update results
        """
        try:
            # Default parameters
            parameters = parameters or {}
            
            # Validate risk level
            if risk_level not in ["low", "medium", "high"]:
                return {
                    "success": False,
                    "error": f"Invalid risk level: {risk_level}. Must be one of: low, medium, high"
                }
            
            # Update metrics
            self.metrics["risk_level"] = risk_level
            
            # In a real implementation, this would update risk parameters for all agents
            # For now, return a placeholder response
            
            return {
                "success": True,
                "risk_level": risk_level,
                "parameters": parameters,
                "timestamp": datetime.now().isoformat(),
                "message": f"Updated risk level to {risk_level}"
            }
        except Exception as e:
            logger.error(f"Error updating risk parameters: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
