"""
Neon Database Strategy Store for ElizaOS MCP Server.
Handles storage and retrieval of trading strategies from Neon database.
"""
import os
import json
import logging
import psycopg2
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("neon_store")

class NeonStrategyStore:
    """
    Manages trading strategies in Neon PostgreSQL database.
    """
    
    def __init__(self):
        """Initialize the Neon strategy store."""
        self.project_id = os.getenv('NEON_PROJECT_ID')
        self.branch_id = os.getenv('NEON_BRANCH_ID')
        self.api_key = os.getenv('NEON_API_KEY')
        self.database_name = 'trading_farm'
        
        # Set up connection string
        self.connection_string = f"postgres://neon:{self.api_key}@{self.project_id}.{self.branch_id}.neon.tech/{self.database_name}?sslmode=require"
    
    def connect(self):
        """Create a database connection."""
        try:
            conn = psycopg2.connect(self.connection_string)
            return conn
        except Exception as e:
            logger.error(f"Error connecting to Neon database: {e}")
            return None
    
    def test_connection(self) -> bool:
        """Test the database connection."""
        conn = self.connect()
        if conn:
            conn.close()
            return True
        return False
    
    def initialize_tables(self) -> bool:
        """Initialize the required database tables."""
        conn = self.connect()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # Create the strategies table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS strategies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    config JSONB NOT NULL,
                    is_active BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create the strategy_executions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS strategy_executions (
                    id SERIAL PRIMARY KEY,
                    strategy_id INTEGER REFERENCES strategies(id),
                    status VARCHAR(50) NOT NULL,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    results JSONB,
                    logs TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create the trades table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    id SERIAL PRIMARY KEY,
                    strategy_id INTEGER REFERENCES strategies(id),
                    execution_id INTEGER REFERENCES strategy_executions(id),
                    symbol VARCHAR(50) NOT NULL,
                    side VARCHAR(10) NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    quantity DECIMAL(18, 8) NOT NULL,
                    price DECIMAL(18, 8),
                    status VARCHAR(20) NOT NULL,
                    exchange VARCHAR(50) NOT NULL,
                    chain VARCHAR(50) NOT NULL,
                    order_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("Database tables initialized successfully")
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error initializing database tables: {e}")
            return False
        finally:
            conn.close()
    
    def create_strategy(self, name: str, description: str, config: Dict[str, Any]) -> Optional[int]:
        """
        Create a new trading strategy.
        
        Args:
            name: Strategy name
            description: Strategy description
            config: Strategy configuration as JSON
        
        Returns:
            The ID of the created strategy or None if failed
        """
        conn = self.connect()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO strategies (name, description, config)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (name, description, json.dumps(config)))
            
            strategy_id = cursor.fetchone()[0]
            conn.commit()
            
            logger.info(f"Created strategy {name} with ID {strategy_id}")
            return strategy_id
        except Exception as e:
            conn.rollback()
            logger.error(f"Error creating strategy: {e}")
            return None
        finally:
            conn.close()
    
    def get_strategy(self, strategy_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a strategy by ID.
        
        Args:
            strategy_id: Strategy ID
        
        Returns:
            Strategy data or None if not found
        """
        conn = self.connect()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, config, is_active, 
                       created_at, updated_at
                FROM strategies
                WHERE id = %s
            """, (strategy_id,))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            return {
                'id': result[0],
                'name': result[1],
                'description': result[2],
                'config': result[3],
                'is_active': result[4],
                'created_at': result[5],
                'updated_at': result[6]
            }
        except Exception as e:
            logger.error(f"Error getting strategy: {e}")
            return None
        finally:
            conn.close()
    
    def list_strategies(self) -> List[Dict[str, Any]]:
        """
        List all strategies.
        
        Returns:
            List of strategies
        """
        conn = self.connect()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, is_active, created_at, updated_at
                FROM strategies
                ORDER BY created_at DESC
            """)
            
            strategies = []
            for row in cursor.fetchall():
                strategies.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'is_active': row[3],
                    'created_at': row[4],
                    'updated_at': row[5]
                })
            
            return strategies
        except Exception as e:
            logger.error(f"Error listing strategies: {e}")
            return []
        finally:
            conn.close()
    
    def update_strategy(self, strategy_id: int, data: Dict[str, Any]) -> bool:
        """
        Update a strategy.
        
        Args:
            strategy_id: Strategy ID
            data: Data to update
        
        Returns:
            True if successful, False otherwise
        """
        conn = self.connect()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # Build SET clause dynamically based on provided data
            set_clause = []
            values = []
            
            if 'name' in data:
                set_clause.append("name = %s")
                values.append(data['name'])
            
            if 'description' in data:
                set_clause.append("description = %s")
                values.append(data['description'])
            
            if 'config' in data:
                set_clause.append("config = %s")
                values.append(json.dumps(data['config']))
            
            if 'is_active' in data:
                set_clause.append("is_active = %s")
                values.append(data['is_active'])
            
            set_clause.append("updated_at = CURRENT_TIMESTAMP")
            
            if not set_clause:
                return True  # Nothing to update
            
            query = f"""
                UPDATE strategies
                SET {', '.join(set_clause)}
                WHERE id = %s
            """
            
            values.append(strategy_id)
            
            cursor.execute(query, values)
            conn.commit()
            
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error updating strategy: {e}")
            return False
        finally:
            conn.close()
    
    def delete_strategy(self, strategy_id: int) -> bool:
        """
        Delete a strategy.
        
        Args:
            strategy_id: Strategy ID
        
        Returns:
            True if successful, False otherwise
        """
        conn = self.connect()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # First check if there are any trades for this strategy
            cursor.execute("""
                SELECT COUNT(*) FROM trades WHERE strategy_id = %s
            """, (strategy_id,))
            
            trades_count = cursor.fetchone()[0]
            if trades_count > 0:
                logger.error(f"Cannot delete strategy {strategy_id} with existing trades")
                return False
            
            # Delete strategy executions
            cursor.execute("""
                DELETE FROM strategy_executions WHERE strategy_id = %s
            """, (strategy_id,))
            
            # Delete the strategy
            cursor.execute("""
                DELETE FROM strategies WHERE id = %s
            """, (strategy_id,))
            
            conn.commit()
            
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error deleting strategy: {e}")
            return False
        finally:
            conn.close()
    
    def record_trade(self, trade_data: Dict[str, Any]) -> Optional[int]:
        """
        Record a trade.
        
        Args:
            trade_data: Trade data
        
        Returns:
            Trade ID if successful, None otherwise
        """
        conn = self.connect()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO trades (
                    strategy_id, execution_id, symbol, side, type,
                    quantity, price, status, exchange, chain, order_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                trade_data.get('strategy_id'),
                trade_data.get('execution_id'),
                trade_data.get('symbol'),
                trade_data.get('side'),
                trade_data.get('type'),
                trade_data.get('quantity'),
                trade_data.get('price'),
                trade_data.get('status'),
                trade_data.get('exchange'),
                trade_data.get('chain'),
                trade_data.get('order_id')
            ))
            
            trade_id = cursor.fetchone()[0]
            conn.commit()
            
            return trade_id
        except Exception as e:
            conn.rollback()
            logger.error(f"Error recording trade: {e}")
            return None
        finally:
            conn.close()
    
    def get_trades(self, 
                  strategy_id: Optional[int] = None,
                  symbol: Optional[str] = None,
                  limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get trades with optional filtering.
        
        Args:
            strategy_id: Filter by strategy ID (optional)
            symbol: Filter by symbol (optional)
            limit: Maximum number of trades to return
        
        Returns:
            List of trades
        """
        conn = self.connect()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT id, strategy_id, execution_id, symbol, side, type,
                       quantity, price, status, exchange, chain, order_id,
                       created_at, updated_at
                FROM trades
                WHERE 1=1
            """
            
            params = []
            
            if strategy_id:
                query += " AND strategy_id = %s"
                params.append(strategy_id)
            
            if symbol:
                query += " AND symbol = %s"
                params.append(symbol)
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            
            trades = []
            for row in cursor.fetchall():
                trades.append({
                    'id': row[0],
                    'strategy_id': row[1],
                    'execution_id': row[2],
                    'symbol': row[3],
                    'side': row[4],
                    'type': row[5],
                    'quantity': float(row[6]),
                    'price': float(row[7]) if row[7] else None,
                    'status': row[8],
                    'exchange': row[9],
                    'chain': row[10],
                    'order_id': row[11],
                    'created_at': row[12],
                    'updated_at': row[13]
                })
            
            return trades
        except Exception as e:
            logger.error(f"Error getting trades: {e}")
            return []
        finally:
            conn.close()
