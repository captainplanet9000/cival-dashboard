"""
ElizaOS Integration Manager for TradingFarm
Provides integration between TradingFarm trading engine and ElizaOS AI agents
"""

import asyncio
import json
import logging
import time
import uuid
import os
from typing import Dict, List, Any, Optional, Callable, Set, Union

from .eliza_protocol import ElizaProtocol, MessageType
from .models.model_manager import ModelManager
from .command_handler import CommandHandler
from ..exchanges.base import ExchangeClient, Order, OrderSide, OrderType, OrderStatus, MarketData
from ..market_data.market_data_manager import MarketDataManager
from ..order_execution.order_manager import OrderManager
from ..risk_management.risk_manager import RiskManager
from .logging.agent_activity_logger import AgentActivityLogger, ActivityType, ActivityLevel

logger = logging.getLogger(__name__)

class ElizaMessage:
    """Message for communication with ElizaOS agents."""
    
    def __init__(
        self,
        message_type: MessageType,
        content: Dict[str, Any],
        sender: str,
        recipient: str = None,
        timestamp: int = None,
        id: str = None,
        in_response_to: str = None
    ):
        self.message_type = message_type
        self.content = content
        self.sender = sender
        self.recipient = recipient
        self.timestamp = timestamp or int(time.time() * 1000)
        self.id = id or str(uuid.uuid4())
        self.in_response_to = in_response_to
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary format."""
        return {
            "id": self.id,
            "type": self.message_type.value,
            "content": self.content,
            "sender": self.sender,
            "recipient": self.recipient,
            "timestamp": self.timestamp,
            "in_response_to": self.in_response_to
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ElizaMessage':
        """Create message from dictionary."""
        message_type = MessageType(data.get("type"))
        return cls(
            message_type=message_type,
            content=data.get("content", {}),
            sender=data.get("sender", ""),
            recipient=data.get("recipient"),
            timestamp=data.get("timestamp"),
            id=data.get("id"),
            in_response_to=data.get("in_response_to")
        )

class ElizaIntegrationManager:
    """
    Integration manager for TradingFarm and ElizaOS.
    
    Responsibilities:
    1. Connect trading engine components with ElizaOS agents
    2. Route messages between components and agents
    3. Enable AI-driven trading capabilities
    4. Manage agent lifecycle
    """
    
    def __init__(
        self,
        market_data_manager: Optional[MarketDataManager] = None,
        order_manager: Optional[OrderManager] = None,
        risk_manager: Optional[RiskManager] = None
    ):
        self.market_data_manager = market_data_manager
        self.order_manager = order_manager
        self.risk_manager = risk_manager
        
        # Initialize model manager
        self.model_manager = ModelManager()
        
        # Agent registry
        self.agents: Dict[str, Dict[str, Any]] = {}
        
        # Message handlers by type
        self.message_handlers: Dict[MessageType, List[Callable]] = {
            MessageType.COMMAND: [],
            MessageType.QUERY: [],
            MessageType.STRATEGY_SIGNAL: [],
            MessageType.TRADE_EXECUTION: [],
            MessageType.MEMORY_STORAGE: [],
            MessageType.MEMORY_RETRIEVAL: [],
        }
        
        # Message queues for agents
        self.agent_message_queues: Dict[str, asyncio.Queue] = {}
        
        # Status
        self._running = False
        self._tasks: Set[asyncio.Task] = set()
        
        # Command handler (will be initialized in initialize method)
        self.command_handler = None
        
        # Initialize activity logger
        self.activity_logger = AgentActivityLogger(
            name="eliza_integration",
            log_dir="logs",
            console_level=logging.INFO,
            file_level=logging.DEBUG,
            json_logging=True
        )
    
    async def initialize(self) -> None:
        """Initialize the ElizaOS integration manager."""
        # Initialize the model manager
        await self.model_manager.initialize()
        logger.info("Initialized model manager")
        
        # Initialize command handler
        self.command_handler = CommandHandler(
            eliza_manager=self,
            market_data_manager=self.market_data_manager,
            order_manager=self.order_manager,
            risk_manager=self.risk_manager
        )
        logger.info("Initialized command handler")
        
        # Log initialization
        self.activity_logger.log_system(
            component="eliza_integration",
            event="initialization",
            message="ElizaIntegrationManager initialized",
            level=ActivityLevel.INFO,
            details={
                "market_data_manager": bool(self.market_data_manager),
                "order_manager": bool(self.order_manager),
                "risk_manager": bool(self.risk_manager),
                "model_manager": bool(self.model_manager)
            }
        )
        
        logger.info("ElizaIntegrationManager initialized")
    
    def set_market_data_manager(self, manager: MarketDataManager) -> None:
        """Set the market data manager."""
        self.market_data_manager = manager
        # Update command handler if initialized
        if self.command_handler:
            self.command_handler.market_data_manager = manager
    
    def set_order_manager(self, manager: OrderManager) -> None:
        """Set the order manager."""
        self.order_manager = manager
        # Update command handler if initialized
        if self.command_handler:
            self.command_handler.order_manager = manager
    
    def set_risk_manager(self, manager: RiskManager) -> None:
        """Set the risk manager."""
        self.risk_manager = manager
        # Update command handler if initialized
        if self.command_handler:
            self.command_handler.risk_manager = manager
    
    def register_message_handler(
        self, 
        message_type: MessageType, 
        handler: Callable[[ElizaMessage], Optional[ElizaMessage]]
    ) -> None:
        """Register a handler for a specific message type."""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        
        self.message_handlers[message_type].append(handler)
        logger.info(f"Registered handler for message type: {message_type.value}")
        
        self.activity_logger.log_system(
            component="eliza_integration",
            event="handler_registration",
            message=f"Registered message handler for {message_type.value}",
            level=ActivityLevel.DEBUG,
            details={
                "message_type": message_type.value,
                "handler": handler.__qualname__
            }
        )
    
    async def register_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register an ElizaOS agent with the integration manager.
        
        Args:
            agent_data: Agent registration data
            
        Returns:
            Agent registration response
        """
        agent_id = agent_data.get("agent_id") or str(uuid.uuid4())
        agent_name = agent_data.get("agent_name", f"Agent-{agent_id[:8]}")
        agent_type = agent_data.get("agent_type", "unknown")
        capabilities = agent_data.get("capabilities", [])
        
        # Create agent record
        self.agents[agent_id] = {
            "id": agent_id,
            "name": agent_name,
            "type": agent_type,
            "capabilities": capabilities,
            "status": "registered",
            "registered_at": int(time.time() * 1000),
            "last_active": int(time.time() * 1000)
        }
        
        # Create message queue for agent
        self.agent_message_queues[agent_id] = asyncio.Queue()
        
        # Start agent message processor
        if self._running:
            task = asyncio.create_task(self._process_agent_messages(agent_id))
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
        
        logger.info(f"Registered agent: {agent_name} (ID: {agent_id})")
        
        self.activity_logger.log_system(
            component="eliza_integration", 
            event="agent_registration",
            message=f"Registered agent: {agent_name}",
            level=ActivityLevel.INFO,
            details={
                "agent_id": agent_id,
                "agent_name": agent_name,
                "agent_description": agent_type
            }
        )
        
        return {
            "agent_id": agent_id,
            "status": "registered",
            "timestamp": int(time.time() * 1000)
        }
    
    async def send_message(self, message: ElizaMessage) -> None:
        """
        Send a message to an agent or broadcast to all agents.
        
        Args:
            message: Message to send
        """
        recipient = message.recipient
        
        if recipient and recipient in self.agent_message_queues:
            # Send to specific agent
            await self.agent_message_queues[recipient].put(message)
            logger.debug(f"Sent message to agent: {recipient}")
            
            self.activity_logger.log_activity(
                activity_type=ActivityType.AGENT,
                level=ActivityLevel.DEBUG,
                message=f"Queued message from {message.sender} to {message.recipient}",
                details={
                    "message_id": message.id,
                    "message_type": message.message_type.value,
                    "in_response_to": message.in_response_to
                },
                agent_id=message.sender,
                related_ids={"message_id": message.id}
            )
        elif not recipient:
            # Broadcast to all agents
            for agent_id, queue in self.agent_message_queues.items():
                await queue.put(message)
            logger.debug("Broadcast message to all agents")
        else:
            logger.warning(f"Unknown recipient: {recipient}")
    
    async def process_message(self, message: ElizaMessage) -> Optional[ElizaMessage]:
        """
        Process a message and route it to the appropriate handler.
        
        Args:
            message: Message to process
            
        Returns:
            Response message if any
        """
        message_type = message.message_type
        
        if message_type in self.message_handlers:
            for handler in self.message_handlers[message_type]:
                try:
                    response = await handler(message)
                    if response:
                        return response
                except Exception as e:
                    logger.error(f"Error in message handler: {str(e)}")
                    
                    self.activity_logger.log_error(
                        component="message_handler",
                        error=e,
                        message=f"Error processing {message.message_type.value} message",
                        level=ActivityLevel.ERROR,
                        details={
                            "message_id": message.id,
                            "handler": handler.__qualname__
                        },
                        related_ids={"message_id": message.id}
                    )
        
        return None
    
    async def start(self) -> None:
        """Start the ElizaOS integration manager."""
        if self._running:
            return
        
        self._running = True
        
        # Initialize components
        await self.initialize()
        
        # Start message processors for all registered agents
        for agent_id in self.agents:
            task = asyncio.create_task(self._process_agent_messages(agent_id))
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
        
        logger.info("ElizaOS integration manager started")
        
        self.activity_logger.log_system(
            component="eliza_integration",
            event="service_start",
            message="Starting ElizaIntegrationManager services",
            level=ActivityLevel.NOTICE
        )
    
    async def stop(self) -> None:
        """Stop the ElizaOS integration manager."""
        if not self._running:
            return
        
        self._running = False
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        
        self._tasks.clear()
        
        logger.info("ElizaOS integration manager stopped")
    
    async def _process_agent_messages(self, agent_id: str) -> None:
        """
        Process messages for a specific agent.
        
        Args:
            agent_id: Agent ID to process messages for
        """
        queue = self.agent_message_queues.get(agent_id)
        if not queue:
            logger.error(f"No message queue for agent: {agent_id}")
            return
        
        logger.info(f"Started message processor for agent: {agent_id}")
        
        try:
            while self._running:
                # Get next message
                message = await queue.get()
                
                try:
                    # Process message
                    response = await self.process_message(message)
                    
                    # Send response if any
                    if response:
                        await self.send_message(response)
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")
                    
                    self.activity_logger.log_error(
                        component="message_processor",
                        error=e,
                        message="Error processing message",
                        level=ActivityLevel.ERROR,
                        details={
                            "message_id": message.id,
                            "agent_id": agent_id
                        },
                        related_ids={"message_id": message.id}
                    )
                
                # Mark task as done
                queue.task_done()
                
                # Update agent last active timestamp
                if agent_id in self.agents:
                    self.agents[agent_id]["last_active"] = int(time.time() * 1000)
        except asyncio.CancelledError:
            logger.info(f"Message processor for agent {agent_id} cancelled")
        except Exception as e:
            logger.error(f"Error in message processor for agent {agent_id}: {str(e)}")
            
            self.activity_logger.log_error(
                component="message_processor",
                error=e,
                message="Error in message processor",
                level=ActivityLevel.ERROR,
                details={
                    "agent_id": agent_id
                }
            )
        
        logger.info(f"Stopped message processor for agent: {agent_id}")
