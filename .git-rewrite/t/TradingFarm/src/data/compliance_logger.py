"""
Compliance Logging Module

Implements a compliance-focused logging system for trading operations, 
ensuring all activities are properly recorded for regulatory requirements.
Supports secure, tamper-evident logs with event classification.
"""

import os
import json
import logging
import hashlib
import datetime
import asyncio
from typing import Dict, List, Any, Optional, Union
from enum import Enum, auto
import uuid
import hmac

from .timeseries_db import TimeSeriesDB, get_timeseries_db
from ..config import get_config


class ComplianceEventType(Enum):
    """Compliance event types for classification."""
    ORDER_CREATED = auto()
    ORDER_MODIFIED = auto()
    ORDER_CANCELLED = auto()
    TRADE_EXECUTED = auto()
    BALANCE_CHANGED = auto()
    DEPOSIT = auto()
    WITHDRAWAL = auto()
    STRATEGY_STARTED = auto()
    STRATEGY_STOPPED = auto()
    PARAMETER_CHANGED = auto()
    USER_ACCESS = auto()
    API_ACCESS = auto()
    ERROR = auto()
    WARNING = auto()
    SYSTEM = auto()
    CUSTOM = auto()


class ComplianceEvent:
    """Represents a compliance logging event with all required metadata."""
    
    def __init__(
        self,
        event_type: ComplianceEventType,
        source: str,
        details: Dict[str, Any],
        user_id: Optional[str] = None,
        related_ids: Optional[Dict[str, str]] = None,
        timestamp: Optional[datetime.datetime] = None,
        severity: str = "INFO"
    ):
        """
        Initialize a compliance event.
        
        Args:
            event_type: Type of event
            source: Source of the event (component/module)
            details: Event details
            user_id: Optional user identifier
            related_ids: Optional dictionary of related identifiers
            timestamp: Optional timestamp (defaults to now)
            severity: Event severity (INFO, WARNING, ERROR)
        """
        self.id = str(uuid.uuid4())
        self.event_type = event_type
        self.source = source
        self.details = details
        self.user_id = user_id
        self.related_ids = related_ids or {}
        self.timestamp = timestamp or datetime.datetime.now()
        self.severity = severity
        self.hash = None  # Will be computed on serialization
        
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert event to dictionary.
        
        Returns:
            Dictionary representation of event
        """
        result = {
            "id": self.id,
            "event_type": self.event_type.name,
            "source": self.source,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
            "severity": self.severity,
        }
        
        # Add optional fields if present
        if self.user_id:
            result["user_id"] = self.user_id
        
        if self.related_ids:
            result["related_ids"] = self.related_ids
            
        if self.hash:
            result["hash"] = self.hash
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ComplianceEvent':
        """
        Create event from dictionary.
        
        Args:
            data: Dictionary representation of event
            
        Returns:
            ComplianceEvent instance
        """
        # Convert event_type string to enum
        event_type = ComplianceEventType[data["event_type"]]
        
        # Parse timestamp
        timestamp = datetime.datetime.fromisoformat(data["timestamp"])
        
        # Create event
        event = cls(
            event_type=event_type,
            source=data["source"],
            details=data["details"],
            user_id=data.get("user_id"),
            related_ids=data.get("related_ids"),
            timestamp=timestamp,
            severity=data.get("severity", "INFO")
        )
        
        # Set ID and hash if present
        event.id = data["id"]
        event.hash = data.get("hash")
        
        return event


class ComplianceLogger:
    """
    Compliance logger for trading activities.
    
    Provides methods for logging compliance events and storing them
    in a tamper-evident log store.
    """
    
    # Storage backends
    BACKEND_FILE = "file"
    BACKEND_DATABASE = "database"
    BACKEND_TIMESERIES = "timeseries"
    
    def __init__(
        self,
        backend: str = "file",
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize compliance logger.
        
        Args:
            backend: Storage backend (file, database, timeseries)
            config: Backend configuration
        """
        self.backend = backend
        self.config = config or get_config().get("compliance_logger", {})
        
        # Initialize logger
        self.logger = logging.getLogger("compliance")
        
        # Configure file paths
        self.log_dir = self.config.get("log_dir", "compliance_logs")
        self.current_log_file = None
        
        # Secure hash key (should be stored securely and consistently)
        self.hash_key = self.config.get("hash_key", os.urandom(32))
        
        # Time-series DB client
        self.timeseries_db = None
        
        # Last event hash for chain
        self.last_hash = None
        
        # Background task for async processing
        self.processing_task = None
        self.event_queue = asyncio.Queue()
        self.running = False
    
    async def initialize(self) -> bool:
        """
        Initialize the logger.
        
        Returns:
            True if initialization was successful
        """
        try:
            # Create log directory if using file backend
            if self.backend == self.BACKEND_FILE:
                os.makedirs(self.log_dir, exist_ok=True)
                self._rotate_log_file()
            
            # Connect to time-series DB if using that backend
            elif self.backend == self.BACKEND_TIMESERIES:
                self.timeseries_db = await get_timeseries_db()
            
            # Start background processing
            self.running = True
            self.processing_task = asyncio.create_task(self._process_events())
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing compliance logger: {str(e)}")
            return False
    
    def _rotate_log_file(self) -> None:
        """Rotate log file daily."""
        today = datetime.date.today().isoformat()
        self.current_log_file = os.path.join(self.log_dir, f"compliance_{today}.log")
    
    def _compute_hash(self, event: ComplianceEvent, prev_hash: Optional[str] = None) -> str:
        """
        Compute secure hash for event.
        
        Args:
            event: Compliance event
            prev_hash: Optional previous hash for chaining
            
        Returns:
            Secure hash
        """
        # Prepare data for hashing
        data = {
            "id": event.id,
            "event_type": event.event_type.name,
            "source": event.source,
            "details": json.dumps(event.details, sort_keys=True),
            "timestamp": event.timestamp.isoformat(),
            "prev_hash": prev_hash or ""
        }
        
        # Create a canonical representation for hashing
        message = json.dumps(data, sort_keys=True).encode('utf-8')
        
        # Compute HMAC with secure key
        h = hmac.new(self.hash_key, message, hashlib.sha256)
        return h.hexdigest()
    
    async def _process_events(self) -> None:
        """Background task for processing events."""
        while self.running:
            try:
                # Get event from queue
                event = await self.event_queue.get()
                
                # Compute hash with chaining
                event.hash = self._compute_hash(event, self.last_hash)
                self.last_hash = event.hash
                
                # Store based on backend
                if self.backend == self.BACKEND_FILE:
                    await self._store_event_file(event)
                elif self.backend == self.BACKEND_TIMESERIES:
                    await self._store_event_timeseries(event)
                elif self.backend == self.BACKEND_DATABASE:
                    await self._store_event_database(event)
                
                self.event_queue.task_done()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error processing compliance event: {str(e)}")
    
    async def _store_event_file(self, event: ComplianceEvent) -> None:
        """
        Store event in file.
        
        Args:
            event: Compliance event
        """
        # Check if we need to rotate log file
        if not os.path.exists(self.current_log_file):
            self._rotate_log_file()
            
        # Write event to file
        with open(self.current_log_file, 'a') as f:
            f.write(json.dumps(event.to_dict()) + "\n")
    
    async def _store_event_timeseries(self, event: ComplianceEvent) -> None:
        """
        Store event in time-series database.
        
        Args:
            event: Compliance event
        """
        if not self.timeseries_db:
            self.logger.error("Time-series DB not initialized")
            return
            
        # Convert event to time-series data
        data = {
            "id": event.id,
            "event_type": event.event_type.name,
            "source": event.source,
            "details": json.dumps(event.details),
            "user_id": event.user_id,
            "related_ids": json.dumps(event.related_ids),
            "severity": event.severity,
            "hash": event.hash,
            "timestamp": event.timestamp.timestamp() * 1000
        }
        
        # Write to time-series DB
        await self.timeseries_db.write_market_data(
            exchange="compliance",
            symbol=event.event_type.name,
            resolution="event",
            data=data
        )
    
    async def _store_event_database(self, event: ComplianceEvent) -> None:
        """
        Store event in database.
        
        Args:
            event: Compliance event
        """
        # This would be implemented with a proper database client
        # For now, we just log that it would be stored
        self.logger.info(f"Would store event in database: {event.id}")
    
    async def log_event(
        self,
        event_type: Union[ComplianceEventType, str],
        source: str,
        details: Dict[str, Any],
        user_id: Optional[str] = None,
        related_ids: Optional[Dict[str, str]] = None,
        severity: str = "INFO"
    ) -> str:
        """
        Log a compliance event.
        
        Args:
            event_type: Type of event (enum or string name)
            source: Source of the event
            details: Event details
            user_id: Optional user identifier
            related_ids: Optional related identifiers
            severity: Event severity
            
        Returns:
            Event ID
        """
        # Convert string to enum if needed
        if isinstance(event_type, str):
            try:
                event_type = ComplianceEventType[event_type]
            except KeyError:
                event_type = ComplianceEventType.CUSTOM
                details["custom_type"] = event_type
        
        # Create event
        event = ComplianceEvent(
            event_type=event_type,
            source=source,
            details=details,
            user_id=user_id,
            related_ids=related_ids,
            severity=severity
        )
        
        # Add to processing queue
        await self.event_queue.put(event)
        
        # Also log to standard logger
        log_msg = f"[{event.severity}] {event.source}: {event.event_type.name} - {event.id}"
        if severity == "ERROR":
            self.logger.error(log_msg)
        elif severity == "WARNING":
            self.logger.warning(log_msg)
        else:
            self.logger.info(log_msg)
        
        return event.id
    
    async def verify_logs(self, start_date: datetime.date, end_date: datetime.date) -> Dict[str, Any]:
        """
        Verify integrity of logs.
        
        Args:
            start_date: Start date
            end_date: End date
            
        Returns:
            Verification results
        """
        if self.backend != self.BACKEND_FILE:
            return {"verified": False, "message": "Verification only supported for file backend"}
        
        results = {
            "verified": True,
            "errors": [],
            "verified_events": 0,
            "total_events": 0
        }
        
        # Calculate date range
        current_date = start_date
        while current_date <= end_date:
            log_file = os.path.join(self.log_dir, f"compliance_{current_date.isoformat()}.log")
            
            if os.path.exists(log_file):
                # Read and verify events in file
                events = []
                with open(log_file, 'r') as f:
                    for line in f:
                        try:
                            event_data = json.loads(line.strip())
                            event = ComplianceEvent.from_dict(event_data)
                            events.append(event)
                        except Exception as e:
                            results["errors"].append(f"Error parsing event in {log_file}: {str(e)}")
                            results["verified"] = False
                
                # Verify hash chain
                prev_hash = None
                for event in events:
                    expected_hash = self._compute_hash(event, prev_hash)
                    if event.hash != expected_hash:
                        results["errors"].append(
                            f"Hash mismatch for event {event.id} in {log_file}: "
                            f"expected {expected_hash}, got {event.hash}"
                        )
                        results["verified"] = False
                    
                    prev_hash = event.hash
                    results["verified_events"] += 1
                
                results["total_events"] += len(events)
            
            # Move to next day
            current_date += datetime.timedelta(days=1)
        
        return results
    
    async def close(self) -> None:
        """Close the logger and release resources."""
        self.running = False
        
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
            
        # Wait for queue to be empty
        if not self.event_queue.empty():
            await self.event_queue.join()
        
        # Close time-series DB if used
        if self.timeseries_db:
            await self.timeseries_db.close()


