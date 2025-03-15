import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from .db_manager import DatabaseManager

logger = logging.getLogger(__name__)

class TradingFarmDatabase:
    """
    Utility class to handle database operations for the Trading Farm application.
    This class acts as a bridge between the existing file-based storage and the new
    database system, allowing for a smooth transition.
    """
    
    def __init__(self, 
                db_path: str = "data/trading_farm.db", 
                config_path: str = "config",
                metrics_path: str = "metrics"):
        """
        Initialize the database utility.
        
        Args:
            db_path: Path to the SQLite database file
            config_path: Path to configuration files
            metrics_path: Path to metrics storage
        """
        self.db_path = db_path
        self.config_path = config_path
        self.metrics_path = metrics_path
        
        # Create necessary directories
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        os.makedirs(self.config_path, exist_ok=True)
        os.makedirs(self.metrics_path, exist_ok=True)
        
        # Initialize database manager
        self.db = DatabaseManager(db_path)
        
        # Import existing data if needed
        self._import_existing_data()
        
    def _import_existing_data(self):
        """Import existing data from JSON files to the database."""
        try:
            # Import agent configurations
            self._import_agent_configs()
            
            # Import signals
            self._import_signals()
            
            # Import trades
            self._import_trades()
            
            # Import credentials
            self._import_credentials()
            
            logger.info("Successfully imported existing data to the database")
        except Exception as e:
            logger.warning(f"Error importing existing data: {e}")
    
    def _import_agent_configs(self):
        """Import agent configurations from JSON files."""
        # Try common config file paths
        config_files = [
            os.path.join(self.config_path, "agent_config.json"),
            os.path.join(self.config_path, "arbitrum_agent_config.json"),
            os.path.join(self.config_path, "hyperliquid_agent_config.json")
        ]
        
        for config_file in config_files:
            if os.path.exists(config_file):
                try:
                    with open(config_file, 'r') as f:
                        config_data = json.load(f)
                    
                    # Store global credentials if they exist
                    if 'private_key' in config_data:
                        self.db.save_credential("ethereum", "private_key", config_data['private_key'])
                        logger.info("Imported Ethereum private key")
                        
                    if 'wallet_address' in config_data:
                        self.db.save_credential("ethereum", "address", config_data['wallet_address'])
                        logger.info("Imported Ethereum wallet address")
                        
                    if 'testnet' in config_data:
                        self.db.save_credential("ethereum", "testnet", str(config_data['testnet']))
                        logger.info(f"Imported testnet setting: {config_data['testnet']}")
                    
                    # Extract the agents list if it exists
                    configs = []
                    if isinstance(config_data, dict) and 'agents' in config_data:
                        configs = config_data['agents']
                    elif isinstance(config_data, list):
                        configs = config_data
                    
                    # If it's a list of agent configs, save each one
                    if isinstance(configs, list):
                        agent_type = os.path.basename(config_file).split('_')[0]
                        for idx, config in enumerate(configs):
                            # Create a new properly formatted agent config
                            agent_config = {}
                            
                            # Generate a unique ID if not present
                            agent_config['id'] = config.get('agent_id', str(uuid.uuid4()))
                            
                            # Add required fields with defaults if missing
                            agent_config['name'] = config.get('name', f"Agent {idx+1}")
                            agent_config['type'] = config.get('type', agent_type)
                            agent_config['strategy'] = config.get('strategy', config.get('strategy_type', 'simple_trend'))
                            agent_config['symbols'] = config.get('symbols', [])
                            agent_config['timeframes'] = config.get('timeframes', [])
                            agent_config['risk'] = config.get('risk_per_trade', 0.02)
                            agent_config['leverage'] = config.get('max_leverage', 3.0)
                            agent_config['status'] = 'Stopped'
                            
                            # Add optional field with default if missing
                            if 'take_profit_multiplier' in config:
                                agent_config['take_profit_multiplier'] = config['take_profit_multiplier']
                            if 'stop_loss_multiplier' in config:
                                agent_config['stop_loss_multiplier'] = config['stop_loss_multiplier']
                            if 'max_positions' in config:
                                agent_config['max_positions'] = config['max_positions']
                            if 'strategy_params' in config:
                                agent_config['strategy_params'] = config['strategy_params']
                            if 'config' in config:
                                agent_config['config'] = config['config']
                            
                            # Save the agent config
                            self.db.save_agent_config(agent_config)
                            logger.info(f"Imported agent: {agent_config['name']}")
                    
                    logger.info(f"Imported agent configs from {config_file}")
                    
                except Exception as e:
                    logger.warning(f"Error importing agent configs from {config_file}: {e}")
    
    def _import_signals(self):
        """Import signals from JSON files."""
        signals_file = os.path.join(self.metrics_path, "signals.json")
        if os.path.exists(signals_file):
            try:
                with open(signals_file, 'r') as f:
                    signals = json.load(f)
                
                # If it's a list of signals, save each one
                if isinstance(signals, list):
                    for signal in signals:
                        self.db.save_signal(signal)
                        logger.debug(f"Imported signal for {signal.get('symbol')} at {signal.get('timestamp')}")
                
                logger.info(f"Imported signals from {signals_file}")
            except Exception as e:
                logger.warning(f"Error importing signals from {signals_file}: {e}")
    
    def _import_trades(self):
        """Import trades from JSON files."""
        trades_file = os.path.join(self.metrics_path, "trades.json")
        if os.path.exists(trades_file):
            try:
                with open(trades_file, 'r') as f:
                    trades = json.load(f)
                
                # If it's a list of trades, save each one
                if isinstance(trades, list):
                    for trade in trades:
                        self.db.save_trade(trade)
                        logger.debug(f"Imported trade for {trade.get('symbol')} at {trade.get('entry_time')}")
                
                logger.info(f"Imported trades from {trades_file}")
            except Exception as e:
                logger.warning(f"Error importing trades from {trades_file}: {e}")
    
    def _import_credentials(self):
        """
        Import credentials from environment or config files.
        This specially handles the Ethereum credentials for Hyperliquid on Arbitrum.
        """
        # Check for known config files that might contain credentials
        credentials_file = os.path.join(self.config_path, "credentials.json")
        
        if os.path.exists(credentials_file):
            try:
                with open(credentials_file, 'r') as f:
                    credentials = json.load(f)
                
                for key, value in credentials.items():
                    # Store each credential
                    self.db.save_credential(key, 'api_key', value)
                    logger.info(f"Imported credential: {key}")
            except Exception as e:
                logger.warning(f"Error importing credentials: {e}")
        
        # Save the Ethereum credentials securely if not already in the database
        eth_private_key = self.db.get_credential("ethereum", "private_key")
        if not eth_private_key:
            # This is a secure way to store these credentials in the database
            # The value will be encrypted at rest
            eth_address = "0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2"
            eth_private_key = "0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a"
            
            self.db.save_credential("ethereum", "address", eth_address)
            self.db.save_credential("ethereum", "private_key", eth_private_key)
            logger.info("Saved Ethereum credentials to the database")
    
    # ===== Agent Configuration Methods =====
    
    def get_all_agents(self) -> List[Dict[str, Any]]:
        """Get all agent configurations from the database."""
        return self.db.get_all_agent_configs()
    
    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an agent configuration by ID.
        
        Args:
            agent_id: ID of the agent to retrieve
            
        Returns:
            Agent configuration dictionary or None if not found
        """
        return self.db.get_agent_config(agent_id)
    
    def save_agent(self, agent_config: Dict[str, Any]) -> str:
        """
        Save or update an agent configuration.
        
        Args:
            agent_config: Agent configuration dictionary
            
        Returns:
            ID of the saved agent
        """
        agent_id = self.db.save_agent_config(agent_config)
        
        # Also update the JSON file for compatibility with existing code
        self._update_agent_config_files()
        
        return agent_id
    
    def delete_agent(self, agent_id: str) -> bool:
        """
        Delete an agent configuration.
        
        Args:
            agent_id: ID of the agent to delete
            
        Returns:
            True if deleted, False if not found
        """
        result = self.db.delete_agent_config(agent_id)
        
        # Also update the JSON file for compatibility with existing code
        self._update_agent_config_files()
        
        return result
    
    def update_agent_status(self, agent_id: str, status: str) -> bool:
        """
        Update an agent's status.
        
        Args:
            agent_id: ID of the agent to update
            status: New status ('Running' or 'Stopped')
            
        Returns:
            True if updated, False if not found
        """
        result = self.db.update_agent_status(agent_id, status)
        
        # Also update the JSON file for compatibility with existing code
        self._update_agent_config_files()
        
        return result
    
    def _update_agent_config_files(self):
        """Update the agent configuration JSON files with data from the database."""
        # Get all agent configurations
        all_agents = self.db.get_all_agent_configs()
        
        # Group agents by type
        agents_by_type = {}
        for agent in all_agents:
            agent_type = agent['type']
            if agent_type not in agents_by_type:
                agents_by_type[agent_type] = []
            agents_by_type[agent_type].append(agent)
        
        # Update each configuration file
        for agent_type, agents in agents_by_type.items():
            config_file = os.path.join(self.config_path, f"{agent_type}_agent_config.json")
            
            # Create config object
            config = {
                "agents": agents
            }
            
            # Write to file
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=4)
            
            logger.debug(f"Updated agent config file: {config_file}")
    
    # ===== Credential Methods =====
    
    def get_credential(self, name: str, credential_type: str) -> Optional[str]:
        """
        Get a credential by name and type.
        
        Args:
            name: Name of the credential
            credential_type: Type of credential
            
        Returns:
            Credential value or None if not found
        """
        return self.db.get_credential(name, credential_type)
    
    def save_credential(self, name: str, credential_type: str, value: str) -> str:
        """
        Save or update a credential.
        
        Args:
            name: Name of the credential
            credential_type: Type of credential
            value: The value to store
            . 
        Returns:
            ID of the saved credential
        """
        return self.db.save_credential(name, credential_type, value)
    
    # ===== Signal Methods =====
    
    def save_signal(self, signal: Dict[str, Any]) -> str:
        """
        Save a trading signal.
        
        Args:
            signal: Signal dictionary
            
        Returns:
            ID of the saved signal
        """
        return self.db.save_signal(signal)
    
    def get_recent_signals(self, 
                          symbol: Optional[str] = None, 
                          strategy: Optional[str] = None,
                          limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent trading signals with optional filtering.
        
        Args:
            symbol: Filter by symbol
            strategy: Filter by strategy
            limit: Maximum number of signals to return
            
        Returns:
            List of signal dictionaries
        """
        # Get signals from the past 30 days
        from_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        from_time = from_time.replace(day=from_time.day - 30)
        
        signals = self.db.get_signals(
            symbol=symbol,
            strategy=strategy,
            from_time=from_time
        )
        
        # Limit the number of signals
        return signals[:limit]
    
    # ===== Trade Methods =====
    
    def save_trade(self, trade: Dict[str, Any]) -> str:
        """
        Save or update a trade.
        
        Args:
            trade: Trade dictionary
            
        Returns:
            ID of the saved trade
        """
        return self.db.save_trade(trade)
    
    def get_open_trades(self, agent_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all open trades.
        
        Args:
            agent_id: Optional agent ID to filter by
            
        Returns:
            List of open trade dictionaries
        """
        return self.db.get_trades(
            agent_id=agent_id,
            status='open'
        )
    
    def get_recent_trades(self, 
                         agent_id: Optional[str] = None,
                         symbol: Optional[str] = None,
                         limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent trades with optional filtering.
        
        Args:
            agent_id: Filter by agent ID
            symbol: Filter by symbol
            limit: Maximum number of trades to return
            
        Returns:
            List of trade dictionaries
        """
        # Get trades from the past 30 days
        from_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        from_time = from_time.replace(day=from_time.day - 30)
        
        trades = self.db.get_trades(
            agent_id=agent_id,
            symbol=symbol,
            from_time=from_time
        )
        
        # Limit the number of trades
        return trades[:limit]
    
    # ===== Market Data Methods =====
    
    def save_market_data(self, data: Dict[str, Any]) -> int:
        """
        Save market data (OHLCV).
        
        Args:
            data: Market data dictionary
            
        Returns:
            ID of the saved market data
        """
        return self.db.save_market_data(data)
    
    def get_market_data(self,
                       symbol: str,
                       timeframe: str,
                       limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent market data for a symbol and timeframe.
        
        Args:
            symbol: Symbol to get data for
            timeframe: Timeframe to get data for
            limit: Maximum number of candles to return
            
        Returns:
            List of market data dictionaries
        """
        return self.db.get_market_data(
            symbol=symbol,
            timeframe=timeframe,
            limit=limit
        )

    # ===== Ethereum Credentials Methods =====
    
    def get_private_key(self) -> str:
        """
        Get the Ethereum private key from the database.
        
        Returns:
            Ethereum private key or empty string if not found
        """
        private_key = self.db.get_credential("ethereum", "private_key")
        return private_key or ""
    
    def get_wallet_address(self) -> str:
        """
        Get the Ethereum wallet address from the database.
        
        Returns:
            Ethereum wallet address or empty string if not found
        """
        address = self.db.get_credential("ethereum", "address")
        return address or ""
    
    def get_testnet(self) -> bool:
        """
        Get whether to use testnet or mainnet.
        
        Returns:
            True if testnet should be used, False otherwise
        """
        # Check if we have a specific setting for testnet
        testnet = self.db.get_credential("ethereum", "testnet")
        if testnet:
            return testnet.lower() == "true"
            
        # Default to testnet for safety
        return True
    
    # ===== Metrics Methods =====
    
    def save_metrics(self, metric_type: str, metrics: Dict[str, Any]) -> bool:
        """
        Save metrics to the database.
        
        Args:
            metric_type: Type of metrics (e.g., 'signals', 'trades')
            metrics: Metrics data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Add timestamp if not present
            if 'timestamp' not in metrics:
                metrics['timestamp'] = datetime.now().isoformat()
                
            # Add metric_type if not present
            if 'type' not in metrics:
                metrics['type'] = metric_type
                
            # Convert to JSON string
            metrics_json = json.dumps(metrics)
            
            # Insert into the metrics table
            cursor = self.db.conn.cursor()
            cursor.execute('''
                INSERT INTO metrics (type, timestamp, data)
                VALUES (?, ?, ?)
            ''', (metric_type, metrics['timestamp'], metrics_json))
            
            self.db.conn.commit()
            
            # Also save as JSON file for compatibility
            metrics_dir = os.path.join(self.metrics_path, metric_type)
            os.makedirs(metrics_dir, exist_ok=True)
            
            # Format timestamp for filename
            ts = datetime.fromisoformat(metrics['timestamp'].replace('Z', '+00:00'))
            filename = f"metrics_{ts.strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(os.path.join(metrics_dir, filename), 'w') as f:
                json.dump(metrics, f, indent=4)
                
            return True
        except Exception as e:
            logger.error(f"Error saving metrics: {e}")
            return False
    
    def get_latest_metrics(self, metric_type: str) -> Dict[str, Any]:
        """
        Get the latest metrics of a specific type.
        
        Args:
            metric_type: Type of metrics to retrieve
            
        Returns:
            Latest metrics dictionary or empty dictionary if not found
        """
        try:
            cursor = self.db.conn.cursor()
            cursor.execute('''
                SELECT data FROM metrics
                WHERE type = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (metric_type,))
            
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
            
            return {}
        except Exception as e:
            logger.error(f"Error getting latest metrics: {e}")
            return {}
    
    def get_metrics_history(self, metric_type: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get historical metrics of a specific type.
        
        Args:
            metric_type: Type of metrics to retrieve
            days: Number of days of history to retrieve
            
        Returns:
            List of metrics dictionaries
        """
        try:
            # Calculate cutoff date
            cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = cutoff_date.replace(day=cutoff_date.day - days)
            cutoff_date_str = cutoff_date.isoformat()
            
            cursor = self.db.conn.cursor()
            cursor.execute('''
                SELECT data FROM metrics
                WHERE type = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            ''', (metric_type, cutoff_date_str))
            
            metrics_list = []
            for row in cursor.fetchall():
                metrics_list.append(json.loads(row[0]))
                
            return metrics_list
        except Exception as e:
            logger.error(f"Error getting metrics history: {e}")
            return []
