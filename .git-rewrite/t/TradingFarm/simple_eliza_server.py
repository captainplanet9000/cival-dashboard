#!/usr/bin/env python
"""
Simple test server for ElizaOS dashboard with minimal dependencies.
"""
import os
import uvicorn
import logging
import json
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import Dict, List, Any, Optional

# Import Alchemy API routers
from src.api.alchemy_api import alchemy_router, initialize_alchemy_api
from src.api.alchemy_api_bossman import bossman_router
from src.blockchain.alchemy_integration import AlchemyIntegration
from src.agents.eliza_wallet_alchemy import EnhancedWalletManager
from src.agents.bossman_alchemy import BossmanController

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create data directories if they don't exist
os.makedirs("data", exist_ok=True)
os.makedirs("data/eliza", exist_ok=True)
os.makedirs("data/eliza_wallets", exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="ElizaOS Demo Dashboard",
    description="Demo dashboard for ElizaOS Trading Farm integration",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create required directories
os.makedirs("config", exist_ok=True)

# Create a mock ElizaAgentBridge for demonstration
class MockElizaBridge:
    def __init__(self):
        self.agents = {}
        
    def create_agent(self, agent_name, character_template):
        agent_id = f"agent_{len(self.agents) + 1}"
        self.agents[agent_id] = {
            "name": agent_name,
            "character_template": character_template,
            "status": "active"
        }
        return agent_id
    
    def get_agent_status(self, agent_id):
        if agent_id in self.agents:
            return {
                "agent_id": agent_id,
                "name": self.agents[agent_id]["name"],
                "status": self.agents[agent_id]["status"]
            }
        return None
    
    def send_command_to_agent(self, agent_id, command, parameters):
        if agent_id in self.agents:
            return {
                "success": True,
                "agent_id": agent_id,
                "command": command,
                "parameters": parameters,
                "result": "Command received and processed"
            }
        return {
            "success": False,
            "error": f"Agent {agent_id} not found"
        }

# Initialize mock ElizaBridge
eliza_bridge = MockElizaBridge()

# Initialize Alchemy API
initialize_alchemy_api(eliza_bridge, config_path="config/alchemy_config.json")

# Include Alchemy routers
app.include_router(alchemy_router)
app.include_router(bossman_router)

# Create template Alchemy config if it doesn't exist
config_path = "config/alchemy_config.json"
if not os.path.exists(config_path):
    template = {
        "api_keys": {
            "ethereum": "YOUR_ETHEREUM_API_KEY",
            "polygon": "YOUR_POLYGON_API_KEY",
            "arbitrum": "YOUR_ARBITRUM_API_KEY",
            "optimism": "YOUR_OPTIMISM_API_KEY",
            "base": "YOUR_BASE_API_KEY"
        },
        "default_settings": {
            "network": "ethereum",
            "network_type": "goerli"
        }
    }
    with open(config_path, 'w') as f:
        json.dump(template, f, indent=4)
    logger.info(f"Created template Alchemy config at {config_path}")

# Root endpoint - redirect to dashboard
@app.get("/")
async def read_root():
    return {
        "name": "ElizaOS Dashboard Demo",
        "version": "1.0.0",
        "endpoints": [
            "/eliza/dashboard - ElizaOS Trading Farm Dashboard"
        ]
    }

# Dashboard endpoint
@app.get("/eliza/dashboard", include_in_schema=False)
async def get_dashboard():
    """Serve the ElizaOS Trading Farm dashboard."""
    try:
        # Get the path to the templates directory
        template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "api", "templates")
        dashboard_path = os.path.join(template_dir, "eliza_dashboard.html")
        
        # Ensure the templates directory exists
        os.makedirs(template_dir, exist_ok=True)
        
        # Check if the dashboard file exists
        if not os.path.exists(dashboard_path):
            return {
                "status": "error",
                "message": "Dashboard template not found"
            }
        
        # Read the dashboard HTML
        with open(dashboard_path, "r") as file:
            html_content = file.read()
        
        # Return the HTML content
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        logger.error(f"Error serving dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Simple mock endpoints for demo purposes

@app.get("/eliza/status")
async def get_status():
    """Get ElizaOS status."""
    return {
        "status": "online",
        "agent_count": 3,
        "running_agents": 2,
        "agents": [
            {
                "id": "bossman-1",
                "name": "Bossman Controller",
                "status": "running",
                "is_controller": True
            },
            {
                "id": "agent-1",
                "name": "BTC Trader",
                "status": "running",
                "is_controller": False
            },
            {
                "id": "agent-2",
                "name": "ETH Trader",
                "status": "stopped",
                "is_controller": False
            }
        ]
    }

@app.get("/eliza/controller")
async def get_controller():
    """Get Bossman controller status."""
    return {
        "agent_id": "bossman-1",
        "details": {
            "active": True,
            "config": {
                "name": "Bossman Controller",
                "model_provider": "anthropic",
                "model_name": "claude-3-opus",
                "risk_per_trade": 0.05
            }
        },
        "wallet": {
            "name": "Controller Wallet",
            "id": "wallet-1",
            "balance": "10,000.00"
        }
    }

@app.post("/eliza/create-bossman")
async def create_bossman():
    """Create a Bossman controller agent."""
    return {
        "agent_id": "bossman-1",
        "name": "Bossman Controller",
        "status": "created"
    }

@app.get("/eliza/wallets")
async def get_wallets():
    """Get all wallets."""
    return [
        {
            "id": "wallet-1",
            "name": "Controller Wallet",
            "address": "0x123abc...",
            "balance": "10,000.00"
        },
        {
            "id": "wallet-2",
            "name": "BTC Trading Wallet",
            "address": "0x456def...",
            "balance": "5,000.00"
        },
        {
            "id": "wallet-3",
            "name": "ETH Trading Wallet",
            "address": "0x789ghi...",
            "balance": "2,500.00"
        }
    ]

@app.post("/eliza/wallets")
async def create_wallet():
    """Create a new wallet."""
    return {
        "wallet_id": "wallet-new",
        "name": "New Wallet",
        "address": "0xabc123...",
        "status": "created"
    }

@app.get("/eliza/wallets/agent/{agent_id}")
async def get_agent_wallet(agent_id: str):
    """Get wallet for a specific agent."""
    wallets = {
        "bossman-1": {
            "id": "wallet-1",
            "name": "Controller Wallet",
            "address": "0x123abc...",
            "balance": "10,000.00"
        },
        "agent-1": {
            "id": "wallet-2",
            "name": "BTC Trading Wallet",
            "address": "0x456def...",
            "balance": "5,000.00"
        },
        "agent-2": {
            "id": "wallet-3",
            "name": "ETH Trading Wallet",
            "address": "0x789ghi...",
            "balance": "2,500.00"
        }
    }
    
    if agent_id in wallets:
        return wallets[agent_id]
    else:
        return {"message": "No wallet found for this agent"}

@app.post("/eliza/agents")
async def create_agent():
    """Create a new trading agent."""
    return {
        "id": "agent-new",
        "name": "New Agent",
        "status": "created"
    }

@app.post("/eliza/agents/{agent_id}/start")
async def start_agent(agent_id: str):
    """Start a trading agent."""
    return {
        "id": agent_id,
        "name": f"Agent {agent_id}",
        "status": "running"
    }

@app.post("/eliza/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    """Stop a trading agent."""
    return {
        "id": agent_id,
        "name": f"Agent {agent_id}",
        "status": "stopped"
    }

if __name__ == "__main__":
    logger.info("Starting ElizaOS Dashboard Demo server on http://localhost:8000")
    logger.info("Access the dashboard at http://localhost:8000/eliza/dashboard")
    uvicorn.run(app, host="0.0.0.0", port=8000)
