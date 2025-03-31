"""
Sonic Protocol Agent Module for TradingFarm

This module provides agent classes for trading on Sonic Protocol through ElizaOS.
Agents can monitor markets, execute swaps, and manage liquidity positions automatically.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union
from decimal import Decimal

from ..blockchain.sonic_integration import SonicClient
from .base_agent import BaseAgent
from .eliza_bridge import ElizaAgentBridge

# Set up logging
logger = logging.getLogger(__name__)

class SonicAgent(BaseAgent):
    """
    Agent for trading on Sonic Protocol
    """
    
    def __init__(self, agent_id: str, name: str, private_key: str = None, 
                 use_testnet: bool = True, eliza_bridge=None,
                 config: Dict[str, Any] = None):
        """
        Initialize the Sonic Protocol agent
        
        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable name for the agent
            private_key: Sui private key for signing transactions
            use_testnet: Whether to use testnet or mainnet
            eliza_bridge: ElizaOS bridge for agent communication
            config: Additional configuration parameters
        """
        super().__init__(agent_id, name, eliza_bridge)
        
        self.agent_type = "sonic"
        self.private_key = private_key
        self.use_testnet = use_testnet
        self.config = config or {}
        
        # Initialize client
        self.client = SonicClient(
            private_key=private_key,
            use_testnet=use_testnet
        )
        self.address = self.client.address
        
        # Trading state
        self.active_pairs = self.config.get("active_pairs", [
            ("SUI", "USDC"),
            ("SUI", "USDT"),
            ("WETH", "USDC")
        ])
        self.swap_limits = self.config.get("swap_limits", {})
        self.liquidity_positions = {}
        self.pools = {}
        self.market_data = {}
        
        # Monitoring settings
        self.monitor_interval = self.config.get("monitor_interval", 60)  # seconds
        self.is_monitoring = False
        self.monitor_task = None
        
        # Strategy settings
        self.strategies = {}
        self.risk_management = self.config.get("risk_management", {
            "max_swap_amount": {
                "SUI": 1000,
                "USDC": 1000,
                "USDT": 1000,
                "WETH": 0.5
            },
            "max_slippage": 0.005,     # 0.5% max slippage
            "profit_target_pct": 0.02,  # 2% profit target for automatic swaps
            "loss_limit_pct": 0.01     # 1% loss limit for automatic swaps
        })
        
        logger.info(f"Initialized Sonic agent: {name} ({agent_id})")
    
    async def start(self):
        """
        Start the agent and initialize monitoring
        """
        logger.info(f"Starting Sonic agent: {self.name}")
        
        # Load pools
        await self.update_pools()
        
        # Load market data
        await self.update_market_data()
        
        # Load liquidity positions
        await self.update_liquidity_positions()
        
        # Start monitoring
        self.start_monitoring()
        
        # Notify ElizaOS
        await self.send_status_update("started")
    
    async def stop(self):
        """
        Stop the agent and cleanup resources
        """
        logger.info(f"Stopping Sonic agent: {self.name}")
        
        # Stop monitoring
        self.stop_monitoring()
        
        # Notify ElizaOS
        await self.send_status_update("stopped")
    
    def start_monitoring(self):
        """
        Start monitoring markets and positions
        """
        if self.is_monitoring:
            logger.warning(f"Monitoring already started for agent: {self.name}")
            return
        
        self.is_monitoring = True
        self.monitor_task = asyncio.create_task(self.monitor_loop())
        logger.info(f"Started monitoring for agent: {self.name}")
    
    def stop_monitoring(self):
        """
        Stop monitoring markets and positions
        """
        if not self.is_monitoring:
            logger.warning(f"Monitoring already stopped for agent: {self.name}")
            return
        
        self.is_monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            self.monitor_task = None
        
        logger.info(f"Stopped monitoring for agent: {self.name}")
    
    async def monitor_loop(self):
        """
        Main monitoring loop for markets and positions
        """
        logger.info(f"Monitor loop started for agent: {self.name}")
        
        try:
            while self.is_monitoring:
                try:
                    # Update pools
                    await self.update_pools()
                    
                    # Update market data
                    await self.update_market_data()
                    
                    # Update liquidity positions
                    await self.update_liquidity_positions()
                    
                    # Run strategies
                    await self.run_strategies()
                    
                    # Apply risk management
                    await self.apply_risk_management()
                    
                    # Send status update to ElizaOS
                    await self.send_status_update("monitoring")
                    
                except Exception as e:
                    logger.error(f"Error in monitor loop: {str(e)}")
                
                # Wait for next iteration
                await asyncio.sleep(self.monitor_interval)
        except asyncio.CancelledError:
            logger.info(f"Monitor loop cancelled for agent: {self.name}")
        except Exception as e:
            logger.error(f"Unexpected error in monitor loop: {str(e)}")
            
            # Notify ElizaOS
            await self.send_status_update("error", {
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def update_pools(self):
        """
        Update pools for all active pairs
        """
        logger.debug(f"Updating pools for agent: {self.name}")
        
        try:
            # Get all pools
            pools = await self.client.get_pools()
            
            # Update pools for active pairs
            self.pools = {}
            
            for token_a, token_b in self.active_pairs:
                # Find pool for pair
                pool = await self.client.get_pool_by_tokens(token_a, token_b)
                
                if pool:
                    pair_key = f"{token_a}-{token_b}"
                    self.pools[pair_key] = pool
                    logger.debug(f"Updated pool for {pair_key}")
                else:
                    logger.warning(f"Pool not found for pair: {token_a}-{token_b}")
            
            logger.debug(f"Updated pools: {len(self.pools)} active pools")
        except Exception as e:
            logger.error(f"Error updating pools: {str(e)}")
    
    async def update_market_data(self):
        """
        Update market data for all active pairs
        """
        logger.debug(f"Updating market data for agent: {self.name}")
        
        try:
            # Get overall market data
            market_data = await self.client.get_market_data()
            
            # Update market data for active tokens
            self.market_data = {"overall": market_data}
            
            # Unique tokens from active pairs
            unique_tokens = set()
            for token_a, token_b in self.active_pairs:
                unique_tokens.add(token_a)
                unique_tokens.add(token_b)
            
            # Get token-specific market data
            for token in unique_tokens:
                try:
                    token_data = await self.client.get_token_market_data(token)
                    self.market_data[token] = token_data
                    
                    # Get historical prices
                    history = await self.client.get_historical_prices(token, "1d")
                    self.market_data[f"{token}_history"] = history
                    
                    logger.debug(f"Updated market data for {token}")
                except Exception as e:
                    logger.error(f"Error updating market data for {token}: {str(e)}")
            
            # Get pool reserves for active pairs
            for pair_key, pool in self.pools.items():
                try:
                    pool_id = pool.get("id")
                    if pool_id:
                        reserves = await self.client.get_pool_reserves(pool_id)
                        self.market_data[f"{pair_key}_reserves"] = reserves
                        logger.debug(f"Updated reserves for {pair_key}")
                except Exception as e:
                    logger.error(f"Error updating reserves for {pair_key}: {str(e)}")
            
            logger.debug(f"Updated market data for {len(unique_tokens)} tokens")
        except Exception as e:
            logger.error(f"Error updating market data: {str(e)}")
    
    async def update_liquidity_positions(self):
        """
        Update current liquidity positions
        """
        logger.debug(f"Updating liquidity positions for agent: {self.name}")
        
        try:
            # Get positions from client
            positions_data = await self.client.get_pool_positions()
            
            # Process and store positions
            self.liquidity_positions = {}
            
            for position in positions_data:
                position_id = position.get("id")
                pool_id = position.get("poolId")
                
                # Find pair for pool ID
                pair_key = None
                for pk, pool in self.pools.items():
                    if pool.get("id") == pool_id:
                        pair_key = pk
                        break
                
                if not pair_key:
                    logger.warning(f"Pair not found for pool ID: {pool_id}")
                    continue
                
                # Store position
                if pair_key not in self.liquidity_positions:
                    self.liquidity_positions[pair_key] = []
                
                self.liquidity_positions[pair_key].append(position)
            
            logger.debug(f"Updated liquidity positions: {sum(len(positions) for positions in self.liquidity_positions.values())} active positions")
        except Exception as e:
            logger.error(f"Error updating liquidity positions: {str(e)}")
    
    async def run_strategies(self):
        """
        Run active trading strategies
        """
        logger.debug(f"Running strategies for agent: {self.name}")
        
        for pair_key, strategy in self.strategies.items():
            if pair_key not in self.pools:
                continue
            
            try:
                # Get market data for pair
                token_a, token_b = pair_key.split("-")
                
                # Combine relevant market data
                combined_data = {
                    "pool": self.pools.get(pair_key),
                    "reserves": self.market_data.get(f"{pair_key}_reserves"),
                    "token_a": self.market_data.get(token_a),
                    "token_b": self.market_data.get(token_b),
                    "token_a_history": self.market_data.get(f"{token_a}_history"),
                    "token_b_history": self.market_data.get(f"{token_b}_history")
                }
                
                # Run strategy
                signals = strategy.generate_signals(combined_data)
                
                # Process signals
                for signal in signals:
                    await self.process_trading_signal(pair_key, signal)
            except Exception as e:
                logger.error(f"Error running strategy for {pair_key}: {str(e)}")
    
    async def apply_risk_management(self):
        """
        Apply risk management rules to positions and swaps
        """
        logger.debug(f"Applying risk management for agent: {self.name}")
        
        # Check for profit-taking or loss-limiting opportunities
        for pair_key in self.pools:
            try:
                token_a, token_b = pair_key.split("-")
                
                # Skip if we don't have market data for both tokens
                if token_a not in self.market_data or token_b not in self.market_data:
                    continue
                
                # Get historical price data
                token_a_history = self.market_data.get(f"{token_a}_history", [])
                token_b_history = self.market_data.get(f"{token_b}_history", [])
                
                if not token_a_history or not token_b_history:
                    continue
                
                # Calculate price change over 24h for both tokens
                try:
                    # Get latest and 24h old prices
                    token_a_latest = float(token_a_history[-1]["price"])
                    token_a_old = float(token_a_history[0]["price"])
                    
                    token_b_latest = float(token_b_history[-1]["price"])
                    token_b_old = float(token_b_history[0]["price"])
                    
                    # Calculate price changes
                    token_a_change = (token_a_latest - token_a_old) / token_a_old
                    token_b_change = (token_b_latest - token_b_old) / token_b_old
                    
                    # Calculate relative price change (a vs b)
                    relative_change = token_a_change - token_b_change
                    
                    # Check for profit target or loss limit
                    if relative_change >= self.risk_management["profit_target_pct"]:
                        # Token A has outperformed Token B, consider swapping A to B
                        logger.info(f"Profit target reached for {pair_key}: {relative_change:.2%}")
                        
                        # Check if we have Token A balance
                        balances = await self.client.get_balances()
                        token_a_balance = float(balances.get("balances", {}).get(token_a, {}).get("balance", 0))
                        
                        if token_a_balance > 0:
                            # Calculate swap amount (50% of balance or max allowed, whichever is less)
                            max_amount = self.risk_management["max_swap_amount"].get(token_a, token_a_balance)
                            swap_amount = min(token_a_balance * 0.5, max_amount)
                            
                            if swap_amount > 0:
                                # Execute swap
                                await self.execute_swap(token_a, token_b, swap_amount)
                    
                    elif relative_change <= -self.risk_management["loss_limit_pct"]:
                        # Token B has outperformed Token A, consider swapping B to A
                        logger.info(f"Loss limit reached for {pair_key}: {relative_change:.2%}")
                        
                        # Check if we have Token B balance
                        balances = await self.client.get_balances()
                        token_b_balance = float(balances.get("balances", {}).get(token_b, {}).get("balance", 0))
                        
                        if token_b_balance > 0:
                            # Calculate swap amount (50% of balance or max allowed, whichever is less)
                            max_amount = self.risk_management["max_swap_amount"].get(token_b, token_b_balance)
                            swap_amount = min(token_b_balance * 0.5, max_amount)
                            
                            if swap_amount > 0:
                                # Execute swap
                                await self.execute_swap(token_b, token_a, swap_amount)
                except (IndexError, ValueError) as e:
                    logger.error(f"Error calculating price changes for {pair_key}: {str(e)}")
            except Exception as e:
                logger.error(f"Error applying risk management for {pair_key}: {str(e)}")
    
    async def process_trading_signal(self, pair_key: str, signal: Dict[str, Any]):
        """
        Process a trading signal from a strategy
        
        Args:
            pair_key: Trading pair key (e.g., "SUI-USDC")
            signal: Trading signal
        """
        logger.info(f"Processing trading signal for {pair_key}: {signal}")
        
        # Extract signal details
        action = signal.get("action")
        token_a, token_b = pair_key.split("-")
        
        # Validate signal
        if not action:
            logger.warning(f"Invalid signal for {pair_key}: {signal}")
            return
        
        # Process based on action
        if action == "swap_a_to_b":
            amount = signal.get("amount", 0)
            if amount > 0:
                await self.execute_swap(token_a, token_b, amount)
        elif action == "swap_b_to_a":
            amount = signal.get("amount", 0)
            if amount > 0:
                await self.execute_swap(token_b, token_a, amount)
        elif action == "add_liquidity":
            amount_a = signal.get("amount_a", 0)
            amount_b = signal.get("amount_b", 0)
            if amount_a > 0 and amount_b > 0:
                await self.add_liquidity(token_a, token_b, amount_a, amount_b)
        elif action == "remove_liquidity":
            position_id = signal.get("position_id")
            percentage = signal.get("percentage", 1.0)
            if position_id:
                await self.remove_liquidity(position_id, percentage)
        else:
            logger.warning(f"Unknown action in signal for {pair_key}: {action}")
    
    async def execute_swap(self, input_token: str, output_token: str, amount: float):
        """
        Execute a token swap
        
        Args:
            input_token: Input token symbol
            output_token: Output token symbol
            amount: Amount to swap (in input token)
        
        Returns:
            Swap response
        """
        logger.info(f"Executing swap: {amount} {input_token} -> {output_token}")
        
        try:
            # Apply swap limits
            max_amount = self.risk_management["max_swap_amount"].get(input_token, amount)
            amount = min(amount, max_amount)
            
            # Set slippage
            slippage = self.risk_management.get("max_slippage", 0.005)
            
            # Execute swap
            response = await self.client.execute_swap(
                input_token=input_token,
                output_token=output_token,
                amount=amount,
                slippage=slippage
            )
            
            # Log response
            logger.info(f"Executed swap: {amount} {input_token} -> {output_token}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("swap", {
                "input_token": input_token,
                "output_token": output_token,
                "amount": amount,
                "slippage": slippage,
                "tx_digest": response.get("digest"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error executing swap {input_token} -> {output_token}: {str(e)}")
            return None
    
    async def add_liquidity(self, token_a: str, token_b: str, amount_a: float, amount_b: float):
        """
        Add liquidity to a pool
        
        Args:
            token_a: First token symbol
            token_b: Second token symbol
            amount_a: Amount of first token
            amount_b: Amount of second token
        
        Returns:
            Liquidity addition response
        """
        logger.info(f"Adding liquidity: {amount_a} {token_a} + {amount_b} {token_b}")
        
        try:
            # Apply swap limits
            max_amount_a = self.risk_management["max_swap_amount"].get(token_a, amount_a)
            max_amount_b = self.risk_management["max_swap_amount"].get(token_b, amount_b)
            
            amount_a = min(amount_a, max_amount_a)
            amount_b = min(amount_b, max_amount_b)
            
            # Set slippage
            slippage = self.risk_management.get("max_slippage", 0.005)
            
            # Add liquidity
            response = await self.client.add_liquidity(
                token_a=token_a,
                token_b=token_b,
                amount_a=amount_a,
                amount_b=amount_b,
                slippage=slippage
            )
            
            # Log response
            logger.info(f"Added liquidity: {amount_a} {token_a} + {amount_b} {token_b}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("add_liquidity", {
                "token_a": token_a,
                "token_b": token_b,
                "amount_a": amount_a,
                "amount_b": amount_b,
                "tx_digest": response.get("digest"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error adding liquidity {token_a}/{token_b}: {str(e)}")
            return None
    
    async def remove_liquidity(self, position_id: str, percentage: float = 1.0):
        """
        Remove liquidity from a position
        
        Args:
            position_id: ID of the liquidity position
            percentage: Percentage of liquidity to remove (0.0-1.0)
        
        Returns:
            Liquidity removal response
        """
        logger.info(f"Removing liquidity: {percentage*100}% from position {position_id}")
        
        try:
            # Set slippage
            slippage = self.risk_management.get("max_slippage", 0.005)
            
            # Remove liquidity
            response = await self.client.remove_liquidity(
                position_id=position_id,
                percentage=percentage,
                slippage=slippage
            )
            
            # Log response
            logger.info(f"Removed liquidity from position {position_id}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("remove_liquidity", {
                "position_id": position_id,
                "percentage": percentage,
                "tx_digest": response.get("digest"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error removing liquidity from position {position_id}: {str(e)}")
            return None
    
    async def get_balances(self):
        """
        Get current token balances
        
        Returns:
            Token balances
        """
        try:
            return await self.client.get_balances()
        except Exception as e:
            logger.error(f"Error getting balances: {str(e)}")
            return None
    
    async def send_status_update(self, status_type: str, data: Dict[str, Any] = None):
        """
        Send a status update to ElizaOS
        
        Args:
            status_type: Type of status update
            data: Additional data for the update
        """
        if not self.eliza_bridge:
            return
        
        status_data = {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "agent_type": self.agent_type,
            "status_type": status_type,
            "timestamp": time.time()
        }
        
        if data:
            status_data.update(data)
        
        try:
            await self.eliza_bridge.send_agent_status(status_data)
        except Exception as e:
            logger.error(f"Error sending status update: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert agent to dictionary representation
        
        Returns:
            Dictionary representation of the agent
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "agent_type": self.agent_type,
            "address": self.address,
            "use_testnet": self.use_testnet,
            "active_pairs": self.active_pairs,
            "is_monitoring": self.is_monitoring,
            "liquidity_positions": self.liquidity_positions,
            "config": self.config,
            "risk_management": self.risk_management,
            "last_updated": time.time()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], eliza_bridge=None):
        """
        Create agent from dictionary representation
        
        Args:
            data: Dictionary representation of the agent
            eliza_bridge: ElizaOS bridge for agent communication
            
        Returns:
            Agent instance
        """
        agent = cls(
            agent_id=data.get("agent_id"),
            name=data.get("name"),
            private_key=None,  # Do not store private key in dictionary
            use_testnet=data.get("use_testnet", True),
            eliza_bridge=eliza_bridge,
            config=data.get("config", {})
        )
        
        agent.active_pairs = data.get("active_pairs", [("SUI", "USDC")])
        agent.risk_management = data.get("risk_management", agent.risk_management)
        
        return agent
