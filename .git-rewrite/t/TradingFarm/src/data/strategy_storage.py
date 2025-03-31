"""
Strategy State Storage Module

Implements efficient storage and retrieval for trading strategy states,
allowing strategies to persist and recover their state across restarts.
Supports serialization of complex strategy objects and versioning.
"""

import os
import json
import pickle
import logging
import asyncio
import datetime
from typing import Dict, List, Any, Optional, Union, Type, TypeVar, Generic
import uuid
import zlib
import base64
from pathlib import Path

import redis.asyncio as redis
import motor.motor_asyncio
from bson.objectid import ObjectId
from bson.binary import Binary


logger = logging.getLogger("data.strategy_storage")

# Type variable for strategy class
T = TypeVar('T')


class StrategyState:
    """Base class for strategy state objects."""
    
    def __init__(self, strategy_id: str, strategy_type: str):
        """
        Initialize strategy state.
        
        Args:
            strategy_id: Unique identifier for the strategy instance
            strategy_type: Type of strategy
        """
        self.strategy_id = strategy_id
        self.strategy_type = strategy_type
        self.created_at = datetime.datetime.now()
        self.updated_at = self.created_at
        self.version = 1
        self.metadata: Dict[str, Any] = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert state to dictionary.
        
        Returns:
            Dictionary representation of state
        """
        return {
            "strategy_id": self.strategy_id,
            "strategy_type": self.strategy_type,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StrategyState':
        """
        Create state from dictionary.
        
        Args:
            data: Dictionary representation of state
            
        Returns:
            StrategyState instance
        """
        state = cls(
            strategy_id=data["strategy_id"],
            strategy_type=data["strategy_type"]
        )
        state.created_at = data.get("created_at", datetime.datetime.now())
        state.updated_at = data.get("updated_at", datetime.datetime.now())
        state.version = data.get("version", 1)
        state.metadata = data.get("metadata", {})
        return state


class StrategyStorage(Generic[T]):
    """
    Storage for strategy states.
    
    Provides methods for saving and loading strategy states, with
    support for different storage backends.
    """
    
    # Storage backends
    BACKEND_FILE = "file"
    BACKEND_REDIS = "redis"
    BACKEND_MONGO = "mongo"
    
    def __init__(
        self,
        strategy_class: Type[T],
        backend: str = "file",
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize strategy storage.
        
        Args:
            strategy_class: Strategy class
            backend: Storage backend (file, redis, mongo)
            config: Backend configuration
        """
        self.strategy_class = strategy_class
        self.backend = backend
        self.config = config or {}
        
        # Initialize backend client
        self.client = None
        self.initialized = False
        
        # Default paths for file storage
        self.base_path = self.config.get("base_path", "strategy_states")
        
        # Redis configuration
        self.redis_url = self.config.get("redis_url", "redis://localhost:6379")
        self.redis_db = self.config.get("redis_db", 0)
        self.redis_prefix = self.config.get("redis_prefix", "strategy:")
        
        # MongoDB configuration
        self.mongo_url = self.config.get("mongo_url", "mongodb://localhost:27017")
        self.mongo_db = self.config.get("mongo_db", "trading_farm")
        self.mongo_collection = self.config.get("mongo_collection", "strategy_states")
    
    async def initialize(self) -> bool:
        """
        Initialize the storage backend.
        
        Returns:
            True if initialization was successful
        """
        try:
            if self.backend == self.BACKEND_FILE:
                # Create directory if it doesn't exist
                os.makedirs(self.base_path, exist_ok=True)
                self.initialized = True
                
            elif self.backend == self.BACKEND_REDIS:
                # Connect to Redis
                self.client = redis.Redis.from_url(
                    url=self.redis_url,
                    db=self.redis_db,
                    decode_responses=False
                )
                # Test connection
                await self.client.ping()
                self.initialized = True
                
            elif self.backend == self.BACKEND_MONGO:
                # Connect to MongoDB
                mongo_client = motor.motor_asyncio.AsyncIOMotorClient(self.mongo_url)
                self.client = mongo_client[self.mongo_db][self.mongo_collection]
                # Test connection
                await self.client.find_one({})
                self.initialized = True
                
            else:
                logger.error(f"Unsupported backend: {self.backend}")
                return False
            
            logger.info(f"Strategy storage initialized with {self.backend} backend")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing strategy storage: {str(e)}")
            return False
    
    def _serialize_object(self, obj: Any) -> bytes:
        """
        Serialize an object to bytes.
        
        Args:
            obj: Object to serialize
            
        Returns:
            Serialized object as bytes
        """
        # Pickle the object and compress it
        pickled = pickle.dumps(obj)
        compressed = zlib.compress(pickled)
        return compressed
    
    def _deserialize_object(self, data: bytes) -> Any:
        """
        Deserialize an object from bytes.
        
        Args:
            data: Serialized object as bytes
            
        Returns:
            Deserialized object
        """
        # Decompress and unpickle the object
        decompressed = zlib.decompress(data)
        obj = pickle.loads(decompressed)
        return obj
    
    def _encode_for_file(self, data: bytes) -> str:
        """
        Encode binary data for file storage.
        
        Args:
            data: Binary data
            
        Returns:
            Base64-encoded data
        """
        return base64.b64encode(data).decode('utf-8')
    
    def _decode_from_file(self, data: str) -> bytes:
        """
        Decode data from file storage.
        
        Args:
            data: Base64-encoded data
            
        Returns:
            Binary data
        """
        return base64.b64decode(data.encode('utf-8'))
    
    def _get_file_path(self, strategy_id: str) -> str:
        """
        Get file path for a strategy state.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            File path
        """
        return os.path.join(self.base_path, f"{strategy_id}.json")
    
    def _get_redis_key(self, strategy_id: str) -> str:
        """
        Get Redis key for a strategy state.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            Redis key
        """
        return f"{self.redis_prefix}{strategy_id}"
    
    async def save_state(self, strategy: T) -> bool:
        """
        Save strategy state.
        
        Args:
            strategy: Strategy instance
            
        Returns:
            True if save was successful
        """
        if not self.initialized and not await self.initialize():
            logger.error("Strategy storage not initialized")
            return False
        
        try:
            # Get strategy state
            state = strategy.get_state() if hasattr(strategy, 'get_state') else strategy
            
            # Update timestamp
            if hasattr(state, 'updated_at'):
                state.updated_at = datetime.datetime.now()
            
            # Increment version if available
            if hasattr(state, 'version'):
                state.version += 1
            
            # Serialize strategy state
            serialized = self._serialize_object(state)
            
            # Save based on backend
            if self.backend == self.BACKEND_FILE:
                encoded = self._encode_for_file(serialized)
                file_path = self._get_file_path(state.strategy_id)
                
                # Get metadata
                metadata = state.to_dict() if hasattr(state, 'to_dict') else {
                    "strategy_id": state.strategy_id,
                    "updated_at": datetime.datetime.now().isoformat()
                }
                
                # Save to file
                with open(file_path, 'w') as f:
                    json.dump({
                        "metadata": metadata,
                        "data": encoded
                    }, f)
                
            elif self.backend == self.BACKEND_REDIS:
                key = self._get_redis_key(state.strategy_id)
                await self.client.set(key, serialized)
                
                # Set expiration if configured
                expire = self.config.get("redis_expire")
                if expire:
                    await self.client.expire(key, expire)
                
            elif self.backend == self.BACKEND_MONGO:
                # Convert to MongoDB document
                if hasattr(state, 'to_dict'):
                    doc = state.to_dict()
                else:
                    doc = {"strategy_id": state.strategy_id}
                
                # Add serialized data
                doc["data"] = Binary(serialized)
                
                # Add timestamps if not present
                if "created_at" not in doc:
                    doc["created_at"] = datetime.datetime.now()
                doc["updated_at"] = datetime.datetime.now()
                
                # Upsert document
                await self.client.update_one(
                    {"strategy_id": state.strategy_id},
                    {"$set": doc},
                    upsert=True
                )
            
            logger.debug(f"Saved state for strategy {state.strategy_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving strategy state: {str(e)}")
            return False
    
    async def load_state(self, strategy_id: str) -> Optional[T]:
        """
        Load strategy state.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            Strategy instance or None if not found
        """
        if not self.initialized and not await self.initialize():
            logger.error("Strategy storage not initialized")
            return None
        
        try:
            # Load based on backend
            if self.backend == self.BACKEND_FILE:
                file_path = self._get_file_path(strategy_id)
                
                if not os.path.exists(file_path):
                    logger.warning(f"State file not found: {file_path}")
                    return None
                
                # Load from file
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # Decode and deserialize
                decoded = self._decode_from_file(data["data"])
                state = self._deserialize_object(decoded)
                
            elif self.backend == self.BACKEND_REDIS:
                key = self._get_redis_key(strategy_id)
                data = await self.client.get(key)
                
                if not data:
                    logger.warning(f"State not found in Redis: {key}")
                    return None
                
                # Deserialize
                state = self._deserialize_object(data)
                
            elif self.backend == self.BACKEND_MONGO:
                doc = await self.client.find_one({"strategy_id": strategy_id})
                
                if not doc:
                    logger.warning(f"State not found in MongoDB: {strategy_id}")
                    return None
                
                # Deserialize
                state = self._deserialize_object(doc["data"])
            
            logger.debug(f"Loaded state for strategy {strategy_id}")
            
            # Instantiate strategy if needed
            if isinstance(state, self.strategy_class):
                return state
            else:
                # Create new instance and load state
                strategy = self.strategy_class()
                if hasattr(strategy, 'load_state'):
                    strategy.load_state(state)
                    return strategy
                else:
                    return state
            
        except Exception as e:
            logger.error(f"Error loading strategy state: {str(e)}")
            return None
    
    async def delete_state(self, strategy_id: str) -> bool:
        """
        Delete strategy state.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            True if deletion was successful
        """
        if not self.initialized and not await self.initialize():
            logger.error("Strategy storage not initialized")
            return False
        
        try:
            # Delete based on backend
            if self.backend == self.BACKEND_FILE:
                file_path = self._get_file_path(strategy_id)
                
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Deleted state file: {file_path}")
                
            elif self.backend == self.BACKEND_REDIS:
                key = self._get_redis_key(strategy_id)
                await self.client.delete(key)
                logger.debug(f"Deleted Redis key: {key}")
                
            elif self.backend == self.BACKEND_MONGO:
                result = await self.client.delete_one({"strategy_id": strategy_id})
                deleted = result.deleted_count > 0
                logger.debug(f"Deleted MongoDB document: {strategy_id}, success: {deleted}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting strategy state: {str(e)}")
            return False
    
    async def list_strategies(self) -> List[Dict[str, Any]]:
        """
        List available strategy states.
        
        Returns:
            List of strategy metadata
        """
        if not self.initialized and not await self.initialize():
            logger.error("Strategy storage not initialized")
            return []
        
        try:
            strategies = []
            
            # List based on backend
            if self.backend == self.BACKEND_FILE:
                for file_name in os.listdir(self.base_path):
                    if file_name.endswith('.json'):
                        file_path = os.path.join(self.base_path, file_name)
                        try:
                            with open(file_path, 'r') as f:
                                data = json.load(f)
                            strategies.append(data["metadata"])
                        except Exception as e:
                            logger.warning(f"Error reading state file {file_path}: {str(e)}")
                
            elif self.backend == self.BACKEND_REDIS:
                # Get all keys with prefix
                keys = await self.client.keys(f"{self.redis_prefix}*")
                
                for key in keys:
                    try:
                        strategy_id = key.decode('utf-8').replace(self.redis_prefix, "")
                        data = await self.client.get(key)
                        state = self._deserialize_object(data)
                        
                        metadata = state.to_dict() if hasattr(state, 'to_dict') else {
                            "strategy_id": strategy_id
                        }
                        strategies.append(metadata)
                    except Exception as e:
                        logger.warning(f"Error reading Redis key {key}: {str(e)}")
                
            elif self.backend == self.BACKEND_MONGO:
                # Get all documents without data field
                docs = await self.client.find({}, {"data": 0}).to_list(length=1000)
                
                for doc in docs:
                    # Convert ObjectId to string
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    strategies.append(doc)
            
            return strategies
            
        except Exception as e:
            logger.error(f"Error listing strategies: {str(e)}")
            return []
    
    async def close(self) -> None:
        """Close the storage backend."""
        if self.client:
            if self.backend == self.BACKEND_REDIS:
                await self.client.close()
            self.client = None
            self.initialized = False
            logger.info("Strategy storage closed")


# Factory function to create strategy storage
async def create_strategy_storage(
    strategy_class: Type[T],
    backend: str = "file",
    config: Optional[Dict[str, Any]] = None
) -> StrategyStorage[T]:
    """
    Create and initialize a strategy storage instance.
    
    Args:
        strategy_class: Strategy class
        backend: Storage backend (file, redis, mongo)
        config: Backend configuration
        
    Returns:
        Initialized StrategyStorage instance
    """
    storage = StrategyStorage(strategy_class, backend, config)
    await storage.initialize()
    return storage