# Singleton instance
_compliance_logger_instance = None


async def get_compliance_logger() -> ComplianceLogger:
    """
    Get the singleton compliance logger instance.
    
    Returns:
        ComplianceLogger instance
    """
    global _compliance_logger_instance
    
    if _compliance_logger_instance is None:
        _compliance_logger_instance = ComplianceLogger()
        await _compliance_logger_instance.initialize()
    
    return _compliance_logger_instance


# Helper functions for common compliance events
async def log_order_event(
    order_type: str,
    exchange: str,
    order_details: Dict[str, Any],
    user_id: Optional[str] = None
) -> str:
    """
    Log an order-related compliance event.
    
    Args:
        order_type: Type of order event (CREATED, MODIFIED, CANCELLED)
        exchange: Exchange name
        order_details: Order details
        user_id: Optional user identifier
        
    Returns:
        Event ID
    """
    logger = await get_compliance_logger()
    
    event_type_map = {
        "CREATED": ComplianceEventType.ORDER_CREATED,
        "MODIFIED": ComplianceEventType.ORDER_MODIFIED,
        "CANCELLED": ComplianceEventType.ORDER_CANCELLED
    }
    
    event_type = event_type_map.get(order_type, ComplianceEventType.CUSTOM)
    
    return await logger.log_event(
        event_type=event_type,
        source=f"exchange:{exchange}",
        details=order_details,
        user_id=user_id,
        related_ids={"order_id": order_details.get("order_id", "unknown")}
    )


