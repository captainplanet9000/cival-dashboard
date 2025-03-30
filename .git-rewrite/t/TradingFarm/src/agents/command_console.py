"""
ElizaOS Command Console

Provides a secure interface for executing trading-related commands through the ElizaOS
system. Includes authentication, permission handling, command validation, and detailed
logging of all activities.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import time
import traceback
import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional, Union, Callable, Set

from .eliza_protocol import MessageType, ElizaProtocol
from ..exchanges.base import Order, OrderSide, OrderType
from ..market_data.market_data_manager import MarketDataManager
from ..order_execution.order_manager import OrderManager
from ..risk_management.risk_manager import RiskManager

logger = logging.getLogger(__name__)

class CommandPermissionLevel(Enum):
    """Permission levels for console commands"""
    PUBLIC = 0      # Anyone can execute (information only)
    BASIC = 1       # Registered users can execute (non-critical operations)
    ELEVATED = 2    # Verified users can execute (trading operations)
    ADMIN = 3       # Admin users only (system configuration)
    SYSTEM = 4      # System commands only (internal use)


class CommandCategory(Enum):
    """Categories for organizing console commands"""
    SYSTEM = "system"            # System status and configuration
    MARKET = "market"            # Market data queries
    TRADING = "trading"          # Trading operations
    STRATEGY = "strategy"        # Strategy management
    RISK = "risk"                # Risk management
    ANALYSIS = "analysis"        # Market analysis
    AI = "ai"                    # AI agent operations
    ACCOUNT = "account"          # Account management
    HELP = "help"                # Help commands


class CommandStatus(Enum):
    """Status codes for command execution"""
    SUCCESS = "success"
    ERROR = "error"
    UNAUTHORIZED = "unauthorized"
    INVALID = "invalid"
    PENDING = "pending"


class CommandResult:
    """Result of a command execution"""
    
    def __init__(
        self, 
        status: CommandStatus,
        message: str,
        data: Any = None,
        command_id: str = None
    ):
        self.status = status
        self.message = message
        self.data = data
        self.command_id = command_id or str(uuid.uuid4())
        self.timestamp = int(time.time() * 1000)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "command_id": self.command_id,
            "status": self.status.value,
            "message": self.message,
            "data": self.data,
            "timestamp": self.timestamp
        }


class CommandDefinition:
    """Definition of a console command"""
    
    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable,
        permission_level: CommandPermissionLevel,
        category: CommandCategory,
        parameters: List[Dict[str, Any]] = None,
        examples: List[str] = None,
        aliases: List[str] = None,
        is_async: bool = False
    ):
        self.name = name
        self.description = description
        self.handler = handler
        self.permission_level = permission_level
        self.category = category
        self.parameters = parameters or []
        self.examples = examples or []
        self.aliases = aliases or []
        self.is_async = is_async
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert definition to dictionary"""
        return {
            "name": self.name,
            "description": self.description,
            "permission_level": self.permission_level.value,
            "category": self.category.value,
            "parameters": self.parameters,
            "examples": self.examples,
            "aliases": self.aliases
        }


