"""
ElizaOS Connector Module

Handles bidirectional communication between ElizaOS agents and the Trading Farm platform.
Provides API for command execution, data exchange, and agent deployment.
"""

import json
import logging
import requests
from typing import Dict, List, Optional, Union, Any, Callable
from datetime import datetime
import asyncio
import websockets
from enum import Enum


class ConnectionStatus(Enum):
    """Status of the ElizaOS connection."""
    DISCONNECTED = 0
    CONNECTING = 1
    CONNECTED = 2
    ERROR = 3
    AUTHENTICATING = 4


class ElizaOSConnector:
    """
    Manages the connection and communication with ElizaOS agent framework.
    
    Provides methods to:
    - Establish secure connections to ElizaOS
    - Deploy trading agents with specific capabilities
    - Execute agent commands for trading operations
    - Stream market data to agents
    - Receive agent decisions and insights
    - Configure agent parameters and models
    """
    
    def __init__(self, api_key: Optional[str] = None, 
               host: str = "localhost", 
               port: int = 8765,
               use_ssl: bool = True,
               auto_reconnect: bool = True,
               log_level: int = logging.INFO):
        """
        Initialize the ElizaOS connector.
        
        Parameters:
        -----------
        api_key : str, optional
            Authentication key for ElizaOS API
        host : str
            ElizaOS host address
        port : int
            ElizaOS port number
        use_ssl : bool
            Whether to use SSL for secure communication
        auto_reconnect : bool
            Whether to automatically attempt reconnection
        log_level : int
            Logging level for connector operations
        """
        self.api_key = api_key
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.auto_reconnect = auto_reconnect
        
        # Configure logging
        self.logger = logging.getLogger("ElizaOSConnector")
        self.logger.setLevel(log_level)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # Initialize connection attributes
        self.connection_status = ConnectionStatus.DISCONNECTED
        self.websocket = None
        self.rest_session = requests.Session()
        self.event_handlers = {}
        self.active_agents = {}
        self.last_heartbeat = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        
    async def connect(self) -> bool:
        """
        Establish connection to ElizaOS.
        
        Returns:
        --------
        bool
            True if connection was successful, False otherwise
        """
        if self.connection_status == ConnectionStatus.CONNECTED:
            self.logger.info("Already connected to ElizaOS")
            return True
        
        self.connection_status = ConnectionStatus.CONNECTING
        protocol = "wss" if self.use_ssl else "ws"
        uri = f"{protocol}://{self.host}:{self.port}/trading_farm"
        
        try:
            self.logger.info(f"Connecting to ElizaOS at {uri}")
            self.websocket = await websockets.connect(uri)
            
            # Authenticate if API key is provided
            if self.api_key:
                self.connection_status = ConnectionStatus.AUTHENTICATING
                auth_result = await self._authenticate()
                if not auth_result:
                    self.logger.error("Authentication failed")
                    self.connection_status = ConnectionStatus.ERROR
                    return False
            
            self.connection_status = ConnectionStatus.CONNECTED
            self.reconnect_attempts = 0
            self.last_heartbeat = datetime.now()
            
            # Start heartbeat and message handling tasks
            asyncio.create_task(self._heartbeat_loop())
            asyncio.create_task(self._message_handler())
            
            self.logger.info("Successfully connected to ElizaOS")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect to ElizaOS: {str(e)}")
            self.connection_status = ConnectionStatus.ERROR
            
            if self.auto_reconnect and self.reconnect_attempts < self.max_reconnect_attempts:
                self.reconnect_attempts += 1
                retry_delay = min(30, 2 ** self.reconnect_attempts)  # Exponential backoff
                self.logger.info(f"Attempting reconnection in {retry_delay} seconds")
                await asyncio.sleep(retry_delay)
                return await self.connect()
                
            return False
    
    async def disconnect(self) -> bool:
        """
        Disconnect from ElizaOS.
        
        Returns:
        --------
        bool
            True if disconnect was successful, False otherwise
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.info("Not connected to ElizaOS")
            return True
        
        try:
            if self.websocket:
                await self.websocket.close()
                
            self.connection_status = ConnectionStatus.DISCONNECTED
            self.logger.info("Disconnected from ElizaOS")
            return True
            
        except Exception as e:
            self.logger.error(f"Error disconnecting from ElizaOS: {str(e)}")
            return False
    
    async def deploy_agent(self, agent_config: Dict) -> Dict:
        """
        Deploy a new trading agent on ElizaOS.
        
        Parameters:
        -----------
        agent_config : dict
            Configuration for the new agent including:
            - name: Agent name
            - model: AI model to use
            - capabilities: List of agent capabilities
            - market_access: Market data the agent can access
            - parameters: Agent-specific parameters
            
        Returns:
        --------
        dict
            Response with deployed agent details including agent_id
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot deploy agent: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        try:
            # Ensure required fields are present
            required_fields = ["name", "model", "capabilities"]
            for field in required_fields:
                if field not in agent_config:
                    return {"success": False, "error": f"Missing required field: {field}"}
            
            # Send deployment request
            message = {
                "action": "deploy_agent",
                "payload": agent_config
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get("success"):
                agent_id = response_data.get("agent_id")
                self.active_agents[agent_id] = {
                    "config": agent_config,
                    "deployed_at": datetime.now().isoformat(),
                    "status": "active"
                }
                self.logger.info(f"Successfully deployed agent: {agent_id}")
            
            return response_data
            
        except Exception as e:
            self.logger.error(f"Error deploying agent: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def execute_command(self, agent_id: str, command: str, 
                           params: Optional[Dict] = None) -> Dict:
        """
        Execute a command on a specific ElizaOS agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the target agent
        command : str
            Command to execute
        params : dict, optional
            Command parameters
            
        Returns:
        --------
        dict
            Command execution result
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot execute command: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        if agent_id not in self.active_agents:
            self.logger.error(f"Cannot execute command: Agent {agent_id} not found")
            return {"success": False, "error": f"Agent {agent_id} not found"}
        
        try:
            message = {
                "action": "execute_command",
                "agent_id": agent_id,
                "command": command,
                "params": params or {}
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error executing command: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def stream_market_data(self, data: Dict) -> bool:
        """
        Stream market data to ElizaOS agents.
        
        Parameters:
        -----------
        data : dict
            Market data including:
            - symbol: Trading symbol
            - price: Current price
            - timestamp: Data timestamp
            - volume: Trading volume
            - additional market metrics
            
        Returns:
        --------
        bool
            True if data was streamed successfully, False otherwise
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot stream data: Not connected to ElizaOS")
            return False
        
        try:
            message = {
                "action": "stream_market_data",
                "payload": data
            }
            
            await self.websocket.send(json.dumps(message))
            return True
            
        except Exception as e:
            self.logger.error(f"Error streaming market data: {str(e)}")
            return False
    
    def register_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        Register a handler function for specific event types.
        
        Parameters:
        -----------
        event_type : str
            Type of event to handle (e.g., 'agent_decision', 'market_insight')
        handler : callable
            Function to call when event occurs
        """
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
            
        self.event_handlers[event_type].append(handler)
        self.logger.info(f"Registered handler for event type: {event_type}")
    
    def unregister_event_handler(self, event_type: str, handler: Callable) -> bool:
        """
        Unregister a handler function.
        
        Parameters:
        -----------
        event_type : str
            Type of event
        handler : callable
            Handler function to remove
            
        Returns:
        --------
        bool
            True if handler was removed, False otherwise
        """
        if event_type not in self.event_handlers:
            return False
            
        if handler in self.event_handlers[event_type]:
            self.event_handlers[event_type].remove(handler)
            self.logger.info(f"Unregistered handler for event type: {event_type}")
            return True
            
        return False
    
    async def get_agent_status(self, agent_id: str) -> Dict:
        """
        Get the current status of an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
            
        Returns:
        --------
        dict
            Agent status information
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot get agent status: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        try:
            message = {
                "action": "get_agent_status",
                "agent_id": agent_id
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error getting agent status: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def list_active_agents(self) -> Dict:
        """
        Get a list of all active agents.
        
        Returns:
        --------
        dict
            Dictionary with agent information
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot list agents: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        try:
            message = {
                "action": "list_agents"
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error listing agents: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_agent_config(self, agent_id: str, config_updates: Dict) -> Dict:
        """
        Update configuration of an existing agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent to update
        config_updates : dict
            Configuration parameters to update
            
        Returns:
        --------
        dict
            Update result
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot update agent: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        if agent_id not in self.active_agents:
            self.logger.error(f"Cannot update agent: Agent {agent_id} not found")
            return {"success": False, "error": f"Agent {agent_id} not found"}
        
        try:
            message = {
                "action": "update_agent_config",
                "agent_id": agent_id,
                "config_updates": config_updates
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get("success"):
                # Update local cache
                self.active_agents[agent_id]["config"].update(config_updates)
                self.logger.info(f"Successfully updated agent: {agent_id}")
            
            return response_data
            
        except Exception as e:
            self.logger.error(f"Error updating agent: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def deactivate_agent(self, agent_id: str) -> Dict:
        """
        Deactivate an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent to deactivate
            
        Returns:
        --------
        dict
            Deactivation result
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot deactivate agent: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        try:
            message = {
                "action": "deactivate_agent",
                "agent_id": agent_id
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get("success") and agent_id in self.active_agents:
                self.active_agents[agent_id]["status"] = "inactive"
                self.logger.info(f"Successfully deactivated agent: {agent_id}")
            
            return response_data
            
        except Exception as e:
            self.logger.error(f"Error deactivating agent: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_available_models(self) -> Dict:
        """
        Get a list of available AI models for agents.
        
        Returns:
        --------
        dict
            Dictionary with available model information
        """
        if self.connection_status != ConnectionStatus.CONNECTED:
            self.logger.error("Cannot get models: Not connected to ElizaOS")
            return {"success": False, "error": "Not connected to ElizaOS"}
        
        try:
            message = {
                "action": "get_available_models"
            }
            
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error getting available models: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _authenticate(self) -> bool:
        """
        Authenticate with ElizaOS using API key.
        
        Returns:
        --------
        bool
            True if authentication was successful, False otherwise
        """
        try:
            auth_message = {
                "action": "authenticate",
                "api_key": self.api_key
            }
            
            await self.websocket.send(json.dumps(auth_message))
            response = await self.websocket.recv()
            response_data = json.loads(response)
            
            return response_data.get("success", False)
            
        except Exception as e:
            self.logger.error(f"Authentication error: {str(e)}")
            return False
    
    async def _heartbeat_loop(self) -> None:
        """
        Maintain connection with periodic heartbeats.
        """
        while self.connection_status == ConnectionStatus.CONNECTED:
            try:
                # Send heartbeat every 30 seconds
                await asyncio.sleep(30)
                
                if self.websocket and self.websocket.open:
                    await self.websocket.send(json.dumps({"action": "heartbeat"}))
                    self.last_heartbeat = datetime.now()
                else:
                    self.logger.warning("Heartbeat failed: WebSocket not open")
                    self.connection_status = ConnectionStatus.DISCONNECTED
                    
                    if self.auto_reconnect:
                        await self.connect()
                    
            except Exception as e:
                self.logger.error(f"Heartbeat error: {str(e)}")
                self.connection_status = ConnectionStatus.ERROR
                
                if self.auto_reconnect:
                    await self.connect()
    
    async def _message_handler(self) -> None:
        """
        Handle incoming messages from ElizaOS.
        """
        while self.connection_status == ConnectionStatus.CONNECTED:
            try:
                if not self.websocket or not self.websocket.open:
                    self.logger.warning("Message handler: WebSocket not open")
                    self.connection_status = ConnectionStatus.DISCONNECTED
                    
                    if self.auto_reconnect:
                        await self.connect()
                    
                    await asyncio.sleep(1)
                    continue
                
                message = await self.websocket.recv()
                message_data = json.loads(message)
                
                # Process message based on type
                event_type = message_data.get("type")
                if event_type:
                    # Call registered handlers for this event type
                    handlers = self.event_handlers.get(event_type, [])
                    for handler in handlers:
                        try:
                            handler(message_data)
                        except Exception as e:
                            self.logger.error(f"Error in event handler: {str(e)}")
                
            except websockets.exceptions.ConnectionClosed:
                self.logger.warning("Connection to ElizaOS closed")
                self.connection_status = ConnectionStatus.DISCONNECTED
                
                if self.auto_reconnect:
                    await self.connect()
                else:
                    break
                    
            except Exception as e:
                self.logger.error(f"Message handler error: {str(e)}")
                await asyncio.sleep(1)
    
    def get_connection_status(self) -> str:
        """
        Get the current connection status.
        
        Returns:
        --------
        str
            Current connection status as string
        """
        return self.connection_status.name
    
    def get_active_agent_count(self) -> int:
        """
        Get the number of active agents.
        
        Returns:
        --------
        int
            Count of active agents
        """
        return len([a for a in self.active_agents.values() if a.get("status") == "active"])
