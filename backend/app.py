from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator
import asyncpg
import uuid
import json
import os
from datetime import datetime, timedelta
import httpx
import openai
from openai import OpenAI, AsyncOpenAI
import pandas as pd
import numpy as np

# Model definitions
class FarmBase(BaseModel):
    name: str
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}

class FarmCreate(FarmBase):
    owner_id: str

class FarmResponse(FarmBase):
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "standard"
    eliza_config: Dict[str, Any] = {}
    capabilities: List[str] = []
    metadata: Optional[Dict[str, Any]] = {}

class AgentCreate(AgentBase):
    farm_id: str

class AgentResponse(AgentBase):
    id: str
    farm_id: str
    status: str
    created_at: datetime
    updated_at: datetime

class BrainQuery(BaseModel):
    query: str
    with_synthesis: bool = False
    limit: int = 5

class BrainQueryResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    result_count: int
    synthesis: Optional[str] = None

class LinkedAccountBase(BaseModel):
    name: str
    type: str  # 'exchange_api', 'defi_wallet', 'bank_account', etc.
    provider: str  # 'binance', 'coinbase', 'metamask', etc.
    credentials: Optional[Dict[str, Any]] = None
    requires_monitoring: bool = False
    metadata: Optional[Dict[str, Any]] = {}

class LinkedAccountCreate(LinkedAccountBase):
    farm_id: str

class LinkedAccountResponse(LinkedAccountBase):
    id: str
    farm_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_monitored_at: Optional[datetime] = None

    class Config:
        exclude = {"credentials"}  # Don't return credentials in responses

class VaultBalanceResponse(BaseModel):
    id: str
    vault_id: str
    asset_symbol: str
    amount: str
    last_updated: datetime
    created_at: datetime
    updated_at: datetime

# Goal management models
class GoalTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    goal_type: str
    parameters: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class GoalBase(BaseModel):
    name: str
    description: Optional[str] = None
    goal_type: str
    target_value: Optional[float] = None
    target_asset: Optional[str] = None
    parameters: Dict[str, Any] = {}
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    priority: int = 0
    metadata: Dict[str, Any] = {}

class GoalCreate(GoalBase):
    farm_id: str
    template_id: Optional[str] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    target_asset: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class GoalResponse(GoalBase):
    id: str
    farm_id: str
    template_id: Optional[str] = None
    status: str
    progress: float
    last_evaluated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class GoalMetricResponse(BaseModel):
    id: str
    goal_id: str
    timestamp: datetime
    current_value: Optional[float] = None
    progress: float
    metrics: Dict[str, Any]
    created_at: datetime

class GoalDependencyCreate(BaseModel):
    goal_id: str
    depends_on_goal_id: str
    dependency_type: str = "blocker"

class GoalDependencyResponse(BaseModel):
    id: str
    goal_id: str
    depends_on_goal_id: str
    dependency_type: str
    created_at: datetime

class GoalActionCreate(BaseModel):
    goal_id: str
    agent_id: Optional[str] = None
    action_type: str
    parameters: Dict[str, Any] = {}

class GoalActionResponse(BaseModel):
    id: str
    goal_id: str
    agent_id: Optional[str] = None
    action_type: str
    status: str
    parameters: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Database connection functions
async def get_db_pool():
    """Create and return a database connection pool"""
    if not hasattr(get_db_pool, "pool"):
        # Use local SQLite database for demo
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        database = os.getenv("DB_NAME", "postgres")
        
        # For demo purposes: Just mock the database connection and return None
        # In a real app, you would create an actual database connection
        get_db_pool.pool = None
    
    return get_db_pool.pool

async def get_db_conn():
    """Get a database connection from the pool"""
    # For demo purposes: Just yield None as a placeholder
    # In a real app, you would acquire and release an actual connection
    yield None

# Create FastAPI app
app = FastAPI(
    title="Trading Farm API",
    description="API for the Trading Farm platform, integrating Farms, Vaults, Brains, and ElizaOS Agents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify to restrict origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": f"Internal server error: {str(exc)}"},
    )

# Helpers
def row_to_dict(row):
    """Convert an asyncpg Row to a dict"""
    if row is None:
        return None
    return dict(row)

async def find_farm_by_id(conn, farm_id):
    """Find a farm by ID"""
    row = await conn.fetchrow(
        "SELECT * FROM farms WHERE id = $1",
        farm_id
    )
    return row_to_dict(row)

