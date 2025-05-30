"""
ElizaOS Agent Memory Persistence Layer
Provides long-term memory storage and retrieval for ElizaOS agents
"""

import asyncio
import json
import logging
import os
import time
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple
import uuid

from .eliza_protocol import MessageType, ElizaProtocol

logger = logging.getLogger(__name__)

class MemoryPersistence:
    """
    Memory persistence layer for ElizaOS agents.
    
    Responsibilities:
    1. Store agent memories in a structured database
    2. Provide retrieval mechanisms with semantic search
    3. Support memory consolidation and summarization
    4. Enable episodic and semantic memory types
    """
    
    def __init__(self, db_path: str = None):
        """
        Initialize the memory persistence layer.
        
        Args:
            db_path: Path to the SQLite database file (default: TradingFarm/data/agent_memory.db)
        """
        if db_path is None:
            # Default location in the TradingFarm data directory
            data_dir = os.path.abspath(os.path.join(
                os.path.dirname(__file__), '..', '..', 'data'
            ))
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, 'agent_memory.db')
        
        self.db_path = db_path
        self._connection = None
        self._initialize_database()
        logger.info(f"Initialized memory persistence with database at {db_path}")
    
    def _initialize_database(self) -> None:
        """Initialize the SQLite database schema."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create agents table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_active INTEGER NOT NULL
        )
        ''')
        
        # Create memories table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            memory_type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            importance REAL DEFAULT 0.5,
            FOREIGN KEY (agent_id) REFERENCES agents (id)
        )
        ''')
        
        # Create memory tags table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS memory_tags (
            memory_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY (memory_id, tag),
            FOREIGN KEY (memory_id) REFERENCES memories (id)
        )
        ''')
        
        # Create embeddings table for semantic search
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings (
            memory_id TEXT NOT NULL,
            embedding BLOB NOT NULL,
            PRIMARY KEY (memory_id),
            FOREIGN KEY (memory_id) REFERENCES memories (id)
        )
        ''')
        
        # Create memory relationships table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS memory_relationships (
            source_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            strength REAL DEFAULT 0.5,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (source_id, target_id, relationship_type),
            FOREIGN KEY (source_id) REFERENCES memories (id),
            FOREIGN KEY (target_id) REFERENCES memories (id)
        )
        ''')
        
        # Create consolidated memories table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS consolidated_memories (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            source_memories TEXT NOT NULL,  -- JSON array of memory IDs
            created_at INTEGER NOT NULL,
            importance REAL DEFAULT 0.5,
            FOREIGN KEY (agent_id) REFERENCES agents (id)
        )
        ''')
        
        conn.commit()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get a connection to the SQLite database."""
        if self._connection is None:
            self._connection = sqlite3.connect(self.db_path)
            self._connection.row_factory = sqlite3.Row
        return self._connection
    
    def register_agent(self, agent_id: str, agent_name: str, agent_type: str) -> None:
        """
        Register an agent in the memory system.
        
        Args:
            agent_id: Unique identifier for the agent
            agent_name: Human-readable name for the agent
            agent_type: Type of agent
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        now = int(time.time() * 1000)
        
        cursor.execute(
            "INSERT OR REPLACE INTO agents (id, name, type, created_at, last_active) VALUES (?, ?, ?, ?, ?)",
            (agent_id, agent_name, agent_type, now, now)
        )
        
        conn.commit()
        logger.info(f"Registered agent in memory system: {agent_name} ({agent_id})")
    
    def update_agent_activity(self, agent_id: str) -> None:
        """
        Update the last active timestamp for an agent.
        
        Args:
            agent_id: Unique identifier for the agent
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        now = int(time.time() * 1000)
        
        cursor.execute(
            "UPDATE agents SET last_active = ? WHERE id = ?",
            (now, agent_id)
        )
        
        conn.commit()
    
    def create_memory(
        self, 
        agent_id: str, 
        memory_type: str, 
        title: str, 
        content: Dict[str, Any], 
        tags: List[str] = None,
        importance: float = 0.5,
        embedding: Optional[bytes] = None
    ) -> str:
        """
        Create a new memory for an agent.
        
        Args:
            agent_id: ID of the agent
            memory_type: Type of memory (episodic, semantic, procedural)
            title: Title/summary of the memory
            content: Memory content as a dictionary
            tags: List of tags for categorization
            importance: Importance score (0.0 to 1.0)
            embedding: Vector embedding for semantic search
            
        Returns:
            Memory ID
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if agent exists
        cursor.execute("SELECT id FROM agents WHERE id = ?", (agent_id,))
        if cursor.fetchone() is None:
            raise ValueError(f"Agent {agent_id} not registered in memory system")
        
        memory_id = str(uuid.uuid4())
        now = int(time.time() * 1000)
        
        # Convert content to JSON
        content_json = json.dumps(content)
        
        # Create memory
        cursor.execute(
            "INSERT INTO memories (id, agent_id, memory_type, title, content, created_at, updated_at, importance) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (memory_id, agent_id, memory_type, title, content_json, now, now, importance)
        )
        
        # Add tags
        if tags:
            tag_params = [(memory_id, tag) for tag in tags]
            cursor.executemany(
                "INSERT INTO memory_tags (memory_id, tag) VALUES (?, ?)",
                tag_params
            )
        
        # Add embedding if provided
        if embedding is not None:
            cursor.execute(
                "INSERT INTO embeddings (memory_id, embedding) VALUES (?, ?)",
                (memory_id, embedding)
            )
        
        conn.commit()
        logger.info(f"Created memory {memory_id} for agent {agent_id}: {title}")
        
        return memory_id
    
    def update_memory(
        self, 
        memory_id: str, 
        title: Optional[str] = None, 
        content: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        importance: Optional[float] = None,
        embedding: Optional[bytes] = None
    ) -> bool:
        """
        Update an existing memory.
        
        Args:
            memory_id: ID of the memory to update
            title: New title (optional)
            content: New content (optional)
            tags: New tags (optional)
            importance: New importance score (optional)
            embedding: New embedding (optional)
            
        Returns:
            True if the memory was updated, False if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if memory exists
        cursor.execute("SELECT id FROM memories WHERE id = ?", (memory_id,))
        if cursor.fetchone() is None:
            logger.warning(f"Memory {memory_id} not found for update")
            return False
        
        now = int(time.time() * 1000)
        update_params = []
        update_query_parts = ["updated_at = ?"]
        update_params.append(now)
        
        if title is not None:
            update_query_parts.append("title = ?")
            update_params.append(title)
        
        if content is not None:
            update_query_parts.append("content = ?")
            update_params.append(json.dumps(content))
        
        if importance is not None:
            update_query_parts.append("importance = ?")
            update_params.append(importance)
        
        if update_query_parts:
            update_query = "UPDATE memories SET " + ", ".join(update_query_parts) + " WHERE id = ?"
            update_params.append(memory_id)
            cursor.execute(update_query, update_params)
        
        # Update tags if provided
        if tags is not None:
            # Remove existing tags
            cursor.execute("DELETE FROM memory_tags WHERE memory_id = ?", (memory_id,))
            
            # Add new tags
            tag_params = [(memory_id, tag) for tag in tags]
            cursor.executemany(
                "INSERT INTO memory_tags (memory_id, tag) VALUES (?, ?)",
                tag_params
            )
        
        # Update embedding if provided
        if embedding is not None:
            cursor.execute("DELETE FROM embeddings WHERE memory_id = ?", (memory_id,))
            cursor.execute(
                "INSERT INTO embeddings (memory_id, embedding) VALUES (?, ?)",
                (memory_id, embedding)
            )
        
        conn.commit()
        logger.info(f"Updated memory {memory_id}")
        
        return True
    
    def delete_memory(self, memory_id: str) -> bool:
        """
        Delete a memory.
        
        Args:
            memory_id: ID of the memory to delete
            
        Returns:
            True if the memory was deleted, False if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if memory exists
        cursor.execute("SELECT id FROM memories WHERE id = ?", (memory_id,))
        if cursor.fetchone() is None:
            logger.warning(f"Memory {memory_id} not found for deletion")
            return False
        
        # Delete related records
        cursor.execute("DELETE FROM memory_tags WHERE memory_id = ?", (memory_id,))
        cursor.execute("DELETE FROM embeddings WHERE memory_id = ?", (memory_id,))
        cursor.execute("DELETE FROM memory_relationships WHERE source_id = ? OR target_id = ?", (memory_id, memory_id))
        
        # Delete the memory
        cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        
        conn.commit()
        logger.info(f"Deleted memory {memory_id}")
        
        return True
    
    def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a memory by ID.
        
        Args:
            memory_id: ID of the memory
            
        Returns:
            Memory data or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Get memory
        cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
        memory_row = cursor.fetchone()
        
        if memory_row is None:
            return None
        
        # Get tags
        cursor.execute("SELECT tag FROM memory_tags WHERE memory_id = ?", (memory_id,))
        tags = [row['tag'] for row in cursor.fetchall()]
        
        memory = dict(memory_row)
        memory['content'] = json.loads(memory['content'])
        memory['tags'] = tags
        
        return memory
    
    def get_agent_memories(
        self, 
        agent_id: str, 
        memory_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "updated_at",
        sort_order: str = "DESC"
    ) -> List[Dict[str, Any]]:
        """
        Retrieve memories for an agent.
        
        Args:
            agent_id: ID of the agent
            memory_type: Filter by memory type (optional)
            tags: Filter by tags (optional)
            limit: Maximum number of memories to return
            offset: Offset for pagination
            sort_by: Field to sort by
            sort_order: Sort order (ASC or DESC)
            
        Returns:
            List of memory data
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM memories WHERE agent_id = ?"
        params = [agent_id]
        
        if memory_type:
            query += " AND memory_type = ?"
            params.append(memory_type)
        
        if tags:
            placeholders = ','.join(['?'] * len(tags))
            query += f" AND id IN (SELECT memory_id FROM memory_tags WHERE tag IN ({placeholders}) GROUP BY memory_id HAVING COUNT(DISTINCT tag) = ?)"
            params.extend(tags)
            params.append(len(tags))
        
        query += f" ORDER BY {sort_by} {sort_order} LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        memory_rows = cursor.fetchall()
        
        memories = []
        for row in memory_rows:
            memory_id = row['id']
            
            # Get tags
            cursor.execute("SELECT tag FROM memory_tags WHERE memory_id = ?", (memory_id,))
            tags = [row['tag'] for row in cursor.fetchall()]
            
            memory = dict(row)
            memory['content'] = json.loads(memory['content'])
            memory['tags'] = tags
            
            memories.append(memory)
        
        return memories
    
    def search_memories(
        self, 
        agent_id: str, 
        query: str,
        memory_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search memories by text query.
        
        Args:
            agent_id: ID of the agent
            query: Search query
            memory_type: Filter by memory type (optional)
            tags: Filter by tags (optional)
            limit: Maximum number of memories to return
            
        Returns:
            List of memory data
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # For a basic implementation, we'll search in the title and content fields
        # In a production system, this would use vector embeddings and semantic search
        
        search_terms = f"%{query}%"
        query_params = [agent_id, search_terms, search_terms]
        
        query = """
        SELECT * FROM memories 
        WHERE agent_id = ? 
        AND (title LIKE ? OR content LIKE ?)
        """
        
        if memory_type:
            query += " AND memory_type = ?"
            query_params.append(memory_type)
        
        if tags:
            placeholders = ','.join(['?'] * len(tags))
            query += f" AND id IN (SELECT memory_id FROM memory_tags WHERE tag IN ({placeholders}) GROUP BY memory_id HAVING COUNT(DISTINCT tag) = ?)"
            query_params.extend(tags)
            query_params.append(len(tags))
        
        query += " ORDER BY importance DESC LIMIT ?"
        query_params.append(limit)
        
        cursor.execute(query, query_params)
        memory_rows = cursor.fetchall()
        
        memories = []
        for row in memory_rows:
            memory_id = row['id']
            
            # Get tags
            cursor.execute("SELECT tag FROM memory_tags WHERE memory_id = ?", (memory_id,))
            tags = [row['tag'] for row in cursor.fetchall()]
            
            memory = dict(row)
            memory['content'] = json.loads(memory['content'])
            memory['tags'] = tags
            
            memories.append(memory)
        
        return memories
    
    def create_memory_relationship(
        self, 
        source_id: str, 
        target_id: str, 
        relationship_type: str,
        strength: float = 0.5
    ) -> bool:
        """
        Create a relationship between two memories.
        
        Args:
            source_id: ID of the source memory
            target_id: ID of the target memory
            relationship_type: Type of relationship
            strength: Strength of the relationship (0.0 to 1.0)
            
        Returns:
            True if the relationship was created
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        now = int(time.time() * 1000)
        
        cursor.execute(
            "INSERT OR REPLACE INTO memory_relationships (source_id, target_id, relationship_type, strength, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (source_id, target_id, relationship_type, strength, now)
        )
        
        conn.commit()
        logger.info(f"Created relationship between memories {source_id} and {target_id}: {relationship_type}")
        
        return True
    
    def get_related_memories(
        self, 
        memory_id: str, 
        relationship_type: Optional[str] = None,
        direction: str = "both",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get memories related to a given memory.
        
        Args:
            memory_id: ID of the memory
            relationship_type: Type of relationship (optional)
            direction: Relationship direction ("outgoing", "incoming", or "both")
            limit: Maximum number of related memories to return
            
        Returns:
            List of related memory data
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query_parts = []
        params = []
        
        if direction in ["outgoing", "both"]:
            outgoing_query = "SELECT target_id AS related_id, relationship_type, strength FROM memory_relationships WHERE source_id = ?"
            if relationship_type:
                outgoing_query += " AND relationship_type = ?"
                query_parts.append(outgoing_query)
                params.extend([memory_id, relationship_type])
            else:
                query_parts.append(outgoing_query)
                params.append(memory_id)
        
        if direction in ["incoming", "both"]:
            incoming_query = "SELECT source_id AS related_id, relationship_type, strength FROM memory_relationships WHERE target_id = ?"
            if relationship_type:
                incoming_query += " AND relationship_type = ?"
                query_parts.append(incoming_query)
                params.extend([memory_id, relationship_type])
            else:
                query_parts.append(incoming_query)
                params.append(memory_id)
        
        full_query = " UNION ".join(query_parts) + " ORDER BY strength DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(full_query, params)
        relationship_rows = cursor.fetchall()
        
        related_memories = []
        for row in relationship_rows:
            related_id = row['related_id']
            
            # Get the related memory
            cursor.execute("SELECT * FROM memories WHERE id = ?", (related_id,))
            memory_row = cursor.fetchone()
            
            if memory_row:
                # Get tags
                cursor.execute("SELECT tag FROM memory_tags WHERE memory_id = ?", (related_id,))
                tags = [row['tag'] for row in cursor.fetchall()]
                
                memory = dict(memory_row)
                memory['content'] = json.loads(memory['content'])
                memory['tags'] = tags
                memory['relationship'] = {
                    'type': row['relationship_type'],
                    'strength': row['strength']
                }
                
                related_memories.append(memory)
        
        return related_memories
    
    def consolidate_memories(
        self, 
        agent_id: str, 
        source_memory_ids: List[str],
        title: str,
        content: Dict[str, Any],
        importance: float = 0.5
    ) -> str:
        """
        Consolidate multiple memories into a single consolidated memory.
        
        Args:
            agent_id: ID of the agent
            source_memory_ids: IDs of memories to consolidate
            title: Title for the consolidated memory
            content: Content for the consolidated memory
            importance: Importance score (0.0 to 1.0)
            
        Returns:
            ID of the consolidated memory
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if agent exists
        cursor.execute("SELECT id FROM agents WHERE id = ?", (agent_id,))
        if cursor.fetchone() is None:
            raise ValueError(f"Agent {agent_id} not registered in memory system")
        
        consolidated_id = str(uuid.uuid4())
        now = int(time.time() * 1000)
        
        # Convert content and source memory IDs to JSON
        content_json = json.dumps(content)
        source_ids_json = json.dumps(source_memory_ids)
        
        # Create consolidated memory
        cursor.execute(
            "INSERT INTO consolidated_memories (id, agent_id, title, content, source_memories, created_at, importance) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (consolidated_id, agent_id, title, content_json, source_ids_json, now, importance)
        )
        
        conn.commit()
        logger.info(f"Created consolidated memory {consolidated_id} from {len(source_memory_ids)} source memories")
        
        return consolidated_id
    
    def get_consolidated_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a consolidated memory by ID.
        
        Args:
            memory_id: ID of the consolidated memory
            
        Returns:
            Consolidated memory data or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM consolidated_memories WHERE id = ?", (memory_id,))
        memory_row = cursor.fetchone()
        
        if memory_row is None:
            return None
        
        memory = dict(memory_row)
        memory['content'] = json.loads(memory['content'])
        memory['source_memories'] = json.loads(memory['source_memories'])
        
        return memory
    
    def get_agent_consolidated_memories(
        self, 
        agent_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve consolidated memories for an agent.
        
        Args:
            agent_id: ID of the agent
            limit: Maximum number of memories to return
            offset: Offset for pagination
            
        Returns:
            List of consolidated memory data
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM consolidated_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (agent_id, limit, offset)
        )
        memory_rows = cursor.fetchall()
        
        memories = []
        for row in memory_rows:
            memory = dict(row)
            memory['content'] = json.loads(memory['content'])
            memory['source_memories'] = json.loads(memory['source_memories'])
            
            memories.append(memory)
        
        return memories
    
    def close(self) -> None:
        """Close database connection."""
        if self._connection:
            self._connection.close()
            self._connection = None
            logger.info("Closed memory persistence database connection")

    def generate_embedding(self, text: str) -> bytes:
        """
        Generate an embedding for text using a simple placeholder implementation.
        
        In a real implementation, this would use a proper embedding model.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Serialized embedding
        """
        # Placeholder implementation - in a real system, use a proper embedding model
        import hashlib
        import struct
        
        # Generate a simple hash-based embedding (for demonstration only)
        h = hashlib.sha256(text.encode('utf-8')).digest()
        return h
    
    def retrieve_relevant_context(
        self,
        agent_id: str,
        query: str,
        memory_types: Optional[List[str]] = None,
        max_items: int = 5
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context for a query from an agent's memories.
        
        Args:
            agent_id: ID of the agent
            query: Context query
            memory_types: Types of memories to include
            max_items: Maximum number of items to include
            
        Returns:
            Context data
        """
        # Retrieve relevant memories
        memories = self.search_memories(
            agent_id=agent_id,
            query=query,
            memory_type=memory_types[0] if memory_types and len(memory_types) > 0 else None,
            limit=max_items
        )
        
        # Simple implementation of context aggregation
        context = {
            "query": query,
            "timestamp": int(time.time() * 1000),
            "relevant_memories": memories,
            "summary": f"Context for query: {query}"
        }
        
        return context