class CommandConsole:
    """
    Console for executing commands within the ElizaOS system.
    
    Responsibilities:
    1. Parse and validate commands
    2. Check permissions for command execution
    3. Execute commands and return results
    4. Log all command activities
    5. Provide help and documentation
    """
    
    def __init__(
        self,
        market_data_manager: Optional[MarketDataManager] = None,
        order_manager: Optional[OrderManager] = None,
        risk_manager: Optional[RiskManager] = None,
        log_level: int = logging.INFO
    ):
        """
        Initialize the command console.
        
        Args:
            market_data_manager: Market data manager instance
            order_manager: Order manager instance
            risk_manager: Risk manager instance
            log_level: Logging level
        """
        self.market_data_manager = market_data_manager
        self.order_manager = order_manager
        self.risk_manager = risk_manager
        
        # Configure logging
        self.logger = logging.getLogger("CommandConsole")
        self.logger.setLevel(log_level)
        
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(console_format)
            self.logger.addHandler(console_handler)
            
            # Add a file handler for command audit log
            file_handler = logging.FileHandler('command_audit.log')
            file_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(file_format)
            self.logger.addHandler(file_handler)
        
        # Initialize command registry
        self.commands: Dict[str, CommandDefinition] = {}
        self._register_default_commands()
        
        # Command history
        self.command_history: List[Dict[str, Any]] = []
        
        # Active sessions and authentication
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.auth_tokens: Dict[str, Dict[str, Any]] = {}
        
        # API secret for generating auth tokens
        self.api_secret = os.environ.get("ELIZA_API_SECRET", "eliza_default_secret_key")
        
        # Initialize locks for thread safety
        self._command_lock = asyncio.Lock()
        
        self.logger.info("Command console initialized")
    
    def _register_default_commands(self) -> None:
        """Register default system commands"""
        # System commands
        self.register_command(
            name="help",
            description="Get help information for available commands",
            handler=self._handle_help_command,
            permission_level=CommandPermissionLevel.PUBLIC,
            category=CommandCategory.HELP,
            parameters=[
                {
                    "name": "command",
                    "description": "Name of the command to get help for",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "help",
                "help market"
            ]
        )
        
        self.register_command(
            name="status",
            description="Get system status information",
            handler=self._handle_status_command,
            permission_level=CommandPermissionLevel.PUBLIC,
            category=CommandCategory.SYSTEM,
            examples=[
                "status"
            ]
        )
        
        self.register_command(
            name="login",
            description="Authenticate with the system",
            handler=self._handle_login_command,
            permission_level=CommandPermissionLevel.PUBLIC,
            category=CommandCategory.ACCOUNT,
            parameters=[
                {
                    "name": "username",
                    "description": "Username for authentication",
                    "required": True,
                    "type": "string"
                },
                {
                    "name": "password",
                    "description": "Password for authentication",
                    "required": True,
                    "type": "string"
                }
            ],
            examples=[
                "login username=trader1 password=secure_password"
            ]
        )
        
        self.register_command(
            name="logout",
            description="End the current session",
            handler=self._handle_logout_command,
            permission_level=CommandPermissionLevel.BASIC,
            category=CommandCategory.ACCOUNT,
            examples=[
                "logout"
            ]
        )
        
        # Market data commands
        self.register_command(
            name="market",
            description="Get current market data for a symbol",
            handler=self._handle_market_command,
            permission_level=CommandPermissionLevel.PUBLIC,
            category=CommandCategory.MARKET,
            parameters=[
                {
                    "name": "symbol",
                    "description": "Market symbol (e.g., BTC/USDC)",
                    "required": True,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Exchange name",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "market symbol=BTC/USDC",
                "market symbol=ETH/USDC exchange=coinbase"
            ]
        )
    
    def register_command(
        self,
        name: str,
        description: str,
        handler: Callable,
        permission_level: CommandPermissionLevel,
        category: CommandCategory,
        parameters: List[Dict[str, Any]] = None,
        examples: List[str] = None,
        aliases: List[str] = None,
        is_async: bool = False
    ) -> None:
        """
        Register a new command.
        
        Args:
            name: Command name
            description: Command description
            handler: Function to handle the command
            permission_level: Required permission level
            category: Command category
            parameters: Command parameters
            examples: Example command usages
            aliases: Alternative command names
            is_async: Whether the handler is an async function
        """
        command = CommandDefinition(
            name=name,
            description=description,
            handler=handler,
            permission_level=permission_level,
            category=category,
            parameters=parameters,
            examples=examples,
            aliases=aliases,
            is_async=is_async
        )
        
        self.commands[name] = command
        
        # Register aliases
        if aliases:
            for alias in aliases:
                self.commands[alias] = command
        
        self.logger.info(f"Registered command: {name}")
    
    async def execute_command(
        self,
        command_text: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> CommandResult:
        """
        Parse and execute a command.
        
        Args:
            command_text: Raw command text
            session_id: Active session ID
            user_id: User ID
            
        Returns:
            Command execution result
        """
        # Parse command and arguments
        try:
            command_parts = command_text.strip().split()
            if not command_parts:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message="Empty command"
                )
            
            command_name = command_parts[0].lower()
            
            # Check if command exists
            if command_name not in self.commands:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message=f"Unknown command: {command_name}"
                )
            
            # Parse arguments
            args = {}
            for arg in command_parts[1:]:
                if "=" in arg:
                    key, value = arg.split("=", 1)
                    args[key.lower()] = value
            
            # Get command definition
            command = self.commands[command_name]
            
            # Check permissions
            if not self._check_permission(command.permission_level, session_id, user_id):
                self.logger.warning(f"Unauthorized command attempt: {command_name} by session {session_id}")
                return CommandResult(
                    status=CommandStatus.UNAUTHORIZED,
                    message=f"Unauthorized: {command.permission_level.name} permission required"
                )
            
            # Validate required parameters
            if command.parameters:
                missing_params = []
                for param in command.parameters:
                    if param.get("required", False) and param["name"] not in args:
                        missing_params.append(param["name"])
                
                if missing_params:
                    return CommandResult(
                        status=CommandStatus.INVALID,
                        message=f"Missing required parameters: {', '.join(missing_params)}"
                    )
            
            # Log command execution
            command_id = str(uuid.uuid4())
            self.logger.info(
                f"COMMAND_EXECUTE: id={command_id} command='{command_name}' "
                f"user={user_id or 'anonymous'} session={session_id or 'none'}"
            )
            
            # Execute command
            async with self._command_lock:
                try:
                    if command.is_async:
                        result = await command.handler(args, session_id, user_id, command_id)
                    else:
                        result = command.handler(args, session_id, user_id, command_id)
                    
                    # Log result
                    if isinstance(result, CommandResult):
                        self.logger.info(
                            f"COMMAND_RESULT: id={command_id} status={result.status.value} "
                            f"message='{result.message}'"
                        )
                        
                        # Add to history
                        self.command_history.append({
                            "id": command_id,
                            "command": command_name,
                            "args": args,
                            "user_id": user_id,
                            "session_id": session_id,
                            "timestamp": int(time.time() * 1000),
                            "status": result.status.value,
                            "message": result.message
                        })
                        
                        return result
                    else:
                        # If handler didn't return a CommandResult, wrap it
                        self.logger.info(f"COMMAND_RESULT: id={command_id} status=success")
                        
                        # Add to history
                        self.command_history.append({
                            "id": command_id,
                            "command": command_name,
                            "args": args,
                            "user_id": user_id,
                            "session_id": session_id,
                            "timestamp": int(time.time() * 1000),
                            "status": "success",
                            "message": "Command executed successfully"
                        })
                        
                        return CommandResult(
                            status=CommandStatus.SUCCESS,
                            message="Command executed successfully",
                            data=result,
                            command_id=command_id
                        )
                except Exception as e:
                    # Log the error
                    error_msg = str(e)
                    stack_trace = traceback.format_exc()
                    self.logger.error(
                        f"COMMAND_ERROR: id={command_id} command='{command_name}' "
                        f"error='{error_msg}'\n{stack_trace}"
                    )
                    
                    # Add to history
                    self.command_history.append({
                        "id": command_id,
                        "command": command_name,
                        "args": args,
                        "user_id": user_id,
                        "session_id": session_id,
                        "timestamp": int(time.time() * 1000),
                        "status": "error",
                        "message": error_msg
                    })
                    
                    return CommandResult(
                        status=CommandStatus.ERROR,
                        message=f"Error executing command: {error_msg}",
                        command_id=command_id
                    )
        except Exception as e:
            # Log parsing error
            error_msg = str(e)
            stack_trace = traceback.format_exc()
            self.logger.error(
                f"COMMAND_PARSE_ERROR: command='{command_text}' "
                f"error='{error_msg}'\n{stack_trace}"
            )
            
            return CommandResult(
                status=CommandStatus.INVALID,
                message=f"Error parsing command: {error_msg}"
            )
    
    def _check_permission(
        self,
        required_level: CommandPermissionLevel,
        session_id: Optional[str],
        user_id: Optional[str]
    ) -> bool:
        """
        Check if the current session has the required permission level.
        
        Args:
            required_level: Required permission level
            session_id: Session ID
            user_id: User ID
            
        Returns:
            True if permission is granted, False otherwise
        """
        # PUBLIC commands are always allowed
        if required_level == CommandPermissionLevel.PUBLIC:
            return True
        
        # Other commands require an active session
        if not session_id or session_id not in self.active_sessions:
            return False
        
        # Check session permissions
        session = self.active_sessions[session_id]
        session_level = session.get("permission_level", CommandPermissionLevel.PUBLIC)
        
        # Convert enum to int for comparison if needed
        if isinstance(session_level, CommandPermissionLevel):
            session_level = session_level.value
        
        if isinstance(required_level, CommandPermissionLevel):
            required_level = required_level.value
        
        return session_level >= required_level
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate a user with username and password.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            Session data if authentication successful, None otherwise
        """
        # In a real implementation, this would verify against a secure database
        # For this example, we'll use a simple hardcoded user list
        users = {
            "admin": {
                "password": "admin_password",
                "user_id": "user_1",
                "permission_level": CommandPermissionLevel.ADMIN
            },
            "trader": {
                "password": "trader_password",
                "user_id": "user_2",
                "permission_level": CommandPermissionLevel.ELEVATED
            },
            "viewer": {
                "password": "viewer_password",
                "user_id": "user_3",
                "permission_level": CommandPermissionLevel.BASIC
            }
        }
        
        if username in users and users[username]["password"] == password:
            user_info = users[username]
            
            # Create session
            session_id = str(uuid.uuid4())
            timestamp = int(time.time() * 1000)
            
            session = {
                "session_id": session_id,
                "user_id": user_info["user_id"],
                "username": username,
                "permission_level": user_info["permission_level"],
                "created_at": timestamp,
                "last_active": timestamp
            }
            
            # Store session
            self.active_sessions[session_id] = session
            
            # Create auth token
            token = self._generate_auth_token(session_id, user_info["user_id"])
            session["token"] = token
            
            self.logger.info(f"User authenticated: {username} (Session: {session_id})")
            
            return session
        
        self.logger.warning(f"Authentication failed for user: {username}")
        return None
    
    def _generate_auth_token(self, session_id: str, user_id: str) -> str:
        """
        Generate an authentication token for a session.
        
        Args:
            session_id: Session ID
            user_id: User ID
            
        Returns:
            Authentication token
        """
        timestamp = int(time.time() * 1000)
        data = f"{session_id}:{user_id}:{timestamp}"
        signature = hmac.new(
            self.api_secret.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        token = f"{data}:{signature}"
        
        # Store token mapping
        self.auth_tokens[token] = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": timestamp
        }
        
        return token
    
    def validate_auth_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate an authentication token.
        
        Args:
            token: Authentication token
            
        Returns:
            Session data if token is valid, None otherwise
        """
        if token in self.auth_tokens:
            token_data = self.auth_tokens[token]
            session_id = token_data["session_id"]
            
            if session_id in self.active_sessions:
                # Update last active timestamp
                self.active_sessions[session_id]["last_active"] = int(time.time() * 1000)
                return self.active_sessions[session_id]
        
        return None
    
    def end_session(self, session_id: str) -> bool:
        """
        End an active session.
        
        Args:
            session_id: Session ID
            
        Returns:
            True if session was ended, False otherwise
        """
        if session_id in self.active_sessions:
            # Find and remove associated tokens
            tokens_to_remove = []
            for token, data in self.auth_tokens.items():
                if data["session_id"] == session_id:
                    tokens_to_remove.append(token)
            
            for token in tokens_to_remove:
                del self.auth_tokens[token]
            
            # Remove session
            session = self.active_sessions.pop(session_id)
            
            self.logger.info(f"Session ended: {session_id} (User: {session.get('username', 'unknown')})")
            return True
        
        return False
    
    # Command handlers
    def _handle_help_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """Handle help command"""
        command_name = args.get("command")
        
        if command_name:
            # Help for specific command
            if command_name not in self.commands:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message=f"Unknown command: {command_name}",
                    command_id=command_id
                )
            
            command = self.commands[command_name]
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Help for command: {command_name}",
                data=command.to_dict(),
                command_id=command_id
            )
        else:
            # List all commands by category
            commands_by_category = {}
            
            for name, cmd in self.commands.items():
                # Skip aliases
                if cmd.name != name:
                    continue
                
                category = cmd.category.value
                if category not in commands_by_category:
                    commands_by_category[category] = []
                
                # Only include commands the user can access
                if self._check_permission(cmd.permission_level, session_id, user_id):
                    commands_by_category[category].append({
                        "name": cmd.name,
                        "description": cmd.description
                    })
            
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message="Available commands by category",
                data=commands_by_category,
                command_id=command_id
            )
    
    def _handle_status_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """Handle status command"""
        # Get system status information
        status = {
            "system": {
                "status": "online",
                "uptime": "12:34:56",  # In a real implementation, this would be actual uptime
                "version": "1.0.0"
            },
            "exchanges": {},
            "trading": {
                "active_orders": 0,
                "positions": 0
            }
        }
        
        # Add exchange status if available
        if self.market_data_manager:
            for exchange, client in self.market_data_manager.exchange_clients.items():
                status["exchanges"][exchange] = {
                    "status": "connected" if client.is_connected else "disconnected",
                    "last_update": client.last_update_time
                }
        
        # Add trading status if available
        if self.order_manager:
            status["trading"]["active_orders"] = len(self.order_manager.get_active_orders())
            status["trading"]["positions"] = len(self.order_manager.get_positions())
        
        return CommandResult(
            status=CommandStatus.SUCCESS,
            message="System status",
            data=status,
            command_id=command_id
        )
    
    def _handle_login_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """Handle login command"""
        username = args.get("username")
        password = args.get("password")
        
        if not username or not password:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Username and password are required",
                command_id=command_id
            )
        
        # Authenticate user
        session = self.authenticate_user(username, password)
        
        if session:
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Login successful. Welcome, {username}!",
                data={
                    "session_id": session["session_id"],
                    "token": session["token"],
                    "permission_level": session["permission_level"].value if isinstance(session["permission_level"], CommandPermissionLevel) else session["permission_level"]
                },
                command_id=command_id
            )
        else:
            return CommandResult(
                status=CommandStatus.UNAUTHORIZED,
                message="Invalid username or password",
                command_id=command_id
            )
    
    def _handle_logout_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """Handle logout command"""
        if not session_id:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="No active session",
                command_id=command_id
            )
        
        # End session
        if self.end_session(session_id):
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message="Logout successful",
                command_id=command_id
            )
        else:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Invalid session",
                command_id=command_id
            )
    
    def _handle_market_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """Handle market command"""
        symbol = args.get("symbol")
        exchange = args.get("exchange")
        
        if not symbol:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Symbol is required",
                command_id=command_id
            )
        
        # Check if market data manager is available
        if not self.market_data_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Market data manager not available",
                command_id=command_id
            )
        
        try:
            # Get market data
            market_data = self.market_data_manager.get_market_data(symbol, exchange)
            
            if not market_data:
                return CommandResult(
                    status=CommandStatus.ERROR,
                    message=f"No market data available for {symbol}",
                    command_id=command_id
                )
            
            # Convert market data to dictionary
            data = market_data.to_dict()
            
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Market data for {symbol}",
                data=data,
                command_id=command_id
            )
        except Exception as e:
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error retrieving market data: {str(e)}",
                command_id=command_id
            )
