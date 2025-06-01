import asyncio
import json
import uuid
from typing import Dict, Any, List, Optional
import httpx
from pydantic import BaseModel

# Models for API testing
class FarmCreate(BaseModel):
    name: str
    description: str
    owner_id: str
    settings: Optional[Dict[str, Any]] = {}

class AgentCreate(BaseModel):
    name: str
    description: str
    farm_id: str
    type: str = "standard"
    eliza_config: Dict[str, Any]
    capabilities: List[str] = []

class LinkedAccountCreate(BaseModel):
    name: str
    farm_id: str
    type: str
    provider: str
    encrypted_credentials: Optional[str] = None
    requires_monitoring: bool = False
    metadata: Optional[Dict[str, Any]] = {}

# Test functions for Farm API
async def test_create_farm(
    supabase_url: str,
    supabase_key: str,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test creating a farm via the API.
    
    Args:
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        Created farm object or error
    """
    # Generate a random UUID for the owner_id
    owner_id = str(uuid.uuid4())
    
    # Prepare farm data
    farm_data = {
        "name": f"Test Farm {uuid.uuid4().hex[:8]}",
        "description": "Test farm created via API test",
        "owner_id": owner_id,
        "settings": {
            "trading_enabled": False,
            "risk_level": "low",
            "test_mode": True
        }
    }
    
    # Determine API endpoint to use
    api_endpoint = f"{base_api_url}/farms" if base_api_url else f"{supabase_url}/rest/v1/farms"
    
    # Prepare headers based on endpoint type
    if base_api_url:
        # Using custom API
        headers = {
            "Content-Type": "application/json"
        }
    else:
        # Using Supabase directly
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    # Make API request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_endpoint,
                headers=headers,
                json=farm_data
            )
            
            status_code = response.status_code
            response_data = response.json() if response.content else {}
            
            result = {
                "status": "success" if 200 <= status_code < 300 else "failure",
                "status_code": status_code,
                "data": response_data[0] if isinstance(response_data, list) and response_data else response_data,
                "message": f"Farm created successfully" if 200 <= status_code < 300 else f"Failed to create farm: {response.text}"
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error testing farm creation: {str(e)}",
                "data": None
            }

async def test_get_farms(
    supabase_url: str,
    supabase_key: str,
    owner_id: Optional[str] = None,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test retrieving farms via the API.
    
    Args:
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        owner_id: Optional owner ID to filter by
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        List of farm objects or error
    """
    # Determine API endpoint to use
    api_endpoint = f"{base_api_url}/farms" if base_api_url else f"{supabase_url}/rest/v1/farms"
    
    # Prepare headers and params based on endpoint type
    if base_api_url:
        # Using custom API
        headers = {
            "Content-Type": "application/json"
        }
        params = {"owner_id": owner_id} if owner_id else {}
    else:
        # Using Supabase directly
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        params = {"owner_id": f"eq.{owner_id}"} if owner_id else {"select": "*"}
    
    # Make API request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                api_endpoint,
                headers=headers,
                params=params
            )
            
            status_code = response.status_code
            response_data = response.json() if response.content else []
            
            result = {
                "status": "success" if 200 <= status_code < 300 else "failure",
                "status_code": status_code,
                "data": response_data,
                "count": len(response_data) if isinstance(response_data, list) else 0,
                "message": f"Retrieved {len(response_data) if isinstance(response_data, list) else 0} farms" if 200 <= status_code < 300 else f"Failed to retrieve farms: {response.text}"
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error testing farm retrieval: {str(e)}",
                "data": None
            }

