"""
Performance Alert System

Provides comprehensive alerting and notification for trading performance issues:
- Strategy performance alerts
- Risk limit breach notifications
- Execution quality warnings
- System health monitoring
- Multi-channel notifications
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union, Set, Callable
from datetime import datetime, timedelta
import json
import os
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

logger = logging.getLogger(__name__)

class AlertPriority(Enum):
    """Alert priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertCategory(Enum):
    """Alert categories."""
    STRATEGY_PERFORMANCE = "strategy_performance"
    RISK_BREACH = "risk_breach"
    EXECUTION_QUALITY = "execution_quality"
    SYSTEM_HEALTH = "system_health"
    POSITION_RECONCILIATION = "position_reconciliation"
    ACCOUNT_BALANCE = "account_balance"
    ORDER_ERROR = "order_error"
    MARKET_CONDITION = "market_condition"


class NotificationChannel(Enum):
    """Notification channels."""
    EMAIL = "email"
    SLACK = "slack"
    DISCORD = "discord"
    DASHBOARD = "dashboard"
    SMS = "sms"
    MOBILE_PUSH = "mobile_push"
    WEBHOOK = "webhook"


class Alert:
    """Performance alert with contextual information."""
    
    def __init__(
        self,
        title: str,
        message: str,
        category: AlertCategory,
        priority: AlertPriority,
        source: str,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Initialize alert.
        
        Args:
            title: Alert title
            message: Alert message
            category: Alert category
            priority: Alert priority
            source: Source system
            details: Additional details
            timestamp: Alert timestamp
        """
        self.title = title
        self.message = message
        self.category = category
        self.priority = priority
        self.source = source
        self.details = details or {}
        self.timestamp = timestamp or datetime.now()
        self.id = f"{self.timestamp.strftime('%Y%m%d%H%M%S')}-{hash(title) % 10000:04d}"
        self.status = "pending"
        self.notification_status = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "category": self.category.value,
            "priority": self.priority.value,
            "source": self.source,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
            "status": self.status,
            "notification_status": self.notification_status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Alert':
        """Create alert from dictionary."""
        alert = cls(
            title=data.get("title", ""),
            message=data.get("message", ""),
            category=AlertCategory(data.get("category", AlertCategory.SYSTEM_HEALTH.value)),
            priority=AlertPriority(data.get("priority", AlertPriority.MEDIUM.value)),
            source=data.get("source", ""),
            details=data.get("details", {}),
            timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat()))
        )
        
        alert.id = data.get("id", alert.id)
        alert.status = data.get("status", "pending")
        alert.notification_status = data.get("notification_status", {})
        
        return alert


class NotificationConfig:
    """Configuration for notification channels."""
    
    def __init__(
        self,
        enabled_channels: List[NotificationChannel],
        min_priority: AlertPriority = AlertPriority.MEDIUM,
        throttle_minutes: int = 30,
        email_config: Optional[Dict[str, Any]] = None,
        slack_config: Optional[Dict[str, Any]] = None,
        discord_config: Optional[Dict[str, Any]] = None,
        sms_config: Optional[Dict[str, Any]] = None,
        push_config: Optional[Dict[str, Any]] = None,
        webhook_config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize notification configuration.
        
        Args:
            enabled_channels: Enabled notification channels
            min_priority: Minimum priority for sending notifications
            throttle_minutes: Minutes to throttle repeated notifications
            email_config: Email configuration
            slack_config: Slack configuration
            discord_config: Discord configuration
            sms_config: SMS configuration
            push_config: Mobile push configuration
            webhook_config: Webhook configuration
        """
        self.enabled_channels = enabled_channels
        self.min_priority = min_priority
        self.throttle_minutes = throttle_minutes
        
        # Channel configurations
        self.email_config = email_config or {}
        self.slack_config = slack_config or {}
        self.discord_config = discord_config or {}
        self.sms_config = sms_config or {}
        self.push_config = push_config or {}
        self.webhook_config = webhook_config or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            "enabled_channels": [c.value for c in self.enabled_channels],
            "min_priority": self.min_priority.value,
            "throttle_minutes": self.throttle_minutes,
            "email_config": self.email_config,
            "slack_config": self.slack_config,
            "discord_config": self.discord_config,
            "sms_config": self.sms_config,
            "push_config": self.push_config,
            "webhook_config": self.webhook_config
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NotificationConfig':
        """Create configuration from dictionary."""
        enabled_channels = [NotificationChannel(c) for c in data.get("enabled_channels", [])]
        
        return cls(
            enabled_channels=enabled_channels,
            min_priority=AlertPriority(data.get("min_priority", AlertPriority.MEDIUM.value)),
            throttle_minutes=data.get("throttle_minutes", 30),
            email_config=data.get("email_config", {}),
            slack_config=data.get("slack_config", {}),
            discord_config=data.get("discord_config", {}),
            sms_config=data.get("sms_config", {}),
            push_config=data.get("push_config", {}),
            webhook_config=data.get("webhook_config", {})
        )


class PerformanceAlertSystem:
    """
    System for generating and managing performance alerts.
    
    Features:
    - Alert generation and prioritization
    - Multi-channel notifications
    - Alert throttling and deduplication
    - Alert history management
    - Alert status tracking
    """
    
    def __init__(
        self,
        config_file: Optional[str] = None,
        notification_config: Optional[NotificationConfig] = None,
        history_file: Optional[str] = None,
        max_history: int = 1000
    ):
        """
        Initialize performance alert system.
        
        Args:
            config_file: Path to configuration file
            notification_config: Notification configuration
            history_file: Path to history file
            max_history: Maximum number of alerts to keep in history
        """
        self.config_file = config_file
        self.notification_config = notification_config
        self.history_file = history_file
        self.max_history = max_history
        
        # Alert data
        self.alerts: List[Alert] = []
        self.alert_handlers: Dict[AlertCategory, List[Callable]] = {}
        
        # Load configuration if available
        if config_file and os.path.exists(config_file):
            self._load_config()
        
        # Initialize notification config if not provided
        if not self.notification_config:
            self.notification_config = NotificationConfig(
                enabled_channels=[NotificationChannel.DASHBOARD]
            )
        
        # Load alert history if available
        if history_file and os.path.exists(history_file):
            self._load_history()
        
        logger.info(f"Performance Alert System initialized")
    
    def _load_config(self) -> None:
        """Load configuration from file."""
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            if 'notification_config' in config:
                self.notification_config = NotificationConfig.from_dict(config['notification_config'])
            
            if 'max_history' in config:
                self.max_history = config['max_history']
            
            logger.info(f"Loaded configuration from {self.config_file}")
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}")
    
    def _save_config(self) -> None:
        """Save configuration to file."""
        if not self.config_file:
            return
        
        try:
            config = {
                'notification_config': self.notification_config.to_dict() if self.notification_config else {},
                'max_history': self.max_history
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Saved configuration to {self.config_file}")
        except Exception as e:
            logger.error(f"Error saving configuration: {str(e)}")
    
    def _load_history(self) -> None:
        """Load alert history from file."""
        try:
            with open(self.history_file, 'r') as f:
                data = json.load(f)
            
            self.alerts = [Alert.from_dict(a) for a in data.get('alerts', [])]
            
            logger.info(f"Loaded {len(self.alerts)} alerts from history")
        except Exception as e:
            logger.error(f"Error loading alert history: {str(e)}")
    
    def _save_history(self) -> None:
        """Save alert history to file."""
        if not self.history_file:
            return
        
        try:
            # Trim history if needed
            if len(self.alerts) > self.max_history:
                self.alerts = sorted(self.alerts, key=lambda a: a.timestamp, reverse=True)[:self.max_history]
            
            with open(self.history_file, 'w') as f:
                json.dump({
                    'alerts': [a.to_dict() for a in self.alerts]
                }, f, indent=2)
            
            logger.info(f"Saved {len(self.alerts)} alerts to history")
        except Exception as e:
            logger.error(f"Error saving alert history: {str(e)}")
    
    def add_alert_handler(self, category: AlertCategory, handler: Callable) -> None:
        """
        Add a handler for a specific alert category.
        
        Args:
            category: Alert category
            handler: Handler function
        """
        if category not in self.alert_handlers:
            self.alert_handlers[category] = []
        
        self.alert_handlers[category].append(handler)
        logger.info(f"Added alert handler for {category.value}")
    
    def create_alert(
        self,
        title: str,
        message: str,
        category: AlertCategory,
        priority: AlertPriority,
        source: str,
        details: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """
        Create and process a new alert.
        
        Args:
            title: Alert title
            message: Alert message
            category: Alert category
            priority: Alert priority
            source: Source system
            details: Additional details
            
        Returns:
            Created alert
        """
        # Create alert
        alert = Alert(
            title=title,
            message=message,
            category=category,
            priority=priority,
            source=source,
            details=details
        )
        
        # Check for duplicates within throttle window
        throttle_window = datetime.now() - timedelta(minutes=self.notification_config.throttle_minutes)
        
        for existing_alert in self.alerts:
            if (existing_alert.title == alert.title and 
                existing_alert.category == alert.category and
                existing_alert.timestamp >= throttle_window):
                
                logger.info(f"Throttling duplicate alert: {alert.title}")
                return existing_alert
        
        # Add to history
        self.alerts.append(alert)
        
        # Save history
        self._save_history()
        
        # Process the alert
        self._process_alert(alert)
        
        logger.info(f"Created {priority.value} priority alert: {title}")
        return alert
    
    def _process_alert(self, alert: Alert) -> None:
        """
        Process an alert.
        
        Args:
            alert: Alert to process
        """
        # Call category-specific handlers
        if alert.category in self.alert_handlers:
            for handler in self.alert_handlers[alert.category]:
                try:
                    handler(alert)
                except Exception as e:
                    logger.error(f"Error in alert handler: {str(e)}")
        
        # Send notifications
        if alert.priority.value >= self.notification_config.min_priority.value:
            self._send_notifications(alert)
    
    def _send_notifications(self, alert: Alert) -> None:
        """
        Send notifications for an alert.
        
        Args:
            alert: Alert to send notifications for
        """
        # Track notification attempts
        alert.notification_status = {}
        
        # Send to each enabled channel
        for channel in self.notification_config.enabled_channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    success = self._send_email_notification(alert)
                elif channel == NotificationChannel.SLACK:
                    success = self._send_slack_notification(alert)
                elif channel == NotificationChannel.DISCORD:
                    success = self._send_discord_notification(alert)
                elif channel == NotificationChannel.SMS:
                    success = self._send_sms_notification(alert)
                elif channel == NotificationChannel.MOBILE_PUSH:
                    success = self._send_push_notification(alert)
                elif channel == NotificationChannel.WEBHOOK:
                    success = self._send_webhook_notification(alert)
                elif channel == NotificationChannel.DASHBOARD:
                    # Dashboard notifications are automatic
                    success = True
                else:
                    logger.warning(f"Unsupported notification channel: {channel.value}")
                    success = False
                
                alert.notification_status[channel.value] = "success" if success else "failed"
                
            except Exception as e:
                logger.error(f"Error sending {channel.value} notification: {str(e)}")
                alert.notification_status[channel.value] = "error"
        
        # Update status
        if any(status == "success" for status in alert.notification_status.values()):
            alert.status = "notified"
        else:
            alert.status = "failed"
        
        # Save history
        self._save_history()
    
    def _send_email_notification(self, alert: Alert) -> bool:
        """
        Send email notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        config = self.notification_config.email_config
        
        if not config.get('smtp_server') or not config.get('sender') or not config.get('recipients'):
            logger.warning("Email configuration incomplete")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = config['sender']
            msg['To'] = ', '.join(config['recipients'])
            msg['Subject'] = f"[{alert.priority.value.upper()}] {alert.title}"
            
            # Create message body
            body = f"""
            <html>
            <body>
                <h2>{alert.title}</h2>
                <p><strong>Priority:</strong> {alert.priority.value.upper()}</p>
                <p><strong>Category:</strong> {alert.category.value}</p>
                <p><strong>Source:</strong> {alert.source}</p>
                <p><strong>Time:</strong> {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><strong>Message:</strong> {alert.message}</p>
                
                <h3>Details:</h3>
                <pre>{json.dumps(alert.details, indent=2)}</pre>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            # Connect to SMTP server
            server = smtplib.SMTP(config['smtp_server'], config.get('smtp_port', 587))
            server.starttls()
            
            # Login if credentials provided
            if config.get('username') and config.get('password'):
                server.login(config['username'], config['password'])
            
            # Send message
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Sent email notification for alert: {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return False
    
    def _send_slack_notification(self, alert: Alert) -> bool:
        """
        Send Slack notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        config = self.notification_config.slack_config
        
        if not config.get('webhook_url'):
            logger.warning("Slack configuration incomplete")
            return False
        
        try:
            # Prepare color based on priority
            if alert.priority == AlertPriority.LOW:
                color = "#2eb886"  # Green
            elif alert.priority == AlertPriority.MEDIUM:
                color = "#daa038"  # Yellow
            elif alert.priority == AlertPriority.HIGH:
                color = "#db5f3c"  # Orange
            else:  # CRITICAL
                color = "#cc0000"  # Red
            
            # Prepare message
            payload = {
                "attachments": [
                    {
                        "fallback": f"{alert.priority.value.upper()}: {alert.title}",
                        "color": color,
                        "title": alert.title,
                        "text": alert.message,
                        "fields": [
                            {"title": "Priority", "value": alert.priority.value.upper(), "short": True},
                            {"title": "Category", "value": alert.category.value, "short": True},
                            {"title": "Source", "value": alert.source, "short": True},
                            {"title": "Time", "value": alert.timestamp.strftime('%Y-%m-%d %H:%M:%S'), "short": True}
                        ],
                        "footer": "Trading Farm Alert System"
                    }
                ]
            }
            
            # Add details if present
            if alert.details:
                payload["attachments"][0]["fields"].append({
                    "title": "Details",
                    "value": f"```{json.dumps(alert.details, indent=2)}```",
                    "short": False
                })
            
            # Send message
            response = requests.post(
                config['webhook_url'],
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Error sending Slack notification: {response.text}")
                return False
            
            logger.info(f"Sent Slack notification for alert: {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending Slack notification: {str(e)}")
            return False
    
    def _send_discord_notification(self, alert: Alert) -> bool:
        """
        Send Discord notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        config = self.notification_config.discord_config
        
        if not config.get('webhook_url'):
            logger.warning("Discord configuration incomplete")
            return False
        
        try:
            # Prepare color based on priority (Discord uses decimal color values)
            if alert.priority == AlertPriority.LOW:
                color = 3066993  # Green
            elif alert.priority == AlertPriority.MEDIUM:
                color = 16763904  # Yellow
            elif alert.priority == AlertPriority.HIGH:
                color = 15105570  # Orange
            else:  # CRITICAL
                color = 13369344  # Red
            
            # Prepare message
            payload = {
                "embeds": [
                    {
                        "title": alert.title,
                        "description": alert.message,
                        "color": color,
                        "fields": [
                            {"name": "Priority", "value": alert.priority.value.upper(), "inline": True},
                            {"name": "Category", "value": alert.category.value, "inline": True},
                            {"name": "Source", "value": alert.source, "inline": True},
                            {"name": "Time", "value": alert.timestamp.strftime('%Y-%m-%d %H:%M:%S'), "inline": True}
                        ],
                        "footer": {"text": "Trading Farm Alert System"}
                    }
                ]
            }
            
            # Add details if present
            if alert.details:
                detail_str = json.dumps(alert.details, indent=2)
                # Discord has a field value limit of 1024 characters
                if len(detail_str) > 1024:
                    detail_str = detail_str[:1020] + " ..."
                
                payload["embeds"][0]["fields"].append({
                    "name": "Details",
                    "value": f"```json\n{detail_str}\n```",
                    "inline": False
                })
            
            # Send message
            response = requests.post(
                config['webhook_url'],
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 204:  # Discord returns 204 No Content on success
                logger.error(f"Error sending Discord notification: {response.text}")
                return False
            
            logger.info(f"Sent Discord notification for alert: {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending Discord notification: {str(e)}")
            return False
    
    def _send_sms_notification(self, alert: Alert) -> bool:
        """
        Send SMS notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        # This is a stub - you would need to integrate with an SMS provider like Twilio
        logger.info(f"SMS notification not implemented")
        return False
    
    def _send_push_notification(self, alert: Alert) -> bool:
        """
        Send mobile push notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        # This is a stub - you would need to integrate with a push notification service
        logger.info(f"Push notification not implemented")
        return False
    
    def _send_webhook_notification(self, alert: Alert) -> bool:
        """
        Send webhook notification.
        
        Args:
            alert: Alert to send
            
        Returns:
            Success status
        """
        config = self.notification_config.webhook_config
        
        if not config.get('url'):
            logger.warning("Webhook configuration incomplete")
            return False
        
        try:
            # Prepare payload
            payload = {
                "alert": alert.to_dict()
            }
            
            # Add custom fields if specified
            if 'custom_fields' in config:
                for key, value in config['custom_fields'].items():
                    payload[key] = value
            
            # Send request
            headers = config.get('headers', {"Content-Type": "application/json"})
            
            response = requests.post(
                config['url'],
                json=payload,
                headers=headers
            )
            
            if response.status_code < 200 or response.status_code >= 300:
                logger.error(f"Error sending webhook notification: {response.text}")
                return False
            
            logger.info(f"Sent webhook notification for alert: {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending webhook notification: {str(e)}")
            return False
    
    def get_recent_alerts(self, count: int = 10, category: Optional[AlertCategory] = None,
                         min_priority: Optional[AlertPriority] = None) -> List[Dict[str, Any]]:
        """
        Get recent alerts.
        
        Args:
            count: Maximum number of alerts to return
            category: Filter by category
            min_priority: Filter by minimum priority
            
        Returns:
            List of recent alerts
        """
        # Sort alerts by timestamp (newest first)
        sorted_alerts = sorted(self.alerts, key=lambda a: a.timestamp, reverse=True)
        
        # Apply filters
        filtered_alerts = []
        
        for alert in sorted_alerts:
            if category and alert.category != category:
                continue
            
            if min_priority and AlertPriority[alert.priority.name].value < min_priority.value:
                continue
            
            filtered_alerts.append(alert.to_dict())
            
            if len(filtered_alerts) >= count:
                break
        
        return filtered_alerts
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """
        Get summary of recent alerts.
        
        Returns:
            Alert summary
        """
        # Count alerts by category and priority
        cutoff = datetime.now() - timedelta(days=1)
        recent_alerts = [a for a in self.alerts if a.timestamp >= cutoff]
        
        category_counts = {}
        priority_counts = {}
        source_counts = {}
        
        for alert in recent_alerts:
            # Category counts
            category = alert.category.value
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += 1
            
            # Priority counts
            priority = alert.priority.value
            if priority not in priority_counts:
                priority_counts[priority] = 0
            priority_counts[priority] += 1
            
            # Source counts
            source = alert.source
            if source not in source_counts:
                source_counts[source] = 0
            source_counts[source] += 1
        
        # Find most recent high priority alert
        high_priority_alerts = [a for a in recent_alerts 
                              if a.priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]]
        
        most_recent_high = None
        if high_priority_alerts:
            most_recent_high = sorted(high_priority_alerts, key=lambda a: a.timestamp, reverse=True)[0].to_dict()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_recent_alerts": len(recent_alerts),
            "by_category": category_counts,
            "by_priority": priority_counts,
            "by_source": source_counts,
            "most_recent_high_priority": most_recent_high
        }
    
    def mark_alert_resolved(self, alert_id: str) -> bool:
        """
        Mark an alert as resolved.
        
        Args:
            alert_id: ID of the alert
            
        Returns:
            Success status
        """
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.status = "resolved"
                self._save_history()
                logger.info(f"Marked alert {alert_id} as resolved")
                return True
        
        logger.warning(f"Alert {alert_id} not found")
        return False
