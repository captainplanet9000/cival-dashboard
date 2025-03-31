import os
import json
import sqlite3
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database operations for the Trading Farm.
    Handles all interactions with the SQLite database.
    """
    
    def __init__(self, db_path: str = "trading_farm.db", encryption_key: Optional[str] = None):
        """
        Initialize the database manager with a path to the SQLite database.
        
        Args:
            db_path: Path to the SQLite database file
            encryption_key: Key used for encrypting sensitive data like API keys
        """
        self.db_path = db_path
        self.conn = None
        self.encryption_key = self._setup_encryption(encryption_key)
        self._initialize_database()
        
    def _setup_encryption(self, encryption_key: Optional[str]) -> bytes:
        """
        Set up encryption for sensitive data.
        
        Args:
            encryption_key: Optional encryption key, if not provided, a new one will be generated
            
        Returns:
            Encryption key as bytes
        """
        if encryption_key:
            # Use provided key
            key = encryption_key.encode()
        else:
            # Create a key derivation function
            salt = b'tradingfarm_salt'  # In production, this would be securely stored elsewhere
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            # Generate a key from a password (in production, this would be securely stored)
            password = b"trading_farm_secure_password"  # Would be better as an environment variable
            key = base64.urlsafe_b64encode(kdf.derive(password))
            
        return key
        
    def _initialize_database(self):
        """Create the database connection and initialize tables if they don't exist."""
        try:
            # Create directory for the database if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
            
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row  # Return rows as dictionaries
            
            # Create tables
            self._create_agent_config_table()
            self._create_signals_table()
            self._create_trades_table()
            self._create_market_data_table()
            self._create_credentials_table()
            self._create_metrics_table()
            
            logger.info(f"Database initialized successfully at {self.db_path}")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
            
    def _create_agent_config_table(self):
        """Create the agent configuration table."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_configs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            strategy TEXT NOT NULL,
            symbols TEXT NOT NULL,
            timeframes TEXT NOT NULL,
            risk REAL NOT NULL,
            leverage REAL NOT NULL,
            status TEXT DEFAULT 'Stopped',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        self.conn.commit()
        
    def _create_signals_table(self):
        """Create the trading signals table."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS signals (
            id TEXT PRIMARY KEY,
            timestamp TIMESTAMP NOT NULL,
            strategy TEXT NOT NULL,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            direction TEXT NOT NULL,
            confidence REAL,
            metadata TEXT,  -- JSON formatted metadata
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        self.conn.commit()
        
    def _create_trades_table(self):
        """Create the trades table."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            direction TEXT NOT NULL,
            entry_price REAL NOT NULL,
            entry_time TIMESTAMP NOT NULL,
            exit_price REAL,
            exit_time TIMESTAMP,
            quantity REAL NOT NULL,
            pnl REAL,
            status TEXT NOT NULL,
            metadata TEXT,  -- JSON formatted metadata
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agent_configs (id)
        )
        ''')
        self.conn.commit()
        
    def _create_market_data_table(self):
        """Create the market data table for storing historical prices."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(symbol, timeframe, timestamp)
        )
        ''')
        self.conn.commit()
        
    def _create_credentials_table(self):
        """Create the credentials table for storing encrypted API keys and wallet credentials."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS credentials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,  -- 'api_key', 'private_key', etc.
            value TEXT NOT NULL,  -- Encrypted value
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        self.conn.commit()
    
    def _create_metrics_table(self):
        """Create the metrics table for storing dashboard metrics."""
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,  -- 'signals', 'trades', etc.
            timestamp TIMESTAMP NOT NULL,
            data TEXT NOT NULL,  -- JSON formatted metrics data
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        # Add an index for faster queries by type and timestamp
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp ON metrics (type, timestamp)
        ''')
        self.conn.commit()
        
    # ============ Agent Config Methods ============
    
    def save_agent_config(self, config: Dict[str, Any]) -> str:
        """
        Save or update an agent configuration.
        
        Args:
            config: Agent configuration dictionary
            
        Returns:
            ID of the saved agent config
        """
        cursor = self.conn.cursor()
        agent_id = config.get('id')
        
        if not agent_id:
            # New agent, generate ID
            import uuid
            agent_id = str(uuid.uuid4())
            config['id'] = agent_id
            
            cursor.execute('''
            INSERT INTO agent_configs (
                id, name, type, strategy, symbols, timeframes, risk, leverage, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                agent_id,
                config['name'],
                config['type'],
                config['strategy'],
                json.dumps(config['symbols']),
                json.dumps(config['timeframes']),
                config['risk'],
                config['leverage'],
                config.get('status', 'Stopped')
            ))
        else:
            # Update existing agent
            cursor.execute('''
            UPDATE agent_configs SET
                name = ?,
                type = ?,
                strategy = ?,
                symbols = ?,
                timeframes = ?,
                risk = ?,
                leverage = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''', (
                config['name'],
                config['type'],
                config['strategy'],
                json.dumps(config['symbols']),
                json.dumps(config['timeframes']),
                config['risk'],
                config['leverage'],
                config.get('status', 'Stopped'),
                agent_id
            ))
            
        self.conn.commit()
        return agent_id
        
    def get_agent_config(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an agent configuration by ID.
        
        Args:
            agent_id: ID of the agent to retrieve
            
        Returns:
            Agent configuration dictionary or None if not found
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM agent_configs WHERE id = ?", (agent_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
            
        # Convert row to dictionary
        config = dict(row)
        
        # Parse JSON fields
        config['symbols'] = json.loads(config['symbols'])
        config['timeframes'] = json.loads(config['timeframes'])
        
        return config
        
    def get_all_agent_configs(self) -> List[Dict[str, Any]]:
        """
        Get all agent configurations.
        
        Returns:
            List of agent configuration dictionaries
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM agent_configs")
        rows = cursor.fetchall()
        
        configs = []
        for row in rows:
            config = dict(row)
            config['symbols'] = json.loads(config['symbols'])
            config['timeframes'] = json.loads(config['timeframes'])
            configs.append(config)
            
        return configs
        
    def delete_agent_config(self, agent_id: str) -> bool:
        """
        Delete an agent configuration.
        
        Args:
            agent_id: ID of the agent to delete
            
        Returns:
            True if deleted, False if not found
        """
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM agent_configs WHERE id = ?", (agent_id,))
        self.conn.commit()
        
        return cursor.rowcount > 0
        
    def update_agent_status(self, agent_id: str, status: str) -> bool:
        """
        Update an agent's status.
        
        Args:
            agent_id: ID of the agent to update
            status: New status ('Running' or 'Stopped')
            
        Returns:
            True if updated, False if not found
        """
        cursor = self.conn.cursor()
        cursor.execute('''
        UPDATE agent_configs SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''', (status, agent_id))
        self.conn.commit()
        
        return cursor.rowcount > 0
        
    # ============ Credential Methods ============
    
    def _encrypt_value(self, value: str) -> str:
        """
        Encrypt a sensitive value.
        
        Args:
            value: The value to encrypt
            
        Returns:
            Encrypted value as a string
        """
        f = Fernet(self.encryption_key)
        encrypted = f.encrypt(value.encode())
        return encrypted.decode()
        
    def _decrypt_value(self, encrypted_value: str) -> str:
        """
        Decrypt an encrypted value.
        
        Args:
            encrypted_value: The encrypted value to decrypt
            
        Returns:
            Decrypted value as a string
        """
        f = Fernet(self.encryption_key)
        decrypted = f.decrypt(encrypted_value.encode())
        return decrypted.decode()
        
    def save_credential(self, name: str, credential_type: str, value: str) -> str:
        """
        Save or update a credential.
        
        Args:
            name: Name of the credential
            credential_type: Type of credential (api_key, private_key, etc.)
            value: The sensitive value to encrypt and store
            
        Returns:
            ID of the saved credential
        """
        cursor = self.conn.cursor()
        
        # Check if credential already exists
        cursor.execute("SELECT id FROM credentials WHERE name = ? AND type = ?", (name, credential_type))
        row = cursor.fetchone()
        
        encrypted_value = self._encrypt_value(value)
        
        if row:
            # Update existing credential
            cred_id = row['id']
            cursor.execute('''
            UPDATE credentials SET
                value = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''', (encrypted_value, cred_id))
        else:
            # Create new credential
            import uuid
            cred_id = str(uuid.uuid4())
            cursor.execute('''
            INSERT INTO credentials (
                id, name, type, value
            ) VALUES (?, ?, ?, ?)
            ''', (cred_id, name, credential_type, encrypted_value))
            
        self.conn.commit()
        return cred_id
        
    def get_credential(self, name: str, credential_type: str) -> Optional[str]:
        """
        Get a credential by name and type.
        
        Args:
            name: Name of the credential
            credential_type: Type of credential
            
        Returns:
            Decrypted credential value or None if not found
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM credentials WHERE name = ? AND type = ?", (name, credential_type))
        row = cursor.fetchone()
        
        if not row:
            return None
            
        return self._decrypt_value(row['value'])
        
    # ============ Signal Methods ============
    
    def save_signal(self, signal: Dict[str, Any]) -> str:
        """
        Save a trading signal.
        
        Args:
            signal: Signal dictionary
            
        Returns:
            ID of the saved signal
        """
        cursor = self.conn.cursor()
        signal_id = signal.get('id')
        
        if not signal_id:
            # New signal, generate ID
            import uuid
            signal_id = str(uuid.uuid4())
            signal['id'] = signal_id
        
        # Convert metadata to JSON if present
        metadata = signal.get('metadata')
        if metadata:
            metadata = json.dumps(metadata)
            
        cursor.execute('''
        INSERT OR REPLACE INTO signals (
            id, timestamp, strategy, symbol, timeframe,
            direction, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            signal_id,
            signal['timestamp'],
            signal['strategy'],
            signal['symbol'],
            signal['timeframe'],
            signal['direction'],
            signal.get('confidence'),
            metadata
        ))
        
        self.conn.commit()
        return signal_id
        
    def get_signals(self, 
                   strategy: Optional[str] = None, 
                   symbol: Optional[str] = None,
                   from_time: Optional[datetime] = None,
                   to_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get signals with optional filtering.
        
        Args:
            strategy: Filter by strategy
            symbol: Filter by symbol
            from_time: Filter signals after this time
            to_time: Filter signals before this time
            
        Returns:
            List of signal dictionaries
        """
        cursor = self.conn.cursor()
        
        query = "SELECT * FROM signals WHERE 1=1"
        params = []
        
        if strategy:
            query += " AND strategy = ?"
            params.append(strategy)
            
        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)
            
        if from_time:
            query += " AND timestamp >= ?"
            params.append(from_time.isoformat())
            
        if to_time:
            query += " AND timestamp <= ?"
            params.append(to_time.isoformat())
            
        query += " ORDER BY timestamp DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        signals = []
        for row in rows:
            signal = dict(row)
            
            # Parse metadata if present
            if signal.get('metadata'):
                signal['metadata'] = json.loads(signal['metadata'])
                
            signals.append(signal)
            
        return signals
        
    # ============ Trade Methods ============
    
    def save_trade(self, trade: Dict[str, Any]) -> str:
        """
        Save or update a trade.
        
        Args:
            trade: Trade dictionary
            
        Returns:
            ID of the saved trade
        """
        cursor = self.conn.cursor()
        trade_id = trade.get('id')
        
        if not trade_id:
            # New trade, generate ID
            import uuid
            trade_id = str(uuid.uuid4())
            trade['id'] = trade_id
            
        # Convert metadata to JSON if present
        metadata = trade.get('metadata')
        if metadata:
            metadata = json.dumps(metadata)
            
        if 'exit_price' in trade and 'exit_time' in trade:
            # Complete trade with exit information
            cursor.execute('''
            INSERT OR REPLACE INTO trades (
                id, agent_id, symbol, direction, entry_price, entry_time,
                exit_price, exit_time, quantity, pnl, status, metadata,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                trade_id,
                trade['agent_id'],
                trade['symbol'],
                trade['direction'],
                trade['entry_price'],
                trade['entry_time'],
                trade['exit_price'],
                trade['exit_time'],
                trade['quantity'],
                trade.get('pnl'),
                trade['status'],
                metadata
            ))
        else:
            # Open trade without exit information
            cursor.execute('''
            INSERT OR REPLACE INTO trades (
                id, agent_id, symbol, direction, entry_price, entry_time,
                quantity, status, metadata, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                trade_id,
                trade['agent_id'],
                trade['symbol'],
                trade['direction'],
                trade['entry_price'],
                trade['entry_time'],
                trade['quantity'],
                trade['status'],
                metadata
            ))
            
        self.conn.commit()
        return trade_id
        
    def get_trades(self,
                  agent_id: Optional[str] = None,
                  symbol: Optional[str] = None,
                  status: Optional[str] = None,
                  from_time: Optional[datetime] = None,
                  to_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get trades with optional filtering.
        
        Args:
            agent_id: Filter by agent ID
            symbol: Filter by symbol
            status: Filter by status
            from_time: Filter trades after this time
            to_time: Filter trades before this time
            
        Returns:
            List of trade dictionaries
        """
        cursor = self.conn.cursor()
        
        query = "SELECT * FROM trades WHERE 1=1"
        params = []
        
        if agent_id:
            query += " AND agent_id = ?"
            params.append(agent_id)
            
        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)
            
        if status:
            query += " AND status = ?"
            params.append(status)
            
        if from_time:
            query += " AND entry_time >= ?"
            params.append(from_time.isoformat())
            
        if to_time:
            query += " AND entry_time <= ?"
            params.append(to_time.isoformat())
            
        query += " ORDER BY entry_time DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        trades = []
        for row in rows:
            trade = dict(row)
            
            # Parse metadata if present
            if trade.get('metadata'):
                trade['metadata'] = json.loads(trade['metadata'])
                
            trades.append(trade)
            
        return trades
        
    # ============ Market Data Methods ============
    
    def save_market_data(self, data: Dict[str, Any]) -> int:
        """
        Save market data (OHLCV).
        
        Args:
            data: Market data dictionary
            
        Returns:
            ID of the saved market data
        """
        cursor = self.conn.cursor()
        
        cursor.execute('''
        INSERT OR REPLACE INTO market_data (
            symbol, timeframe, timestamp, 
            open, high, low, close, volume
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['symbol'],
            data['timeframe'],
            data['timestamp'],
            data['open'],
            data['high'],
            data['low'],
            data['close'],
            data['volume']
        ))
        
        self.conn.commit()
        return cursor.lastrowid
        
    def get_market_data(self,
                       symbol: str,
                       timeframe: str,
                       from_time: Optional[datetime] = None,
                       to_time: Optional[datetime] = None,
                       limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get market data with filtering.
        
        Args:
            symbol: Symbol to get data for
            timeframe: Timeframe to get data for
            from_time: Get data after this time
            to_time: Get data before this time
            limit: Maximum number of candles to return
            
        Returns:
            List of market data dictionaries
        """
        cursor = self.conn.cursor()
        
        query = "SELECT * FROM market_data WHERE symbol = ? AND timeframe = ?"
        params = [symbol, timeframe]
        
        if from_time:
            query += " AND timestamp >= ?"
            params.append(from_time.isoformat())
            
        if to_time:
            query += " AND timestamp <= ?"
            params.append(to_time.isoformat())
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        return [dict(row) for row in rows]
    
    # ============ Metrics Methods ============
    
    def save_metrics(self, metric_type: str, timestamp: str, data: Dict[str, Any]) -> int:
        """
        Save metrics data.
        
        Args:
            metric_type: Type of metrics (e.g., 'signals', 'trades')
            timestamp: Timestamp of the metrics
            data: Metrics data dictionary
            
        Returns:
            ID of the saved metrics
        """
        cursor = self.conn.cursor()
        
        # Convert data to JSON
        data_json = json.dumps(data)
        
        cursor.execute('''
        INSERT INTO metrics (type, timestamp, data)
        VALUES (?, ?, ?)
        ''', (metric_type, timestamp, data_json))
        
        self.conn.commit()
        return cursor.lastrowid
    
    def get_metrics(self, 
                   metric_type: str,
                   from_time: Optional[datetime] = None,
                   to_time: Optional[datetime] = None,
                   limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get metrics with filtering.
        
        Args:
            metric_type: Type of metrics to retrieve
            from_time: Get metrics after this time
            to_time: Get metrics before this time
            limit: Maximum number of metrics to return
            
        Returns:
            List of metrics dictionaries
        """
        cursor = self.conn.cursor()
        
        query = "SELECT * FROM metrics WHERE type = ?"
        params = [metric_type]
        
        if from_time:
            query += " AND timestamp >= ?"
            params.append(from_time.isoformat())
            
        if to_time:
            query += " AND timestamp <= ?"
            params.append(to_time.isoformat())
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Parse the data JSON
        metrics = []
        for row in rows:
            metric = dict(row)
            metric['data'] = json.loads(metric['data'])
            metrics.append(metric)
            
        return metrics
    
    def get_latest_metric(self, metric_type: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest metric of a specific type.
        
        Args:
            metric_type: Type of metric to retrieve
            
        Returns:
            Latest metric dictionary or None if not found
        """
        cursor = self.conn.cursor()
        
        cursor.execute('''
        SELECT * FROM metrics 
        WHERE type = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
        ''', (metric_type,))
        
        row = cursor.fetchone()
        if not row:
            return None
            
        metric = dict(row)
        metric['data'] = json.loads(metric['data'])
        return metric
    
    def close(self):
        """Close the database connection."""
        if self.conn:
            self.conn.close()
