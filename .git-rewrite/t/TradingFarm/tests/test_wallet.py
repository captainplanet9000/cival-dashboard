#!/usr/bin/env python
"""
Test script for ElizaOS wallet management functionality.
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

from agents.eliza_wallet import ElizaWalletManager

# API Base URL
API_BASE = "http://localhost:8000/eliza"

def test_local_wallet_manager():
    """Test the ElizaWalletManager directly."""
    print("\n=== Testing ElizaWalletManager ===")
    
    # Create wallet manager
    wallets_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data/test_wallets")
    wallet_manager = ElizaWalletManager(wallets_path=wallets_path)
    
    # Create a wallet
    wallet_name = f"Test Wallet {uuid.uuid4()}"
    wallet_id = wallet_manager.create_wallet(wallet_name)
    print(f"Created wallet: {wallet_id} - {wallet_name}")
    
    # List wallets
    wallets = wallet_manager.list_wallets()
    print(f"Found {len(wallets)} wallets:")
    for wallet in wallets:
        print(f"  - {wallet['id']}: {wallet['name']} ({wallet['address']})")
    
    # Create an agent ID and assign wallet
    agent_id = str(uuid.uuid4())
    wallet_manager.assign_wallet_to_agent(agent_id, wallet_id)
    print(f"Assigned wallet {wallet_id} to agent {agent_id}")
    
    # Get agent wallet
    agent_wallet = wallet_manager.get_agent_wallet(agent_id)
    if agent_wallet:
        print(f"Agent wallet: {agent_wallet['id']} - {agent_wallet['name']} ({agent_wallet['address']})")
    else:
        print(f"No wallet found for agent {agent_id}")
    
    return wallet_manager, wallet_id, agent_id

async def test_api_wallet_management():
    """Test wallet management via the API."""
    print("\n=== Testing Wallet Management API ===")
    
    try:
        # Check if API is running
        response = requests.get(f"{API_BASE}/status")
        if response.status_code != 200:
            print(f"API not available (status: {response.status_code}). Please start the API server.")
            return None, None
        
        # Create a wallet
        wallet_name = f"API Test Wallet {uuid.uuid4()}"
        response = requests.post(f"{API_BASE}/wallets", json={"name": wallet_name})
        
        if response.status_code != 200:
            print(f"Error creating wallet: {response.text}")
            return None, None
        
        wallet_data = response.json()
        wallet_id = wallet_data["wallet_id"]
        print(f"Created wallet via API: {wallet_id} - {wallet_name}")
        
        # List wallets
        response = requests.get(f"{API_BASE}/wallets")
        if response.status_code == 200:
            wallets = response.json()
            print(f"Found {len(wallets)} wallets via API")
        else:
            print(f"Error listing wallets: {response.text}")
        
        # Create an agent
        agent_name = f"Test Agent {uuid.uuid4()}"
        response = requests.post(
            f"{API_BASE}/agents", 
            json={
                "name": agent_name,
                "symbols": ["BTC-USD"],
                "timeframes": ["1h"],
                "wallet_id": wallet_id
            }
        )
        
        if response.status_code != 200:
            print(f"Error creating agent: {response.text}")
            return wallet_id, None
        
        agent_data = response.json()
        agent_id = agent_data["id"]
        print(f"Created agent via API: {agent_id} - {agent_name}")
        
        # Wait for agent creation to complete
        await asyncio.sleep(2)
        
        # Get agent wallet
        response = requests.get(f"{API_BASE}/wallets/agent/{agent_id}")
        if response.status_code == 200:
            agent_wallet = response.json()
            print(f"Agent wallet: {agent_wallet.get('id')} - {agent_wallet.get('name', 'N/A')}")
        else:
            print(f"Error getting agent wallet: {response.text}")
        
        return wallet_id, agent_id
    
    except requests.exceptions.ConnectionError:
        print("Could not connect to API. Please make sure the API server is running.")
        return None, None

async def main():
    """Run the test script."""
    # Test local wallet manager
    wallet_manager, local_wallet_id, local_agent_id = test_local_wallet_manager()
    
    # Test API wallet management
    api_wallet_id, api_agent_id = await test_api_wallet_management()
    
    print("\n=== Test Results ===")
    print(f"Local wallet ID: {local_wallet_id}")
    print(f"Local agent ID: {local_agent_id}")
    print(f"API wallet ID: {api_wallet_id}")
    print(f"API agent ID: {api_agent_id}")

if __name__ == "__main__":
    asyncio.run(main())
