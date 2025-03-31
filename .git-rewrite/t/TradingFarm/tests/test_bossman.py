#!/usr/bin/env python
"""
Test script for Bossman controller agent.
"""
import sys
import os
import json
import uuid
import asyncio
import requests
from pprint import pprint

# Add src to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))

# API Base URL
API_BASE = "http://localhost:8000/eliza"

async def test_bossman_creation():
    """Test creating the Bossman controller agent."""
    print("\n=== Testing Bossman Controller Creation ===")
    
    try:
        # Check if API is running
        response = requests.get(f"{API_BASE}/status")
        if response.status_code != 200:
            print(f"API not available (status: {response.status_code}). Please start the API server.")
            return None
        
        # Check if controller already exists
        response = requests.get(f"{API_BASE}/controller")
        if response.status_code == 200:
            data = response.json()
            if "agent_id" in data:
                print(f"Controller agent already exists: {data['agent_id']}")
                return data["agent_id"]
        
        # Create the Bossman controller
        response = requests.post(f"{API_BASE}/create-bossman")
        
        if response.status_code != 200:
            print(f"Error creating Bossman: {response.text}")
            return None
        
        bossman_data = response.json()
        bossman_id = bossman_data["agent_id"]
        print(f"Created Bossman controller: {bossman_id}")
        print(f"Wallet ID: {bossman_data.get('wallet_id')}")
        
        # Wait for controller to be fully created
        await asyncio.sleep(3)
        
        return bossman_id
    
    except requests.exceptions.ConnectionError:
        print("Could not connect to API. Please make sure the API server is running.")
        return None

async def test_bossman_commands(bossman_id):
    """Test sending commands to the Bossman controller."""
    print("\n=== Testing Bossman Controller Commands ===")
    
    if not bossman_id:
        print("No Bossman ID provided, skipping command tests.")
        return
    
    try:
        # Start the controller agent
        response = requests.post(f"{API_BASE}/agents/{bossman_id}/start")
        if response.status_code != 200:
            print(f"Error starting Bossman: {response.text}")
            return
        
        print(f"Started Bossman controller: {bossman_id}")
        
        # Wait for agent to start
        await asyncio.sleep(2)
        
        # Test 1: Get market overview
        print("\nSending command: get_market_overview")
        response = requests.post(
            f"{API_BASE}/controller/{bossman_id}/command",
            json={"name": "get_market_overview"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Status: {result.get('status')}")
            print(f"Overall sentiment: {result.get('overall_sentiment')}")
            print(f"Markets: {len(result.get('markets', {}))}")
        else:
            print(f"Error sending command: {response.text}")
        
        # Test 2: Adjust risk level
        print("\nSending command: adjust_risk_level")
        response = requests.post(
            f"{API_BASE}/controller/{bossman_id}/command",
            json={"name": "adjust_risk_level", "risk_level": 0.01}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
            print(f"Affected agents: {result.get('affected_agents')}")
        else:
            print(f"Error sending command: {response.text}")
        
        # Test 3: Get agent performance
        print("\nSending command: get_agent_performance")
        response = requests.post(
            f"{API_BASE}/controller/{bossman_id}/command",
            json={"name": "get_agent_performance"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Status: {result.get('status')}")
            print(f"Total agents: {result.get('total_agents')}")
            print(f"Active agents: {result.get('active_agents')}")
            print(f"Total PnL: {result.get('total_pnl')}")
        else:
            print(f"Error sending command: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("Could not connect to API. Please make sure the API server is running.")

async def test_create_trading_agents():
    """Create some trading agents for the Bossman to manage."""
    print("\n=== Creating Trading Agents ===")
    
    try:
        # Create 3 trading agents
        agent_ids = []
        symbols = [
            ["BTC-USD"], 
            ["ETH-USD"],
            ["SOL-USD", "BNB-USD"]
        ]
        
        for i, symbol_list in enumerate(symbols):
            agent_name = f"Trading Agent {i+1}"
            response = requests.post(
                f"{API_BASE}/agents", 
                json={
                    "name": agent_name,
                    "symbols": symbol_list,
                    "timeframes": ["1h", "4h"],
                    "character_template": "crypto_trader.json"
                }
            )
            
            if response.status_code != 200:
                print(f"Error creating agent {agent_name}: {response.text}")
                continue
            
            agent_data = response.json()
            agent_id = agent_data["id"]
            agent_ids.append(agent_id)
            print(f"Created agent: {agent_name} ({agent_id}) - Trading {', '.join(symbol_list)}")
        
        # Wait for agents to be created
        await asyncio.sleep(3)
        
        # Start the agents
        for agent_id in agent_ids:
            response = requests.post(f"{API_BASE}/agents/{agent_id}/start")
            if response.status_code == 200:
                print(f"Started agent: {agent_id}")
            else:
                print(f"Error starting agent {agent_id}: {response.text}")
        
        return agent_ids
    
    except requests.exceptions.ConnectionError:
        print("Could not connect to API. Please make sure the API server is running.")
        return []

async def test_capital_allocation(bossman_id, agent_ids):
    """Test capital allocation command."""
    print("\n=== Testing Capital Allocation ===")
    
    if not bossman_id or not agent_ids:
        print("Missing Bossman ID or agent IDs, skipping capital allocation test.")
        return
    
    try:
        # Create allocation dictionary
        allocations = {}
        total = 80  # Leave 20% in reserve
        per_agent = total / len(agent_ids)
        
        for agent_id in agent_ids:
            allocations[agent_id] = per_agent
        
        # Send allocation command
        response = requests.post(
            f"{API_BASE}/controller/{bossman_id}/command",
            json={"name": "allocate_capital", "allocations": allocations}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
            print(f"Applied allocations: {result.get('applied_allocations')}")
            print(f"Reserve allocation: {result.get('reserve_allocation')}%")
        else:
            print(f"Error sending command: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("Could not connect to API. Please make sure the API server is running.")

async def main():
    """Run the Bossman controller tests."""
    # Create Bossman controller
    bossman_id = await test_bossman_creation()
    
    # Create trading agents
    agent_ids = await test_create_trading_agents()
    
    # Test Bossman commands
    await test_bossman_commands(bossman_id)
    
    # Test capital allocation
    await test_capital_allocation(bossman_id, agent_ids)
    
    print("\n=== Test Results ===")
    print(f"Bossman ID: {bossman_id}")
    print(f"Trading agent IDs: {agent_ids}")

if __name__ == "__main__":
    asyncio.run(main())
