"""
ElizaOS Agent Communication Protocol
Standardized communication protocol for Trading Farm agents and ElizaOS
"""
import time
import json
import logging
from enum import Enum
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages that can be exchanged with ElizaOS"""
    AGENT_REGISTRATION = "agent_registration"
    STATUS_UPDATE = "status_update"
    COMMAND = "command"
    QUERY = "query"
    STRATEGY_SIGNAL = "strategy_signal"
    TRADE_EXECUTION = "trade_execution"
    POSITION_UPDATE = "position_update"
    ERROR = "error"
    MEMORY_STORAGE = "memory_storage"
    MEMORY_RETRIEVAL = "memory_retrieval"


class ElizaProtocol:
    """
    Protocol implementation for standardized communication between 
    TradingFarm agents and ElizaOS
    """
    
    @staticmethod
    def create_message(message_type: MessageType, payload: Dict[str, Any], 
                       agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a standardized message for ElizaOS communication
        
        Args:
            message_type: Type of message being sent
            payload: Message data
            agent_id: ID of the agent (if applicable)
            
        Returns:
            Formatted message dictionary
        """
        message = {
            "type": message_type.value,
            "timestamp": int(time.time()),
            "payload": payload
        }
        
        if agent_id:
            message["agent_id"] = agent_id
            
        return message
    
    @staticmethod
    def create_registration_message(agent_type: str, agent_name: str, 
                                   capabilities: List[str], 
                                   config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an agent registration message
        
        Args:
            agent_type: Type of agent (sonic, vertex, etc.)
            agent_name: Name of the agent
            capabilities: List of agent capabilities
            config: Agent configuration
            
        Returns:
            Registration message
        """
        payload = {
            "agent_type": agent_type,
            "agent_name": agent_name,
            "capabilities": capabilities,
            "config": config,
        }
        
        return ElizaProtocol.create_message(MessageType.AGENT_REGISTRATION, payload)
    
    @staticmethod
    def create_status_update(agent_id: str, status: str, metrics: Dict[str, Any],
                            positions: Optional[List[Dict[str, Any]]] = None,
                            last_action: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a status update message
        
        Args:
            agent_id: ID of the agent
            status: Current agent status
            metrics: Performance metrics
            positions: Current positions (if applicable)
            last_action: Description of last action taken
            
        Returns:
            Status update message
        """
        payload = {
            "status": status,
            "metrics": metrics
        }
        
        if positions:
            payload["positions"] = positions
            
        if last_action:
            payload["last_action"] = last_action
            
        return ElizaProtocol.create_message(MessageType.STATUS_UPDATE, payload, agent_id)
    
    @staticmethod
    def create_trade_execution(agent_id: str, trade_type: str, market: str,
                              side: str, size: float, price: float,
                              trade_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a trade execution message
        
        Args:
            agent_id: ID of the agent
            trade_type: Type of trade (swap, limit_order, market_order, etc.)
            market: Market or trading pair
            side: Buy or sell
            size: Size of the trade
            price: Price of the trade
            trade_id: ID of the trade (if available)
            
        Returns:
            Trade execution message
        """
        payload = {
            "trade_type": trade_type,
            "market": market,
            "side": side,
            "size": size,
            "price": price
        }
        
        if trade_id:
            payload["trade_id"] = trade_id
            
        return ElizaProtocol.create_message(MessageType.TRADE_EXECUTION, payload, agent_id)
    
    @staticmethod
    def create_strategy_signal(agent_id: str, strategy_name: str, signal_type: str,
                              market: str, confidence: float, 
                              parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a strategy signal message
        
        Args:
            agent_id: ID of the agent
            strategy_name: Name of the strategy
            signal_type: Type of signal (buy, sell, add_liquidity, etc.)
            market: Market or trading pair
            confidence: Signal confidence (0.0 to 1.0)
            parameters: Signal parameters
            
        Returns:
            Strategy signal message
        """
        payload = {
            "strategy_name": strategy_name,
            "signal_type": signal_type,
            "market": market,
            "confidence": confidence,
            "parameters": parameters
        }
        
        return ElizaProtocol.create_message(MessageType.STRATEGY_SIGNAL, payload, agent_id)
    
    @staticmethod
    def create_memory_storage(agent_id: str, memory_type: str, 
                             content: Dict[str, Any], 
                             tags: List[str]) -> Dict[str, Any]:
        """
        Create a memory storage message
        
        Args:
            agent_id: ID of the agent
            memory_type: Type of memory (market_data, trade_history, strategy, etc.)
            content: Memory content
            tags: Tags for categorizing the memory
            
        Returns:
            Memory storage message
        """
        payload = {
            "memory_type": memory_type,
            "content": content,
            "tags": tags
        }
        
        return ElizaProtocol.create_message(MessageType.MEMORY_STORAGE, payload, agent_id)
    
    @staticmethod
    def create_error_message(agent_id: str, error_code: str, 
                            error_message: str, 
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create an error message
        
        Args:
            agent_id: ID of the agent
            error_code: Error code
            error_message: Error message
            context: Additional context for the error
            
        Returns:
            Error message
        """
        payload = {
            "error_code": error_code,
            "error_message": error_message
        }
        
        if context:
            payload["context"] = context
            
        return ElizaProtocol.create_message(MessageType.ERROR, payload, agent_id)
    
    @staticmethod
    def parse_message(message: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Parse a message from ElizaOS
        
        Args:
            message: Message string or dictionary
            
        Returns:
            Parsed message
        """
        if isinstance(message, str):
            try:
                message = json.loads(message)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse message: {message}")
                return ElizaProtocol.create_error_message(
                    None, "PARSE_ERROR", "Failed to parse message"
                )
        
        # Validate message structure
        if not isinstance(message, dict):
            logger.error(f"Invalid message format: {message}")
            return ElizaProtocol.create_error_message(
                None, "INVALID_FORMAT", "Message must be a JSON object"
            )
        
        if "type" not in message:
            logger.error(f"Missing message type: {message}")
            return ElizaProtocol.create_error_message(
                None, "MISSING_TYPE", "Message must have a type"
            )
        
        if "payload" not in message:
            logger.error(f"Missing payload: {message}")
            return ElizaProtocol.create_error_message(
                None, "MISSING_PAYLOAD", "Message must have a payload"
            )
        
        return message
