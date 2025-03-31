"""
Exchange Manager Module

Manages connections to multiple exchanges and provides a unified interface
for interacting with them.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Type, Union
import importlib
from datetime import datetime

from .exchange_base import Exchange, ExchangeCredentials, AccountBalance
from .rate_limiter import RateLimiter
from .api_security import APIKeyManager


class ExchangeManager:
    """
    Manages multiple exchange connections.
    
    Provides a central point for registering exchanges, managing credentials,
    and performing operations across multiple exchanges.
    """
    
    def __init__(
        self,
        config_path: Optional[str] = None,
        api_key_manager: Optional[APIKeyManager] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize the exchange manager.
        
        Args:
            config_path: Optional path to exchange configuration file
            api_key_manager: Optional API key manager for credential security
            logger: Optional logger
        """
        self.logger = logger or logging.getLogger("exchange_manager")
        self.api_key_manager = api_key_manager
        self.config_path = config_path
        
        # Dictionary of registered exchange classes by name
        self.exchange_classes: Dict[str, Type[Exchange]] = {}
        
        # Dictionary of active exchange instances
        self.exchanges: Dict[str, Exchange] = {}
        
        # Dictionary of rate limiters for each exchange
        self.rate_limiters: Dict[str, RateLimiter] = {}
        
        # Status tracking
        self.last_status_check: Dict[str, float] = {}
        self.initialized = False
    
    async def initialize(self) -> None:
        """Initialize the exchange manager and load configured exchanges."""
        # Register built-in exchange implementations
        self._register_builtin_exchanges()
        
        # Load configuration if provided
        if self.config_path and os.path.exists(self.config_path):
            await self.load_config(self.config_path)
        
        self.initialized = True
        self.logger.info("Exchange manager initialized")
    
    def _register_builtin_exchanges(self) -> None:
        """Register the built-in exchange implementations."""
        # Import exchange implementations dynamically
        exchange_modules = [
            'binance', 'coinbase', 'ftx', 'kraken', 'kucoin', 'bybit'
        ]
        
        for module_name in exchange_modules:
            try:
                # Try to import the module dynamically
                module = importlib.import_module(f".{module_name}", package="exchanges")
                
                # Look for the exchange class in the module
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        issubclass(attr, Exchange) and 
                        attr is not Exchange):
                        
                        exchange_name = attr.EXCHANGE_NAME if hasattr(attr, 'EXCHANGE_NAME') else module_name
                        self.register_exchange_class(exchange_name, attr)
                        self.logger.debug(f"Registered exchange class: {exchange_name}")
                
            except ImportError:
                # Module not found, which is fine (not all exchanges may be implemented yet)
                self.logger.debug(f"Exchange module not found: {module_name}")
            except Exception as e:
                # Other import errors should be logged
                self.logger.warning(f"Error importing exchange module {module_name}: {str(e)}")
    
    def register_exchange_class(
        self,
        name: str,
        exchange_class: Type[Exchange]
    ) -> None:
        """
        Register an exchange implementation class.
        
        Args:
            name: Exchange name
            exchange_class: Exchange class
        """
        self.exchange_classes[name.lower()] = exchange_class
        self.logger.info(f"Registered exchange class: {name}")
    
    async def load_config(self, config_path: str) -> None:
        """
        Load exchange configuration from a file.
        
        Args:
            config_path: Path to configuration file
        """
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Process exchange configurations
            for exchange_config in config.get('exchanges', []):
                exchange_name = exchange_config.get('name', '').lower()
                enabled = exchange_config.get('enabled', True)
                
                if not enabled:
                    self.logger.info(f"Exchange {exchange_name} is disabled in config")
                    continue
                
                if exchange_name not in self.exchange_classes:
                    self.logger.warning(f"Exchange {exchange_name} not found in registered classes")
                    continue
                
                # Create rate limiter if specified
                rate_limiter = None
                if 'rate_limits' in exchange_config:
                    rate_limiter = self._create_rate_limiter(
                        exchange_name, 
                        exchange_config['rate_limits']
                    )
                
                # Create credentials if specified
                credentials = None
                if 'credentials' in exchange_config:
                    cred_config = exchange_config['credentials']
                    
                    # Check if we have encrypted credentials
                    if self.api_key_manager and cred_config.get('encrypted', False):
                        credentials = ExchangeCredentials(
                            api_key=cred_config.get('api_key', ''),
                            api_secret=cred_config.get('api_secret', ''),
                            passphrase=cred_config.get('passphrase'),
                            description=cred_config.get('description', ''),
                            encrypted=True,
                            key_manager=self.api_key_manager
                        )
                    elif 'api_key' in cred_config and 'api_secret' in cred_config:
                        # Create credentials with encryption if key manager is available
                        credentials = ExchangeCredentials(
                            api_key=cred_config['api_key'],
                            api_secret=cred_config['api_secret'],
                            passphrase=cred_config.get('passphrase'),
                            description=cred_config.get('description', ''),
                            key_manager=self.api_key_manager
                        )
                
                # Create and register the exchange
                await self.register_exchange(
                    name=exchange_name,
                    credentials=credentials,
                    testnet=exchange_config.get('testnet', False),
                    rate_limiter=rate_limiter,
                    options=exchange_config.get('options', {})
                )
            
            self.logger.info(f"Loaded exchange configuration from {config_path}")
            
        except Exception as e:
            self.logger.error(f"Error loading exchange configuration: {str(e)}")
            raise
    
    def _create_rate_limiter(
        self,
        exchange_name: str,
        rate_limit_config: Dict[str, Any]
    ) -> RateLimiter:
        """
        Create a rate limiter from configuration.
        
        Args:
            exchange_name: Exchange name
            rate_limit_config: Rate limit configuration
            
        Returns:
            RateLimiter instance
        """
        from .rate_limiter import RateLimiter, RateLimitRule
        
        rate_limiter = RateLimiter(name=f"{exchange_name}_rate_limiter")
        
        for endpoint, limits in rate_limit_config.items():
            if isinstance(limits, dict):
                rate_limiter.add_rule(
                    RateLimitRule(
                        key=endpoint,
                        calls=limits.get('calls', 1),
                        period=limits.get('period', 1.0)
                    )
                )
            elif isinstance(limits, list):
                for limit in limits:
                    rate_limiter.add_rule(
                        RateLimitRule(
                            key=endpoint,
                            calls=limit.get('calls', 1),
                            period=limit.get('period', 1.0)
                        )
                    )
        
        self.rate_limiters[exchange_name] = rate_limiter
        return rate_limiter
    
    async def register_exchange(
        self,
        name: str,
        credentials: Optional[ExchangeCredentials] = None,
        testnet: bool = False,
        rate_limiter: Optional[RateLimiter] = None,
        options: Dict[str, Any] = None
    ) -> Exchange:
        """
        Register and initialize an exchange.
        
        Args:
            name: Exchange name
            credentials: Optional API credentials
            testnet: Whether to use testnet/sandbox
            rate_limiter: Optional rate limiter
            options: Optional exchange-specific options
            
        Returns:
            Initialized Exchange instance
        """
        name = name.lower()
        
        if name not in self.exchange_classes:
            raise ValueError(f"Exchange {name} not registered")
        
        # Get the exchange class
        exchange_class = self.exchange_classes[name]
        
        # Create the exchange instance
        exchange = exchange_class(
            name=name,
            credentials=credentials,
            testnet=testnet,
            rate_limiter=rate_limiter or self.rate_limiters.get(name),
            logger=self.logger.getChild(name)
        )
        
        # Apply options if provided
        if options:
            for key, value in options.items():
                if hasattr(exchange, key):
                    setattr(exchange, key, value)
        
        # Store the exchange
        self.exchanges[name] = exchange
        
        # Test the connection
        self.logger.info(f"Testing connection to {name}...")
        connected = await exchange.test_connection()
        if connected:
            self.logger.info(f"Successfully connected to {name}")
        else:
            self.logger.warning(f"Failed to connect to {name}")
        
        return exchange
    
    def get_exchange(self, name: str) -> Optional[Exchange]:
        """
        Get an exchange by name.
        
        Args:
            name: Exchange name
            
        Returns:
            Exchange instance or None if not found
        """
        return self.exchanges.get(name.lower())
    
    async def close_all(self) -> None:
        """Close all exchange connections."""
        for exchange in self.exchanges.values():
            try:
                await exchange.close()
            except Exception as e:
                self.logger.error(f"Error closing exchange {exchange.name}: {str(e)}")
        
        self.logger.info("Closed all exchange connections")
    
    async def check_all_connections(self) -> Dict[str, bool]:
        """
        Check connections to all exchanges.
        
        Returns:
            Dictionary mapping exchange names to connection status
        """
        results = {}
        for name, exchange in self.exchanges.items():
            try:
                connected = await exchange.test_connection()
                results[name] = connected
                self.last_status_check[name] = datetime.now().timestamp()
            except Exception as e:
                self.logger.error(f"Error checking connection to {name}: {str(e)}")
                results[name] = False
        
        return results
    
    async def get_all_balances(self) -> Dict[str, AccountBalance]:
        """
        Get balances from all exchanges.
        
        Returns:
            Dictionary mapping exchange names to account balances
        """
        results = {}
        for name, exchange in self.exchanges.items():
            try:
                balance = await exchange.get_account_balance()
                results[name] = balance
            except Exception as e:
                self.logger.error(f"Error getting balance from {name}: {str(e)}")
        
        return results
    
    def get_all_exchanges(self) -> List[str]:
        """
        Get names of all registered exchanges.
        
        Returns:
            List of exchange names
        """
        return list(self.exchanges.keys())
    
    def get_registered_exchange_classes(self) -> List[str]:
        """
        Get names of all registered exchange classes.
        
        Returns:
            List of exchange class names
        """
        return list(self.exchange_classes.keys())
    
    def save_config(self, config_path: Optional[str] = None) -> None:
        """
        Save current exchange configuration to a file.
        
        Args:
            config_path: Optional path to save configuration (defaults to self.config_path)
        """
        config_path = config_path or self.config_path
        if not config_path:
            raise ValueError("No configuration path specified")
        
        config = {
            'exchanges': []
        }
        
        for name, exchange in self.exchanges.items():
            exchange_config = {
                'name': name,
                'enabled': True,
                'testnet': exchange.testnet
            }
            
            # Add credentials if present (without secrets)
            if exchange.credentials:
                exchange_config['credentials'] = {
                    'description': exchange.credentials.description,
                    'encrypted': self.api_key_manager is not None
                }
            
            # Add rate limiter if present
            if name in self.rate_limiters:
                rate_limiter = self.rate_limiters[name]
                rate_limits = {}
                
                for rule in rate_limiter.rules:
                    if rule.key not in rate_limits:
                        rate_limits[rule.key] = []
                    
                    rate_limits[rule.key].append({
                        'calls': rule.calls,
                        'period': rule.period
                    })
                
                exchange_config['rate_limits'] = rate_limits
            
            config['exchanges'].append(exchange_config)
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(os.path.abspath(config_path)), exist_ok=True)
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.logger.info(f"Saved exchange configuration to {config_path}")
            
        except Exception as e:
            self.logger.error(f"Error saving exchange configuration: {str(e)}")
            raise
    
    def generate_default_config(
        self,
        exchange_names: List[str],
        output_path: str
    ) -> None:
        """
        Generate a default configuration template for specified exchanges.
        
        Args:
            exchange_names: List of exchange names to include
            output_path: Path to save the configuration template
        """
        config = {
            'exchanges': []
        }
        
        for name in exchange_names:
            name = name.lower()
            
            if name not in self.exchange_classes:
                self.logger.warning(f"Exchange {name} not found in registered classes")
                continue
            
            exchange_config = {
                'name': name,
                'enabled': True,
                'testnet': False,
                'credentials': {
                    'description': f"{name.capitalize()} API credentials",
                    'api_key': "",
                    'api_secret': "",
                    'passphrase': "" if name in ['coinbase', 'kucoin'] else None
                },
                'rate_limits': {
                    'default': {
                        'calls': 10,
                        'period': 1.0
                    }
                },
                'options': {}
            }
            
            config['exchanges'].append(exchange_config)
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.logger.info(f"Generated default configuration template to {output_path}")
            
        except Exception as e:
            self.logger.error(f"Error generating configuration template: {str(e)}")
            raise
    
    async def get_exchange_status_summary(self) -> Dict[str, Any]:
        """
        Get a summary of exchange status.
        
        Returns:
            Dictionary with exchange status information
        """
        status = {}
        
        for name, exchange in self.exchanges.items():
            # Check if we need to refresh the connection status
            current_time = datetime.now().timestamp()
            last_check = self.last_status_check.get(name, 0)
            
            # Only recheck if it's been more than 60 seconds
            if current_time - last_check > 60:
                try:
                    connected = await exchange.test_connection()
                    self.last_status_check[name] = current_time
                except Exception:
                    connected = False
            else:
                connected = exchange.connected
            
            status[name] = {
                'connected': connected,
                'testnet': exchange.testnet,
                'last_check': self.last_status_check.get(name, 0),
                'has_credentials': exchange.credentials is not None
            }
        
        return status