# Test functions for Agent API
async def test_create_agent(
    farm_id: str,
    supabase_url: str,
    supabase_key: str,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test creating an agent via the API.
    
    Args:
        farm_id: The farm ID to create the agent for
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        Created agent object or error
    """
    # Prepare agent data
    agent_data = {
        "name": f"Test Agent {uuid.uuid4().hex[:8]}",
        "description": "Test agent created via API test",
        "farm_id": farm_id,
        "type": "trader",
        "eliza_config": {
            "system_prompt": "You are a helpful trading assistant.",
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "tools": [
                {
                    "name": "market_data",
                    "description": "Get current market data"
                },
                {
                    "name": "portfolio",
                    "description": "View and manage portfolio"
                }
            ]
        },
        "capabilities": ["trading", "analysis", "reporting"]
    }
    
    # Determine API endpoint to use
    api_endpoint = f"{base_api_url}/agents" if base_api_url else f"{supabase_url}/rest/v1/agents"
    
    # Prepare headers based on endpoint type
    if base_api_url:
        # Using custom API
        headers = {
            "Content-Type": "application/json"
        }
    else:
        # Using Supabase directly
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    # Make API request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_endpoint,
                headers=headers,
                json=agent_data
            )
            
            status_code = response.status_code
            response_data = response.json() if response.content else {}
            
            result = {
                "status": "success" if 200 <= status_code < 300 else "failure",
                "status_code": status_code,
                "data": response_data[0] if isinstance(response_data, list) and response_data else response_data,
                "message": f"Agent created successfully" if 200 <= status_code < 300 else f"Failed to create agent: {response.text}"
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error testing agent creation: {str(e)}",
                "data": None
            }

async def test_get_farm_agents(
    farm_id: str,
    supabase_url: str,
    supabase_key: str,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test retrieving agents for a farm via the API.
    
    Args:
        farm_id: The farm ID to get agents for
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        List of agent objects or error
    """
    # Determine API endpoint to use
    api_endpoint = f"{base_api_url}/farms/{farm_id}/agents" if base_api_url else f"{supabase_url}/rest/v1/agents"
    
    # Prepare headers and params based on endpoint type
    if base_api_url:
        # Using custom API
        headers = {
            "Content-Type": "application/json"
        }
        params = {}
    else:
        # Using Supabase directly
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        params = {"farm_id": f"eq.{farm_id}", "select": "*"}
    
    # Make API request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                api_endpoint,
                headers=headers,
                params=params
            )
            
            status_code = response.status_code
            response_data = response.json() if response.content else []
            
            result = {
                "status": "success" if 200 <= status_code < 300 else "failure",
                "status_code": status_code,
                "data": response_data,
                "count": len(response_data) if isinstance(response_data, list) else 0,
                "message": f"Retrieved {len(response_data) if isinstance(response_data, list) else 0} agents" if 200 <= status_code < 300 else f"Failed to retrieve agents: {response.text}"
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error testing agent retrieval: {str(e)}",
                "data": None
            }