async def log_trade_execution(
    exchange: str,
    trade_details: Dict[str, Any],
    user_id: Optional[str] = None
) -> str:
    """
    Log a trade execution compliance event.
    
    Args:
        exchange: Exchange name
        trade_details: Trade details
        user_id: Optional user identifier
        
    Returns:
        Event ID
    """
    logger = await get_compliance_logger()
    
    return await logger.log_event(
        event_type=ComplianceEventType.TRADE_EXECUTED,
        source=f"exchange:{exchange}",
        details=trade_details,
        user_id=user_id,
        related_ids={
            "order_id": trade_details.get("order_id", "unknown"),
            "trade_id": trade_details.get("trade_id", "unknown")
        }
    )


async def log_balance_change(
    exchange: str,
    asset: str,
    amount: float,
    reason: str,
    details: Dict[str, Any],
    user_id: Optional[str] = None
) -> str:
    """
    Log a balance change compliance event.
    
    Args:
        exchange: Exchange name
        asset: Asset name
        amount: Change amount
        reason: Reason for change
        details: Additional details
        user_id: Optional user identifier
        
    Returns:
        Event ID
    """
    logger = await get_compliance_logger()
    
    return await logger.log_event(
        event_type=ComplianceEventType.BALANCE_CHANGED,
        source=f"exchange:{exchange}",
        details={
            "asset": asset,
            "amount": amount,
            "reason": reason,
            **details
        },
        user_id=user_id
    )


async def log_strategy_event(
    strategy_id: str,
    event_type: str,
    details: Dict[str, Any],
    user_id: Optional[str] = None
) -> str:
    """
    Log a strategy-related compliance event.
    
    Args:
        strategy_id: Strategy ID
        event_type: Type of event (STARTED, STOPPED, PARAMETER_CHANGED)
        details: Event details
        user_id: Optional user identifier
        
    Returns:
        Event ID
    """
    logger = await get_compliance_logger()
    
    event_type_map = {
        "STARTED": ComplianceEventType.STRATEGY_STARTED,
        "STOPPED": ComplianceEventType.STRATEGY_STOPPED,
        "PARAMETER_CHANGED": ComplianceEventType.PARAMETER_CHANGED
    }
    
    event_type_enum = event_type_map.get(event_type, ComplianceEventType.CUSTOM)
    
    return await logger.log_event(
        event_type=event_type_enum,
        source=f"strategy:{strategy_id}",
        details=details,
        user_id=user_id,
        related_ids={"strategy_id": strategy_id}
    )
