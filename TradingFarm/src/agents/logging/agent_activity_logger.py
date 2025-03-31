"""
Agent Activity Logger

Provides detailed logging for all agent activities in the TradingFarm platform.
Implements structured logging with different verbosity levels and output formats.
"""

import json
import logging
import os
import time
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List, Union

# Configure logging directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Activity types for structured logging
class ActivityType(Enum):
    """Types of agent activities for structured logging"""
    COMMAND = "command"              # Command execution
    AUTHENTICATION = "authentication"# Authentication events
    TRADING = "trading"              # Trading activities
    MARKET_DATA = "market_data"      # Market data operations
    RISK = "risk"                    # Risk management events
    AGENT = "agent"                  # Agent lifecycle events
    SYSTEM = "system"                # System events
    ERROR = "error"                  # Error events
    AUDIT = "audit"                  # Security audit events


class ActivityLevel(Enum):
    """Severity/importance levels for agent activities"""
    DEBUG = "debug"          # Detailed debugging information
    INFO = "info"            # General informational messages
    NOTICE = "notice"        # Normal but significant events
    WARNING = "warning"      # Warning conditions
    ERROR = "error"          # Error conditions
    CRITICAL = "critical"    # Critical conditions
    ALERT = "alert"          # Action must be taken immediately
    EMERGENCY = "emergency"  # System is unusable