# Test functions for Brain API
async def test_query_brain(
    farm_id: str,
    query: str,
    openai_api_key: str,
    supabase_url: str,
    supabase_key: str,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test querying the brain via the API.
    
    Args:
        farm_id: The farm ID
        query: The query text
        openai_api_key: The OpenAI API key
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        Query results or error
    """
    # Determine if we should use the custom API or our own brain query function
    if base_api_url:
        # Using custom API
        api_endpoint = f"{base_api_url}/farms/{farm_id}/brain/query"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "query": query,
            "with_synthesis": True
        }
        
        # Make API request
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    api_endpoint,
                    headers=headers,
                    json=data
                )
                
                status_code = response.status_code
                response_data = response.json() if response.content else {}
                
                result = {
                    "status": "success" if 200 <= status_code < 300 else "failure",
                    "status_code": status_code,
                    "data": response_data,
                    "message": f"Brain query successful" if 200 <= status_code < 300 else f"Failed to query brain: {response.text}"
                }
                
                return result
                
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Error testing brain query: {str(e)}",
                    "data": None
                }
    else:
        # Import and use our own brain query function directly
        try:
            from query_brain import query_brain_api
            
            response = await query_brain_api(
                farm_id=farm_id,
                query=query,
                openai_api_key=openai_api_key,
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                with_synthesis=True,
                limit=5
            )
            
            if "error" in response:
                return {
                    "status": "failure",
                    "message": response["error"],
                    "data": response
                }
            
            return {
                "status": "success",
                "message": "Brain query successful",
                "data": response
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error importing or using query_brain function: {str(e)}",
                "data": None
            }

# Test functions for Vault API
async def test_get_vault_balance(
    farm_id: str,
    supabase_url: str,
    supabase_key: str,
    base_api_url: str = None
) -> Dict[str, Any]:
    """
    Test retrieving vault balances for a farm via the API.
    
    Args:
        farm_id: The farm ID
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        Vault balance data or error
    """
    # Determine API endpoint to use
    if base_api_url:
        api_endpoint = f"{base_api_url}/farms/{farm_id}/vault/balances"
        
        # Using custom API
        headers = {
            "Content-Type": "application/json"
        }
        params = {}
    else:
        # First, find the vault for this farm
        async with httpx.AsyncClient() as client:
            vault_response = await client.get(
                f"{supabase_url}/rest/v1/vaults",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "farm_id": f"eq.{farm_id}",
                    "limit": "1"
                }
            )
            
            if vault_response.status_code != 200:
                return {
                    "status": "failure",
                    "status_code": vault_response.status_code,
                    "message": f"Failed to find vault: {vault_response.text}",
                    "data": None
                }
            
            vaults = vault_response.json()
            if not vaults:
                return {
                    "status": "failure",
                    "message": "No vault found for farm",
                    "data": None
                }
            
            vault_id = vaults[0]["id"]
            
            # Now get the balances for this vault
            api_endpoint = f"{supabase_url}/rest/v1/vault_balances"
            
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json"
            }
            params = {"vault_id": f"eq.{vault_id}", "select": "*"}
    
    # Make API request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                api_endpoint,
                headers=headers,
                params=params
            )
            
            status_code = response.status_code
            response_data = response.json() if response.content else []
            
            result = {
                "status": "success" if 200 <= status_code < 300 else "failure",
                "status_code": status_code,
                "data": response_data,
                "count": len(response_data) if isinstance(response_data, list) else 0,
                "message": f"Retrieved {len(response_data) if isinstance(response_data, list) else 0} balance records" if 200 <= status_code < 300 else f"Failed to retrieve balances: {response.text}"
            }
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error testing vault balance retrieval: {str(e)}",
                "data": None
            }

# Main test function for full API testing
async def run_api_tests(
    supabase_url: str,
    supabase_key: str,
    openai_api_key: str,
    base_api_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run a series of API tests to verify functionality.
    
    Args:
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        openai_api_key: The OpenAI API key
        base_api_url: Optional base API URL (defaults to using Supabase directly)
        
    Returns:
        Test results
    """
    results = {
        "farm_tests": {},
        "agent_tests": {},
        "brain_tests": {},
        "vault_tests": {},
        "overall_status": "pending"
    }
    
    # Step 1: Create a test farm
    print("Testing farm creation...")
    farm_result = await test_create_farm(supabase_url, supabase_key, base_api_url)
    results["farm_tests"]["create"] = farm_result
    
    if farm_result["status"] != "success":
        results["overall_status"] = "failed"
        return results
    
    farm_id = farm_result["data"].get("id")
    owner_id = farm_result["data"].get("owner_id")
    
    # Step 2: Retrieve farms
    print("Testing farm retrieval...")
    farms_result = await test_get_farms(supabase_url, supabase_key, owner_id, base_api_url)
    results["farm_tests"]["list"] = farms_result
    
    # Step 3: Create a test agent
    print("Testing agent creation...")
    agent_result = await test_create_agent(farm_id, supabase_url, supabase_key, base_api_url)
    results["agent_tests"]["create"] = agent_result
    
    # Step 4: Retrieve agents for farm
    print("Testing agent retrieval...")
    agents_result = await test_get_farm_agents(farm_id, supabase_url, supabase_key, base_api_url)
    results["agent_tests"]["list"] = agents_result
    
    # Step 5: Test brain query (may not have data yet but should work)
    print("Testing brain query...")
    brain_result = await test_query_brain(
        farm_id, 
        "What trading strategies are recommended?", 
        openai_api_key,
        supabase_url, 
        supabase_key, 
        base_api_url
    )
    results["brain_tests"]["query"] = brain_result
    
    # Step 6: Test vault balance retrieval
    print("Testing vault balance retrieval...")
    vault_result = await test_get_vault_balance(farm_id, supabase_url, supabase_key, base_api_url)
    results["vault_tests"]["balances"] = vault_result
    
    # Calculate overall status
    all_statuses = [
        farm_result["status"],
        farms_result["status"],
        agent_result["status"],
        agents_result["status"],
        brain_result["status"],
        vault_result["status"]
    ]
    
    if all(status == "success" for status in all_statuses):
        results["overall_status"] = "passed"
    elif any(status == "error" for status in all_statuses):
        results["overall_status"] = "error"
    else:
        results["overall_status"] = "partial_success"
    
    return results

# Callable function for Windmill
async def test_api_endpoints(
    supabase_url: str,
    supabase_key: str,
    openai_api_key: str,
    base_api_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run API tests from Windmill.
    
    Args:
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        openai_api_key: The OpenAI API key
        base_api_url: Optional base API URL
        
    Returns:
        Test results
    """
    try:
        results = await run_api_tests(supabase_url, supabase_key, openai_api_key, base_api_url)
        
        summary = {
            "status": results["overall_status"],
            "total_tests": 6,
            "successful_tests": sum(1 for key1, category in results.items() 
                                 if key1 != "overall_status" 
                                 for key2, test in category.items() 
                                 if test["status"] == "success"),
            "failed_tests": sum(1 for key1, category in results.items() 
                             if key1 != "overall_status" 
                             for key2, test in category.items() 
                             if test["status"] == "failure"),
            "error_tests": sum(1 for key1, category in results.items() 
                            if key1 != "overall_status" 
                            for key2, test in category.items() 
                            if test["status"] == "error"),
            "results": results
        }
        
        return summary
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error running API tests: {str(e)}",
            "results": None
        } 