async def find_vault_by_farm_id(conn, farm_id):
    """Find a vault by farm ID or create if it doesn't exist"""
    row = await conn.fetchrow(
        "SELECT * FROM vaults WHERE farm_id = $1 LIMIT 1",
        farm_id
    )
    
    if row is None:
        # Create a new vault for the farm
        row = await conn.fetchrow(
            """
            INSERT INTO vaults (farm_id, name, description)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            farm_id,
            "Main Vault",
            "Primary vault for managing farm assets"
        )
    
    return row_to_dict(row)

async def find_goal_by_id(conn, goal_id):
    """Find a goal by ID"""
    row = await conn.fetchrow(
        "SELECT * FROM goals WHERE id = $1",
        goal_id
    )
    return row_to_dict(row)

# Modify the handlers to return mock data instead of querying the database
# This is a modified implementation that doesn't require a real database
def get_mock_farms():
    """Return mock farm data"""
    return [
        {
            "id": "1",
            "name": "Demo Farm 1",
            "description": "A demo farm for testing",
            "owner_id": "test-user-123",
            "is_active": True,
            "settings": {"riskLevel": "medium", "autoRebalance": True},
            "created_at": datetime.now() - timedelta(days=30),
            "updated_at": datetime.now() - timedelta(days=5)
        },
        {
            "id": "2",
            "name": "Demo Farm 2",
            "description": "Another demo farm",
            "owner_id": "test-user-456",
            "is_active": True,
            "settings": {"riskLevel": "high", "autoRebalance": False},
            "created_at": datetime.now() - timedelta(days=15),
            "updated_at": datetime.now() - timedelta(days=2)
        }
    ]

def get_mock_agents(farm_id=None):
    """Return mock agent data"""
    agents = [
        {
            "id": "101",
            "name": "Trading Bot Alpha",
            "description": "Automated trading agent",
            "farm_id": "1",
            "type": "standard",
            "status": "active",
            "eliza_config": {},
            "capabilities": ["trading", "monitoring"],
            "metadata": {"version": "1.0.0"},
            "created_at": datetime.now() - timedelta(days=25),
            "updated_at": datetime.now() - timedelta(days=3)
        },
        {
            "id": "102",
            "name": "Risk Monitor",
            "description": "Risk assessment agent",
            "farm_id": "1",
            "type": "monitor",
            "status": "active",
            "eliza_config": {},
            "capabilities": ["risk_analysis"],
            "metadata": {"version": "1.0.0"},
            "created_at": datetime.now() - timedelta(days=20),
            "updated_at": datetime.now() - timedelta(days=1)
        },
        {
            "id": "103",
            "name": "Strategy Agent",
            "description": "Trading strategy execution",
            "farm_id": "2",
            "type": "standard",
            "status": "active",
            "eliza_config": {},
            "capabilities": ["strategy_execution", "backtesting"],
            "metadata": {"version": "1.0.0"},
            "created_at": datetime.now() - timedelta(days=10),
            "updated_at": datetime.now() - timedelta(hours=12)
        }
    ]
    
    if farm_id:
        return [agent for agent in agents if agent["farm_id"] == farm_id]
    return agents

def get_mock_vault_balances(farm_id):
    """Return mock vault balance data"""
    balances = [
        {
            "id": "b1",
            "vault_id": f"v-{farm_id}",
            "asset_symbol": "BTC",
            "amount": "0.5",
            "last_updated": datetime.now() - timedelta(hours=1),
            "created_at": datetime.now() - timedelta(days=30),
            "updated_at": datetime.now() - timedelta(hours=1)
        },
        {
            "id": "b2",
            "vault_id": f"v-{farm_id}",
            "asset_symbol": "ETH",
            "amount": "5.0",
            "last_updated": datetime.now() - timedelta(hours=1),
            "created_at": datetime.now() - timedelta(days=25),
            "updated_at": datetime.now() - timedelta(hours=1)
        },
        {
            "id": "b3",
            "vault_id": f"v-{farm_id}",
            "asset_symbol": "USDC",
            "amount": "10000.0",
            "last_updated": datetime.now() - timedelta(hours=1),
            "created_at": datetime.now() - timedelta(days=20),
            "updated_at": datetime.now() - timedelta(hours=1)
        }
    ]
    return balances

# Farm endpoints
@app.post("/farms", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_farm(farm: FarmCreate, conn = Depends(get_db_conn)):
    """Create a new farm"""
    try:
        # Mock creating a farm
        new_farm = {
            "id": str(uuid.uuid4()),
            "name": farm.name,
            "description": farm.description,
            "owner_id": farm.owner_id,
            "is_active": True,
            "settings": farm.settings,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        return new_farm
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating farm: {str(e)}")

@app.get("/farms", response_model=List[FarmResponse])
async def get_farms(owner_id: Optional[str] = None, conn = Depends(get_db_conn)):
    """Get all farms, optionally filtered by owner_id"""
    try:
        farms = get_mock_farms()
        if owner_id:
            farms = [farm for farm in farms if farm["owner_id"] == owner_id]
        return farms
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving farms: {str(e)}")

@app.get("/farms/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: str, conn = Depends(get_db_conn)):
    """Get a farm by ID"""
    try:
        row = await conn.fetchrow(
            "SELECT * FROM farms WHERE id = $1",
            farm_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving farm: {str(e)}")

@app.put("/farms/{farm_id}", response_model=FarmResponse)
async def update_farm(farm_id: str, farm_update: FarmBase, conn = Depends(get_db_conn)):
    """Update a farm"""
    try:
        # Check if the farm exists
        existing_farm = await find_farm_by_id(conn, farm_id)
        if not existing_farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Update the farm
        row = await conn.fetchrow(
            """
            UPDATE farms
            SET name = $1, description = $2, settings = $3, updated_at = NOW()
            WHERE id = $4
            RETURNING *
            """,
            farm_update.name,
            farm_update.description,
            json.dumps(farm_update.settings),
            farm_id
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating farm: {str(e)}")

# Agent endpoints
@app.get("/agents", response_model=List[AgentResponse])
async def get_all_agents(conn = Depends(get_db_conn)):
    """Get all agents"""
    try:
        agents = get_mock_agents()
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving agents: {str(e)}")

@app.post("/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(agent: AgentCreate, conn = Depends(get_db_conn)):
    """Create a new agent for a farm"""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, agent.farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Create the agent
        row = await conn.fetchrow(
            """
            INSERT INTO agents (name, description, farm_id, type, eliza_config, capabilities, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            agent.name,
            agent.description,
            agent.farm_id,
            agent.type,
            json.dumps(agent.eliza_config),
            agent.capabilities,
            json.dumps(agent.metadata)
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@app.get("/farms/{farm_id}/agents", response_model=List[AgentResponse])
async def get_farm_agents(farm_id: str, conn = Depends(get_db_conn)):
    """Get all agents for a farm"""
    try:
        agents = get_mock_agents(farm_id)
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving agents: {str(e)}")

@app.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, conn = Depends(get_db_conn)):
    """Get an agent by ID"""
    try:
        row = await conn.fetchrow(
            "SELECT * FROM agents WHERE id = $1",
            agent_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving agent: {str(e)}")

@app.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent_update: AgentBase, conn = Depends(get_db_conn)):
    """Update an agent"""
    try:
        # Check if the agent exists
        row = await conn.fetchrow(
            "SELECT * FROM agents WHERE id = $1",
            agent_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Update the agent
        row = await conn.fetchrow(
            """
            UPDATE agents
            SET name = $1, description = $2, type = $3, eliza_config = $4, 
                capabilities = $5, metadata = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
            """,
            agent_update.name,
            agent_update.description,
            agent_update.type,
            json.dumps(agent_update.eliza_config),
            agent_update.capabilities,
            json.dumps(agent_update.metadata),
            agent_id
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")

@app.post("/agents/{agent_id}/start", response_model=AgentResponse)
async def start_agent(agent_id: str, conn = Depends(get_db_conn)):
    """Start an agent"""
    try:
        # Check if the agent exists
        row = await conn.fetchrow(
            "SELECT * FROM agents WHERE id = $1",
            agent_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Update the agent status
        row = await conn.fetchrow(
            """
            UPDATE agents
            SET status = 'active', updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            agent_id
        )
        
        # TODO: Implement actual agent runtime startup logic
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting agent: {str(e)}")

@app.post("/agents/{agent_id}/stop", response_model=AgentResponse)
async def stop_agent(agent_id: str, conn = Depends(get_db_conn)):
    """Stop an agent"""
    try:
        # Check if the agent exists
        row = await conn.fetchrow(
            "SELECT * FROM agents WHERE id = $1",
            agent_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Update the agent status
        row = await conn.fetchrow(
            """
            UPDATE agents
            SET status = 'inactive', updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            agent_id
        )
        
        # TODO: Implement actual agent runtime shutdown logic
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping agent: {str(e)}")

# Brain endpoints
@app.post("/farms/{farm_id}/brain/query", response_model=BrainQueryResponse)
async def query_brain(farm_id: str, query_params: BrainQuery, conn = Depends(get_db_conn)):
    """Query the brain for a farm"""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Find brain for this farm
        brain_row = await conn.fetchrow(
            "SELECT * FROM brains WHERE farm_id = $1 LIMIT 1",
            farm_id
        )
        
        if brain_row is None:
            raise HTTPException(status_code=404, detail="No brain found for this farm")
        
        brain_id = brain_row["id"]
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Generate embedding for the query
        client = AsyncOpenAI(api_key=openai_api_key)
        embedding_response = await client.embeddings.create(
            model="text-embedding-ada-002",
            input=query_params.query
        )
        
        embedding = embedding_response.data[0].embedding
        
        # Perform vector search
        results = await conn.fetch(
            """
            SELECT * FROM query_brain($1, $2, $3, $4, $5)
            """,
            brain_id,
            query_params.query,
            embedding,
            query_params.limit,
            0.65  # Lower threshold to get more diverse results
        )
        
        # Convert results to JSON-serializable format
        result_list = []
        for row in results:
            result_dict = dict(row)
            # Convert decimal to float for JSON serialization
            result_dict["similarity"] = float(result_dict["similarity"])
            result_list.append(result_dict)
        
        response = {
            "query": query_params.query,
            "results": result_list,
            "result_count": len(result_list)
        }
        
        # Synthesize an answer if requested and there are results
        if query_params.with_synthesis and result_list:
            context = "\n\n".join([
                f"[Document: {r['document_title']}]\n{r['content']}"
                for r in result_list
            ])
            
            prompt = f"""
            You are an assistant that answers questions based on the provided information. 
            Answer the query only using the context provided below. 
            Be concise and specific, referring directly to the information in the context.
            If the context doesn't provide enough information to answer the query, say "I don't have enough information to answer that question."

            Query: {query_params.query}

            Context:
            {context}

            Answer:
            """
            
            chat_response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based only on the provided context."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            synthesis = chat_response.choices[0].message.content.strip()
            response["synthesis"] = synthesis
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying brain: {str(e)}")

# Vault endpoints
@app.get("/farms/{farm_id}/vault/balances", response_model=List[VaultBalanceResponse])
async def get_vault_balances(farm_id: str, conn = Depends(get_db_conn)):
    """Get vault balances for a farm"""
    try:
        balances = get_mock_vault_balances(farm_id)
        return balances
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving vault balances: {str(e)}")

@app.get("/farms/{farm_id}/vault/transactions", response_model=List[Dict[str, Any]])
async def get_transactions(
    farm_id: str, 
    transaction_type: Optional[str] = None,
    asset_symbol: Optional[str] = None,
    limit: int = 50,
    conn = Depends(get_db_conn)
):
    """Get transaction logs for a farm"""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Build the query
        query = "SELECT * FROM transaction_logs WHERE farm_id = $1"
        params = [farm_id]
        
        if transaction_type:
            query += f" AND transaction_type = ${len(params) + 1}"
            params.append(transaction_type)
        
        if asset_symbol:
            query += f" AND asset_symbol = ${len(params) + 1}"
            params.append(asset_symbol)
        
        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        # Get the transactions
        rows = await conn.fetch(query, *params)
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving transactions: {str(e)}")

# Goal Management Endpoints

@app.get("/goal-templates", response_model=List[GoalTemplateResponse])
async def get_goal_templates(
    goal_type: Optional[str] = None,
    conn = Depends(get_db_conn)
):
    """Get all goal templates, optionally filtered by goal_type"""
    try:
        if goal_type:
            rows = await conn.fetch(
                "SELECT * FROM goal_templates WHERE goal_type = $1 ORDER BY name",
                goal_type
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM goal_templates ORDER BY name"
            )
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal templates: {str(e)}")

@app.get("/goal-templates/{template_id}", response_model=GoalTemplateResponse)
async def get_goal_template(template_id: str, conn = Depends(get_db_conn)):
    """Get a goal template by ID"""
    try:
        row = await conn.fetchrow(
            "SELECT * FROM goal_templates WHERE id = $1",
            template_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Goal template not found")
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal template: {str(e)}")

@app.post("/farms/{farm_id}/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(farm_id: str, goal: GoalCreate, conn = Depends(get_db_conn)):
    """Create a new goal for a farm"""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # If template_id is provided, get template parameters
        template_parameters = {}
        if goal.template_id:
            template = await conn.fetchrow(
                "SELECT * FROM goal_templates WHERE id = $1",
                goal.template_id
            )
            
            if template is None:
                raise HTTPException(status_code=404, detail="Goal template not found")
            
            template_parameters = template["parameters"]
            
            # Merge template parameters with provided parameters
            # User parameters take precedence
            if template_parameters and isinstance(template_parameters, dict):
                goal.parameters = {**template_parameters, **goal.parameters}
        
        # Create the goal
        row = await conn.fetchrow(
            """
            INSERT INTO goals (
                farm_id, 
                template_id, 
                name, 
                description, 
                goal_type, 
                target_value, 
                target_asset, 
                parameters, 
                start_date, 
                end_date, 
                priority, 
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            """,
            farm_id,
            goal.template_id,
            goal.name,
            goal.description,
            goal.goal_type,
            goal.target_value,
            goal.target_asset,
            json.dumps(goal.parameters),
            goal.start_date,
            goal.end_date,
            goal.priority,
            json.dumps(goal.metadata)
        )
        
        if row is None:
            raise HTTPException(status_code=400, detail="Failed to create goal")
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating goal: {str(e)}")

@app.get("/farms/{farm_id}/goals", response_model=List[GoalResponse])
async def get_farm_goals(
    farm_id: str, 
    status: Optional[str] = None,
    goal_type: Optional[str] = None,
    conn = Depends(get_db_conn)
):
    """Get all goals for a farm, optionally filtered by status or goal_type"""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Build the query
        query = "SELECT * FROM goals WHERE farm_id = $1"
        params = [farm_id]
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        if goal_type:
            query += f" AND goal_type = ${len(params) + 1}"
            params.append(goal_type)
        
        query += " ORDER BY priority DESC, created_at DESC"
        
        # Get the goals
        rows = await conn.fetch(query, *params)
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goals: {str(e)}")

@app.get("/goals/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, conn = Depends(get_db_conn)):
    """Get a goal by ID"""
    try:
        row = await conn.fetchrow(
            "SELECT * FROM goals WHERE id = $1",
            goal_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal: {str(e)}")

@app.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal_update: GoalUpdate, conn = Depends(get_db_conn)):
    """Update a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Build the update query
        update_values = []
        update_params = []
        
        # Add fields to update only if they are provided
        if goal_update.name is not None:
            update_values.append(f"name = ${len(update_params) + 1}")
            update_params.append(goal_update.name)
        
        if goal_update.description is not None:
            update_values.append(f"description = ${len(update_params) + 1}")
            update_params.append(goal_update.description)
        
        if goal_update.target_value is not None:
            update_values.append(f"target_value = ${len(update_params) + 1}")
            update_params.append(goal_update.target_value)
        
        if goal_update.target_asset is not None:
            update_values.append(f"target_asset = ${len(update_params) + 1}")
            update_params.append(goal_update.target_asset)
        
        if goal_update.parameters is not None:
            update_values.append(f"parameters = ${len(update_params) + 1}")
            update_params.append(json.dumps(goal_update.parameters))
        
        if goal_update.start_date is not None:
            update_values.append(f"start_date = ${len(update_params) + 1}")
            update_params.append(goal_update.start_date)
        
        if goal_update.end_date is not None:
            update_values.append(f"end_date = ${len(update_params) + 1}")
            update_params.append(goal_update.end_date)
        
        if goal_update.status is not None:
            update_values.append(f"status = ${len(update_params) + 1}")
            update_params.append(goal_update.status)
        
        if goal_update.priority is not None:
            update_values.append(f"priority = ${len(update_params) + 1}")
            update_params.append(goal_update.priority)
        
        if goal_update.metadata is not None:
            update_values.append(f"metadata = ${len(update_params) + 1}")
            update_params.append(json.dumps(goal_update.metadata))
        
        # Always update the updated_at timestamp
        update_values.append("updated_at = NOW()")
        
        # If no fields to update, return the existing goal
        if not update_params:
            return goal
        
        # Build and execute the update query
        query = f"""
        UPDATE goals
        SET {", ".join(update_values)}
        WHERE id = ${len(update_params) + 1}
        RETURNING *
        """
        update_params.append(goal_id)
        
        row = await conn.fetchrow(query, *update_params)
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating goal: {str(e)}")

@app.post("/goals/{goal_id}/progress", response_model=GoalResponse)
async def update_goal_progress(
    goal_id: str, 
    current_value: float, 
    progress: float, 
    metrics: Optional[Dict[str, Any]] = {},
    conn = Depends(get_db_conn)
):
    """Update the progress of a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Call the update_goal_progress function
        await conn.execute(
            "SELECT update_goal_progress($1, $2, $3, $4)",
            goal_id,
            current_value,
            progress,
            json.dumps(metrics)
        )
        
        # Get the updated goal
        row = await conn.fetchrow(
            "SELECT * FROM goals WHERE id = $1",
            goal_id
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating goal progress: {str(e)}")

@app.get("/goals/{goal_id}/metrics", response_model=List[GoalMetricResponse])
async def get_goal_metrics(
    goal_id: str, 
    limit: int = 100,
    conn = Depends(get_db_conn)
):
    """Get metrics for a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Get the metrics
        rows = await conn.fetch(
            """
            SELECT * FROM goal_metrics 
            WHERE goal_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
            """,
            goal_id,
            limit
        )
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal metrics: {str(e)}")

@app.post("/goal-dependencies", response_model=GoalDependencyResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_dependency(dependency: GoalDependencyCreate, conn = Depends(get_db_conn)):
    """Create a dependency between goals"""
    try:
        # Check if both goals exist
        goal = await find_goal_by_id(conn, dependency.goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        depends_on_goal = await find_goal_by_id(conn, dependency.depends_on_goal_id)
        if not depends_on_goal:
            raise HTTPException(status_code=404, detail="Dependency goal not found")
        
        # Prevent creating a dependency on the same goal
        if dependency.goal_id == dependency.depends_on_goal_id:
            raise HTTPException(status_code=400, detail="A goal cannot depend on itself")
        
        # Check for existing dependency
        existing = await conn.fetchrow(
            """
            SELECT * FROM goal_dependencies
            WHERE goal_id = $1 AND depends_on_goal_id = $2
            """,
            dependency.goal_id,
            dependency.depends_on_goal_id
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="Dependency already exists")
        
        # Check for circular dependencies
        circular = await conn.fetchrow(
            """
            SELECT * FROM goal_dependencies
            WHERE goal_id = $1 AND depends_on_goal_id = $2
            """,
            dependency.depends_on_goal_id,
            dependency.goal_id
        )
        
        if circular:
            raise HTTPException(status_code=400, detail="Circular dependency detected")
        
        # Create the dependency
        row = await conn.fetchrow(
            """
            INSERT INTO goal_dependencies (goal_id, depends_on_goal_id, dependency_type)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            dependency.goal_id,
            dependency.depends_on_goal_id,
            dependency.dependency_type
        )
        
        return row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating goal dependency: {str(e)}")

@app.delete("/goal-dependencies/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_dependency(dependency_id: str, conn = Depends(get_db_conn)):
    """Delete a goal dependency"""
    try:
        # Check if the dependency exists
        row = await conn.fetchrow(
            "SELECT * FROM goal_dependencies WHERE id = $1",
            dependency_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Goal dependency not found")
        
        # Delete the dependency
        await conn.execute(
            "DELETE FROM goal_dependencies WHERE id = $1",
            dependency_id
        )
        
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting goal dependency: {str(e)}")

@app.get("/goals/{goal_id}/dependencies", response_model=List[GoalDependencyResponse])
async def get_goal_dependencies(goal_id: str, conn = Depends(get_db_conn)):
    """Get all dependencies for a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Get the dependencies
        rows = await conn.fetch(
            """
            SELECT * FROM goal_dependencies
            WHERE goal_id = $1 OR depends_on_goal_id = $1
            ORDER BY created_at
            """,
            goal_id
        )
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal dependencies: {str(e)}")

@app.post("/goal-actions", response_model=GoalActionResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_action(action: GoalActionCreate, conn = Depends(get_db_conn)):
    """Create an action for a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, action.goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # If agent_id is provided, check if it exists
        if action.agent_id:
            agent = await conn.fetchrow(
                "SELECT * FROM agents WHERE id = $1",
                action.agent_id
            )
            
            if agent is None:
                raise HTTPException(status_code=404, detail="Agent not found")
        
        # Create the action
        row = await conn.fetchrow(
            """
            INSERT INTO goal_actions (goal_id, agent_id, action_type, parameters)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            action.goal_id,
            action.agent_id,
            action.action_type,
            json.dumps(action.parameters)
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating goal action: {str(e)}")

@app.get("/goals/{goal_id}/actions", response_model=List[GoalActionResponse])
async def get_goal_actions(
    goal_id: str, 
    status: Optional[str] = None,
    limit: int = 100,
    conn = Depends(get_db_conn)
):
    """Get actions for a goal"""
    try:
        # Check if the goal exists
        goal = await find_goal_by_id(conn, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Build the query
        query = "SELECT * FROM goal_actions WHERE goal_id = $1"
        params = [goal_id]
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        # Get the actions
        rows = await conn.fetch(query, *params)
        
        return [row_to_dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving goal actions: {str(e)}")

@app.put("/goal-actions/{action_id}/execute", response_model=GoalActionResponse)
async def execute_goal_action(
    action_id: str,
    result: Dict[str, Any],
    conn = Depends(get_db_conn)
):
    """Mark a goal action as executed with results"""
    try:
        # Check if the action exists
        row = await conn.fetchrow(
            "SELECT * FROM goal_actions WHERE id = $1",
            action_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Goal action not found")
        
        # Update the action
        row = await conn.fetchrow(
            """
            UPDATE goal_actions
            SET status = 'completed', result = $1, executed_at = NOW(), updated_at = NOW()
            WHERE id = $2
            RETURNING *
            """,
            json.dumps(result),
            action_id
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing goal action: {str(e)}")

@app.put("/goal-actions/{action_id}/fail", response_model=GoalActionResponse)
async def fail_goal_action(
    action_id: str,
    reason: str,
    conn = Depends(get_db_conn)
):
    """Mark a goal action as failed with a reason"""
    try:
        # Check if the action exists
        row = await conn.fetchrow(
            "SELECT * FROM goal_actions WHERE id = $1",
            action_id
        )
        
        if row is None:
            raise HTTPException(status_code=404, detail="Goal action not found")
        
        # Update the action
        row = await conn.fetchrow(
            """
            UPDATE goal_actions
            SET status = 'failed', result = $1, executed_at = NOW(), updated_at = NOW()
            WHERE id = $2
            RETURNING *
            """,
            json.dumps({"error": reason}),
            action_id
        )
        
        return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error failing goal action: {str(e)}")

# Status endpoint
@app.get("/status")
async def get_status():
    """Get API status"""
    return {
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/farms",
            "/agents",
            "/farms/{farm_id}/agents",
            "/farms/{farm_id}/vault/balances"
        ]
    }

# Analytics endpoints
@app.get("/farms/{farm_id}/analytics/assets")
async def get_asset_performance(farm_id: str, conn = Depends(get_db_conn)):
    """Get asset performance data for a farm."""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Find vault for this farm
        vault = await find_vault_by_farm_id(conn, farm_id)
        if not vault:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        # Get balances from vault
        balances = await conn.fetch(
            """
            SELECT * FROM vault_balances 
            WHERE vault_id = $1
            ORDER BY asset_symbol
            """,
            vault["id"]
        )
        
        # If there are no balances, return empty list
        if not balances:
            return []
        
        # Convert to list of dictionaries
        balance_dicts = [row_to_dict(row) for row in balances]
        
        # For each asset, calculate performance metrics
        # In a real app, this would use external market data
        # Here we'll generate some realistic data
        asset_performance = []
        
        total_value = sum(float(balance["amount"]) for balance in balance_dicts)
        
        for balance in balance_dicts:
            symbol = balance["asset_symbol"]
            amount = float(balance["amount"])
            
            # Random performance values (could be replaced with real market data)
            perf_7d = np.random.normal(3, 5)  # Mean 3%, std dev 5%
            perf_30d = perf_7d * 2 + np.random.normal(2, 3)  # Correlated with 7d
            
            # Mock value based on some price (in a real app, use market price)
            price = 0
            if symbol == "BTC":
                price = 35000
            elif symbol == "ETH":
                price = 1800
            elif symbol == "SOL":
                price = 25
            elif symbol == "USDC" or symbol == "USDT":
                price = 1
            else:
                price = np.random.uniform(10, 100)  # Random price for other assets
            
            value = amount * price
            
            # Calculate allocation percentage
            allocation = (value / total_value * 100) if total_value > 0 else 0
            
            asset_performance.append({
                "symbol": symbol,
                "amount": amount,
                "allocation": round(allocation, 2),
                "performance_7d": round(perf_7d, 2),
                "performance_30d": round(perf_30d, 2),
                "value": round(value, 2)
            })
        
        return asset_performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving asset performance: {str(e)}")

@app.get("/farms/{farm_id}/analytics/balances")
async def get_historical_balances(
    farm_id: str, 
    timeframe: str = "30d",
    conn = Depends(get_db_conn)
):
    """Get historical balance data for a farm."""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Find vault for this farm
        vault = await find_vault_by_farm_id(conn, farm_id)
        if not vault:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        # Generate time range based on timeframe
        days = 30
        if timeframe == "7d":
            days = 7
        elif timeframe == "90d":
            days = 90
        elif timeframe == "all":
            # Use farm creation date for "all"
            farm_created = datetime.fromisoformat(farm["created_at"].replace('Z', '+00:00'))
            days = (datetime.now() - farm_created).days + 1
        
        # Get transaction logs
        # In a real app, you'd aggregate actual historical balance snapshots
        transactions = await conn.fetch(
            """
            SELECT * FROM transaction_logs 
            WHERE farm_id = $1
            ORDER BY executed_at
            """,
            farm_id
        )
        
        # Convert to pandas for easier time series manipulation
        tx_dicts = [row_to_dict(row) for row in transactions]
        
        # If there are no transactions, generate some mock data
        if not tx_dicts:
            # Generate synthetic daily balance data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Start with random balance and add some realistic growth/fluctuation
            balance = np.random.uniform(10000, 100000)
            
            balances = []
            current_date = start_date
            
            while current_date <= end_date:
                # Daily change: normal distribution with upward bias
                daily_change = np.random.normal(0.002, 0.015)  # Mean 0.2%, std dev 1.5%
                balance *= (1 + daily_change)
                
                balances.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "total": round(balance)
                })
                
                current_date += timedelta(days=1)
            
            return balances
        
        # In a real app, we'd aggregate actual historical balance data
        # For now, we'll reconstruct it from transactions
        
        # Convert to pandas DataFrame for time series analysis
        df = pd.DataFrame(tx_dicts)
        df['executed_at'] = pd.to_datetime(df['executed_at'])
        df['date'] = df['executed_at'].dt.date
        df['amount'] = df['amount'].astype(float)
        
        # Adjust amounts based on transaction type (deposits positive, withdrawals negative)
        df['adjusted_amount'] = df.apply(
            lambda row: row['amount'] if row['transaction_type'].lower() in ['deposit', 'buy'] 
            else -row['amount'], 
            axis=1
        )
        
        # Group by date and sum the adjusted amounts
        daily_changes = df.groupby('date')['adjusted_amount'].sum().reset_index()
        
        # Get start and end dates
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Create a complete date range
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        date_df = pd.DataFrame({'date': date_range})
        date_df['date'] = date_df['date'].dt.date
        
        # Merge with daily changes
        result_df = pd.merge(date_df, daily_changes, on='date', how='left')
        result_df['adjusted_amount'].fillna(0, inplace=True)
        
        # Calculate cumulative balance
        # Assuming initial balance of 50000 (in a real app, you'd have an actual starting balance)
        start_balance = 50000
        result_df['total'] = start_balance + result_df['adjusted_amount'].cumsum()
        
        # Format for response
        historical_balances = result_df[['date', 'total']].to_dict(orient='records')
        
        # Format dates as strings
        for entry in historical_balances:
            entry['date'] = entry['date'].strftime('%Y-%m-%d')
            entry['total'] = round(entry['total'])
        
        return historical_balances
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving historical balances: {str(e)}")

@app.get("/farms/{farm_id}/analytics/profit-loss")
async def get_profit_loss(
    farm_id: str, 
    period: str = "monthly",
    conn = Depends(get_db_conn)
):
    """Get profit/loss data for a farm."""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # In a real app, you'd calculate actual profit/loss from transactions
        # For now, we'll generate synthetic data
        
        # Generate 6 periods of data
        periods = 6
        
        if period == "monthly":
            # Last 6 months
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            current_month = datetime.now().month
            months = [(current_month - i - 1) % 12 + 1 for i in range(periods)]
            months.reverse()
            
            profit_loss = []
            for month_num in months:
                month_name = month_names[month_num - 1]
                
                # Generate realistic values with correlation
                # Trading is hard, so profit should be a bit less than loss on average
                profit = max(0, np.random.normal(3000, 1500))
                loss = max(0, np.random.normal(3300, 1800))
                
                profit_loss.append({
                    "month": month_name,
                    "profit": round(profit),
                    "loss": round(loss)
                })
        
        elif period == "weekly":
            # Last 6 weeks
            weeks = list(range(1, periods + 1))
            
            profit_loss = []
            for week in weeks:
                profit = max(0, np.random.normal(700, 400))
                loss = max(0, np.random.normal(800, 450))
                
                profit_loss.append({
                    "week": f"Week {week}",
                    "profit": round(profit),
                    "loss": round(loss)
                })
        
        elif period == "daily":
            # Last 6 days
            day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            current_day = datetime.now().weekday()
            days = [(current_day - i) % 7 for i in range(periods)]
            days.reverse()
            
            profit_loss = []
            for day_num in days:
                day_name = day_names[day_num]
                
                profit = max(0, np.random.normal(120, 80))
                loss = max(0, np.random.normal(130, 90))
                
                profit_loss.append({
                    "day": day_name,
                    "profit": round(profit),
                    "loss": round(loss)
                })
                
        return profit_loss
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving profit/loss data: {str(e)}")

@app.get("/farms/{farm_id}/analytics")
async def get_farm_analytics(
    farm_id: str, 
    timeframe: str = "30d",
    conn = Depends(get_db_conn)
):
    """Get comprehensive analytics for a farm."""
    try:
        # Check if the farm exists
        farm = await find_farm_by_id(conn, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Fetch all analytics data in parallel
        assets = await get_asset_performance(farm_id, conn)
        balances = await get_historical_balances(farm_id, timeframe, conn)
        profit_loss = await get_profit_loss(farm_id, "monthly", conn)
        
        # Calculate overall metrics
        total_value = sum(asset["value"] for asset in assets) if assets else 0
        
        # Calculate performance from historical balances
        performance_7d = 0
        performance_30d = 0
        
        if len(balances) > 7:
            current = balances[-1]["total"]
            week_ago = balances[-8]["total"]
            performance_7d = ((current - week_ago) / week_ago * 100) if week_ago > 0 else 0
        
        if len(balances) > 30:
            current = balances[-1]["total"]
            month_ago = balances[-31]["total"]
            performance_30d = ((current - month_ago) / month_ago * 100) if month_ago > 0 else 0
        
        # Return consolidated analytics
        return {
            "overview": {
                "total_value": total_value,
                "performance_7d": round(performance_7d, 2),
                "performance_30d": round(performance_30d, 2),
            },
            "assets": assets,
            "historical_balances": balances,
            "profit_loss": profit_loss
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving farm analytics: {str(e)}")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 