class AgentActivityLogger:
    """
    Logger for agent activities with structured logging capabilities.
    
    Features:
    - Structured JSON logs for machine processing
    - Human-readable formatted logs
    - Multiple output destinations
    - Different verbosity levels
    - Filtering by activity type and level
    """
    
    def __init__(
        self,
        name: str,
        log_dir: str = LOG_DIR,
        console_level: int = logging.INFO,
        file_level: int = logging.DEBUG,
        json_logging: bool = True,
        max_file_size: int = 10 * 1024 * 1024,  # 10 MB
        backup_count: int = 5
    ):
        """
        Initialize the activity logger.
        
        Args:
            name: Logger name
            log_dir: Directory to store log files
            console_level: Logging level for console output
            file_level: Logging level for file output
            json_logging: Whether to enable JSON-formatted logging
            max_file_size: Maximum size of log files before rotation
            backup_count: Number of backup files to keep
        """
        self.name = name
        self.log_dir = log_dir
        
        # Create logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)  # Capture all logs
        
        # Create console handler
        self.console_handler = logging.StreamHandler()
        self.console_handler.setLevel(console_level)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.console_handler.setFormatter(console_formatter)
        
        # Create file handler
        log_file = os.path.join(log_dir, f"{name}.log")
        self.file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_file_size,
            backupCount=backup_count
        )
        self.file_handler.setLevel(file_level)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.file_handler.setFormatter(file_formatter)
        
        # Create JSON file handler if enabled
        self.json_handler = None
        if json_logging:
            json_log_file = os.path.join(log_dir, f"{name}_json.log")
            self.json_handler = logging.handlers.RotatingFileHandler(
                json_log_file,
                maxBytes=max_file_size,
                backupCount=backup_count
            )
            self.json_handler.setLevel(file_level)
            json_formatter = logging.Formatter('%(message)s')
            self.json_handler.setFormatter(json_formatter)
        
        # Add handlers
        if not self.logger.handlers:
            self.logger.addHandler(self.console_handler)
            self.logger.addHandler(self.file_handler)
            if self.json_handler:
                self.logger.addHandler(self.json_handler)
    
    def log_activity(
        self,
        activity_type: ActivityType,
        level: ActivityLevel,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        related_ids: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log an agent activity with structured data.
        
        Args:
            activity_type: Type of activity
            level: Severity/importance level
            message: Human-readable message
            details: Additional structured details
            user_id: ID of the user associated with the activity
            session_id: ID of the session associated with the activity
            agent_id: ID of the agent associated with the activity
            related_ids: Related IDs (e.g., order_id, trade_id)
        """
        # Prepare structured log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": activity_type.value,
            "level": level.value,
            "message": message,
            "logger": self.name
        }
        
        # Add optional fields if provided
        if details:
            log_entry["details"] = details
        
        if user_id:
            log_entry["user_id"] = user_id
        
        if session_id:
            log_entry["session_id"] = session_id
        
        if agent_id:
            log_entry["agent_id"] = agent_id
        
        if related_ids:
            log_entry["related_ids"] = related_ids
        
        # Map activity level to logging level
        log_level = self._map_level(level)
        
        # Log structured entry as JSON if JSON handler is enabled
        if self.json_handler:
            self.logger.log(log_level, json.dumps(log_entry))
        else:
            # Otherwise, log a formatted message with key details
            formatted_msg = f"{activity_type.value.upper()}: {message}"
            
            # Add context information
            context = []
            if user_id:
                context.append(f"user={user_id}")
            if session_id:
                context.append(f"session={session_id}")
            if agent_id:
                context.append(f"agent={agent_id}")
            
            if context:
                formatted_msg += f" ({', '.join(context)})"
            
            self.logger.log(log_level, formatted_msg)
    
    def _map_level(self, level: ActivityLevel) -> int:
        """Map activity level to logging level."""
        level_map = {
            ActivityLevel.DEBUG: logging.DEBUG,
            ActivityLevel.INFO: logging.INFO,
            ActivityLevel.NOTICE: logging.INFO + 1,
            ActivityLevel.WARNING: logging.WARNING,
            ActivityLevel.ERROR: logging.ERROR,
            ActivityLevel.CRITICAL: logging.CRITICAL,
            ActivityLevel.ALERT: logging.CRITICAL + 1,
            ActivityLevel.EMERGENCY: logging.CRITICAL + 2
        }
        return level_map.get(level, logging.INFO)
    
    # Convenience methods for common log types
    def log_command(
        self,
        command: str,
        status: str,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        command_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a command execution."""
        level = ActivityLevel.INFO
        if status == "error":
            level = ActivityLevel.ERROR
        elif status == "unauthorized":
            level = ActivityLevel.WARNING
        
        related_ids = {"command_id": command_id} if command_id else None
        
        self.log_activity(
            activity_type=ActivityType.COMMAND,
            level=level,
            message=message,
            details={
                "command": command,
                "status": status,
                **(details or {})
            },
            user_id=user_id,
            session_id=session_id,
            agent_id=agent_id,
            related_ids=related_ids
        )
    
    def log_authentication(
        self,
        event: str,
        status: str,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an authentication event."""
        level = ActivityLevel.INFO
        if status == "failed":
            level = ActivityLevel.WARNING
        elif status == "error":
            level = ActivityLevel.ERROR
        
        self.log_activity(
            activity_type=ActivityType.AUTHENTICATION,
            level=level,
            message=message,
            details={
                "event": event,
                "status": status,
                "ip_address": ip_address,
                **(details or {})
            },
            user_id=user_id,
            session_id=session_id
        )
    
    def log_trading(
        self,
        action: str,
        status: str,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        order_id: Optional[str] = None,
        symbol: Optional[str] = None,
        exchange: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a trading activity."""
        level = ActivityLevel.INFO
        if status == "error":
            level = ActivityLevel.ERROR
        elif status in ["rejected", "failed"]:
            level = ActivityLevel.WARNING
        
        related_ids = {}
        if order_id:
            related_ids["order_id"] = order_id
        
        self.log_activity(
            activity_type=ActivityType.TRADING,
            level=level,
            message=message,
            details={
                "action": action,
                "status": status,
                "symbol": symbol,
                "exchange": exchange,
                **(details or {})
            },
            user_id=user_id,
            session_id=session_id,
            agent_id=agent_id,
            related_ids=related_ids
        )
    
    def log_system(
        self,
        component: str,
        event: str,
        message: str,
        level: ActivityLevel = ActivityLevel.INFO,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a system event."""
        self.log_activity(
            activity_type=ActivityType.SYSTEM,
            level=level,
            message=message,
            details={
                "component": component,
                "event": event,
                **(details or {})
            }
        )
    
    def log_error(
        self,
        component: str,
        error: Union[str, Exception],
        message: str,
        level: ActivityLevel = ActivityLevel.ERROR,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an error event."""
        error_str = str(error)
        error_type = type(error).__name__ if isinstance(error, Exception) else "Error"
        
        self.log_activity(
            activity_type=ActivityType.ERROR,
            level=level,
            message=message,
            details={
                "component": component,
                "error_type": error_type,
                "error_message": error_str,
                **(details or {})
            },
            user_id=user_id,
            session_id=session_id,
            agent_id=agent_id
        )
    
    def log_audit(
        self,
        event: str,
        resource: str,
        action: str,
        status: str,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a security audit event."""
        level = ActivityLevel.NOTICE
        if status == "denied":
            level = ActivityLevel.WARNING
        elif status == "error":
            level = ActivityLevel.ERROR
        
        self.log_activity(
            activity_type=ActivityType.AUDIT,
            level=level,
            message=message,
            details={
                "event": event,
                "resource": resource,
                "action": action,
                "status": status,
                "ip_address": ip_address,
                **(details or {})
            },
            user_id=user_id,
            session_id=session_id
        )
