"""
ElizaOS Command Handler Integration

Connects the Command Console with the ElizaOS integration system, enabling
secure command execution, authentication, and detailed logging.
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Any, Optional, Union, Set

from .command_console import CommandConsole, CommandResult, CommandStatus
from .commands.trading_commands import TradingCommands
from .eliza_protocol import ElizaProtocol, MessageType
from .eliza_integration import ElizaIntegrationManager, ElizaMessage
from .logging.agent_activity_logger import AgentActivityLogger, ActivityType, ActivityLevel
from ..market_data.market_data_manager import MarketDataManager
from ..order_execution.order_manager import OrderManager
from ..risk_management.risk_manager import RiskManager

# Configure logging
logger = logging.getLogger(__name__)

# Create a file handler for detailed command logs
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

file_handler = logging.FileHandler(os.path.join(log_dir, 'command_audit.log'))
file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)

console_handler = logging.StreamHandler()
console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(console_formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)
logger.setLevel(logging.INFO)


class CommandHandler:
    """
    Integrates the Command Console with ElizaOS.
    
    Responsibilities:
    1. Process command messages from ElizaOS
    2. Authenticate command execution requests
    3. Execute commands using the Command Console
    4. Route command results back to ElizaOS
    5. Maintain detailed audit logs
    """
    
    def __init__(
        self,
        eliza_manager: ElizaIntegrationManager,
        market_data_manager: Optional[MarketDataManager] = None,
        order_manager: Optional[OrderManager] = None,
        risk_manager: Optional[RiskManager] = None
    ):
        """
        Initialize the command handler.
        
        Args:
            eliza_manager: ElizaOS integration manager
            market_data_manager: Market data manager instance
            order_manager: Order manager instance
            risk_manager: Risk manager instance
        """
        self.eliza_manager = eliza_manager
        self.market_data_manager = market_data_manager
        self.order_manager = order_manager
        self.risk_manager = risk_manager
        
        # Initialize activity logger
        self.activity_logger = AgentActivityLogger(
            name="command_console",
            log_dir=log_dir,
            console_level=logging.INFO,
            file_level=logging.DEBUG,
            json_logging=True
        )
        
        # Initialize command console
        self.console = CommandConsole(
            market_data_manager=market_data_manager,
            order_manager=order_manager,
            risk_manager=risk_manager,
            log_level=logging.INFO
        )
        
        # Initialize command modules
        self.trading_commands = TradingCommands(
            console=self.console,
            order_manager=order_manager,
            risk_manager=risk_manager
        )
        
        # Register command message handler
        self.eliza_manager.register_message_handler(
            MessageType.COMMAND,
            self.handle_command_message
        )
        
        # Active command executions
        self.active_commands: Dict[str, Dict[str, Any]] = {}
        
        # Command tasks
        self._tasks: Set[asyncio.Task] = set()
        
        # Log system startup
        self.activity_logger.log_system(
            component="command_handler",
            event="initialization",
            message="Command handler initialized",
            level=ActivityLevel.INFO,
            details={
                "market_data_manager": bool(market_data_manager),
                "order_manager": bool(order_manager),
                "risk_manager": bool(risk_manager)
            }
        )
        
        logger.info("CommandHandler initialized")
    
    async def handle_command_message(self, message: ElizaMessage) -> Optional[ElizaMessage]:
        """
        Handle command messages from ElizaOS.
        
        Args:
            message: Command message
            
        Returns:
            Response message or None
        """
        content = message.content
        command_text = content.get("command")
        session_id = content.get("session_id")
        user_id = content.get("user_id") or message.sender
        
        if not command_text:
            # Invalid command message
            logger.warning(f"Invalid command message: missing command text")
            
            # Log invalid command request
            self.activity_logger.log_command(
                command="unknown",
                status="invalid",
                message="Missing command text",
                user_id=user_id,
                session_id=session_id,
                agent_id=message.sender
            )
            
            return ElizaMessage(
                message_type=MessageType.COMMAND,
                content={
                    "status": "error",
                    "message": "Missing command text",
                    "command_id": None
                },
                sender="command_console",
                recipient=message.sender,
                in_response_to=message.id
            )
        
        # Parse command name
        command_parts = command_text.strip().split()
        command_name = command_parts[0].lower() if command_parts else "unknown"
        
        # Log command request
        self.activity_logger.log_command(
            command=command_name,
            status="pending",
            message=f"Received command request: {command_text}",
            user_id=user_id,
            session_id=session_id,
            agent_id=message.sender,
            details={
                "full_command": command_text,
                "source": "eliza_message"
            }
        )
        
        logger.info(
            f"COMMAND_REQUEST: command='{command_text}' "
            f"user={user_id} session={session_id}"
        )
        
        # For synchronous commands, execute directly
        if not self._is_async_command(command_text):
            try:
                # Execute command
                result = await self.console.execute_command(
                    command_text=command_text,
                    session_id=session_id,
                    user_id=user_id
                )
                
                # Log command result
                self._log_command_result(
                    command_name=command_name,
                    command_text=command_text,
                    result=result,
                    user_id=user_id,
                    session_id=session_id,
                    agent_id=message.sender
                )
                
                # Return result as response
                return self._create_response_message(result, message)
            
            except Exception as e:
                # Log error
                logger.error(f"Error executing command: {str(e)}")
                self.activity_logger.log_error(
                    component="command_handler",
                    error=e,
                    message=f"Error executing command: {command_text}",
                    user_id=user_id,
                    session_id=session_id,
                    agent_id=message.sender
                )
                
                # Return error response
                return ElizaMessage(
                    message_type=MessageType.COMMAND,
                    content={
                        "status": "error",
                        "message": f"Error executing command: {str(e)}",
                        "command_id": None
                    },
                    sender="command_console",
                    recipient=message.sender,
                    in_response_to=message.id
                )
        
        # For asynchronous commands, start a background task
        task = asyncio.create_task(
            self._execute_async_command(
                command_text=command_text,
                session_id=session_id,
                user_id=user_id,
                message=message
            )
        )
        
        # Track task
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        
        # Log async command start
        self.activity_logger.log_command(
            command=command_name,
            status="async_started",
            message=f"Async command execution started for: {command_text}",
            user_id=user_id,
            session_id=session_id,
            agent_id=message.sender
        )
        
        # Return acknowledgment
        return ElizaMessage(
            message_type=MessageType.COMMAND,
            content={
                "status": "pending",
                "message": "Command execution started",
                "command_id": None
            },
            sender="command_console",
            recipient=message.sender,
            in_response_to=message.id
        )
    
    def _is_async_command(self, command_text: str) -> bool:
        """
        Check if a command requires asynchronous execution.
        
        Args:
            command_text: Command text
            
        Returns:
            True if command is asynchronous, False otherwise
        """
        # Parse command name
        parts = command_text.strip().split()
        if not parts:
            return False
        
        command_name = parts[0].lower()
        
        # Check if command exists
        if command_name not in self.console.commands:
            return False
        
        # Check if command is async
        command = self.console.commands[command_name]
        return command.is_async
    
    def _log_command_result(
        self,
        command_name: str,
        command_text: str,
        result: CommandResult,
        user_id: Optional[str],
        session_id: Optional[str],
        agent_id: Optional[str]
    ) -> None:
        """
        Log command execution result.
        
        Args:
            command_name: Command name
            command_text: Full command text
            result: Command execution result
            user_id: User ID
            session_id: Session ID
            agent_id: Agent ID
        """
        # Map command status to activity status
        status_map = {
            CommandStatus.SUCCESS: "success",
            CommandStatus.ERROR: "error",
            CommandStatus.UNAUTHORIZED: "unauthorized",
            CommandStatus.INVALID: "invalid",
            CommandStatus.PENDING: "pending"
        }
        
        status = status_map.get(result.status, "unknown")
        
        # Log the result
        self.activity_logger.log_command(
            command=command_name,
            status=status,
            message=result.message,
            user_id=user_id,
            session_id=session_id,
            agent_id=agent_id,
            command_id=result.command_id,
            details={
                "full_command": command_text,
                "data": result.data
            }
        )
        
        # Special handling for trading commands
        if command_name in ["order", "cancel", "modify_order"]:
            # For trading commands, also log a trading activity
            action = command_name
            
            # Extract symbol and exchange if available
            symbol = None
            exchange = None
            order_id = None
            
            if isinstance(result.data, dict):
                symbol = result.data.get("symbol")
                exchange = result.data.get("exchange")
                order_id = result.data.get("order_id") or result.data.get("id")
            
            self.activity_logger.log_trading(
                action=action,
                status=status,
                message=result.message,
                user_id=user_id,
                session_id=session_id,
                agent_id=agent_id,
                order_id=order_id,
                symbol=symbol,
                exchange=exchange,
                details={
                    "command_id": result.command_id,
                    "data": result.data
                }
            )
    
    async def _execute_async_command(
        self,
        command_text: str,
        session_id: Optional[str],
        user_id: Optional[str],
        message: ElizaMessage
    ) -> None:
        """
        Execute an asynchronous command and send the result.
        
        Args:
            command_text: Command text
            session_id: Session ID
            user_id: User ID
            message: Original message
        """
        # Parse command name
        command_parts = command_text.strip().split()
        command_name = command_parts[0].lower() if command_parts else "unknown"
        
        try:
            # Execute command
            result = await self.console.execute_command(
                command_text=command_text,
                session_id=session_id,
                user_id=user_id
            )
            
            # Log command result
            self._log_command_result(
                command_name=command_name,
                command_text=command_text,
                result=result,
                user_id=user_id,
                session_id=session_id,
                agent_id=message.sender
            )
            
            # Create response message
            response = self._create_response_message(result, message)
            
            # Send response
            if self.eliza_manager:
                await self.eliza_manager.send_message(response)
            
        except Exception as e:
            # Log error
            logger.error(f"Error executing async command: {str(e)}")
            
            self.activity_logger.log_error(
                component="command_handler",
                error=e,
                message=f"Error executing async command: {command_text}",
                user_id=user_id,
                session_id=session_id,
                agent_id=message.sender
            )
            
            # Create error response
            response = ElizaMessage(
                message_type=MessageType.COMMAND,
                content={
                    "status": "error",
                    "message": f"Error executing command: {str(e)}",
                    "command_id": None
                },
                sender="command_console",
                recipient=message.sender,
                in_response_to=message.id
            )
            
            # Send error response
            if self.eliza_manager:
                await self.eliza_manager.send_message(response)
    
    def _create_response_message(
        self,
        result: CommandResult,
        original_message: ElizaMessage
    ) -> ElizaMessage:
        """
        Create a response message from a command result.
        
        Args:
            result: Command execution result
            original_message: Original command message
            
        Returns:
            Response message
        """
        return ElizaMessage(
            message_type=MessageType.COMMAND,
            content={
                "status": result.status.value,
                "message": result.message,
                "data": result.data,
                "command_id": result.command_id
            },
            sender="command_console",
            recipient=original_message.sender,
            in_response_to=original_message.id
        )
