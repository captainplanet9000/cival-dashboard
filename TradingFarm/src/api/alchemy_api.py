"""
Alchemy API endpoints for the Trading Farm
Provides access to enhanced blockchain functionality through FastAPI
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel, Field

from ..blockchain.alchemy_integration import AlchemyIntegration
from ..agents.eliza_wallet_alchemy import EnhancedWalletManager
from ..agents.bossman_alchemy import BossmanController

logger = logging.getLogger(__name__)

# API models
class WalletCreationRequest(BaseModel):
    name: str = Field(..., description="Wallet name")
    network: str = Field("ethereum", description="Blockchain network")
    network_type: str = Field("goerli", description="Network type (mainnet/testnet)")
    password: Optional[str] = Field(None, description="Optional password for encryption")
    private_key: Optional[str] = Field(None, description="Optional private key for importing")

class WalletAssignmentRequest(BaseModel):
    wallet_id: str = Field(..., description="Wallet ID")
    agent_id: str = Field(..., description="Agent ID")

class TransactionRequest(BaseModel):
    wallet_id: str = Field(..., description="Wallet ID")
    to_address: str = Field(..., description="Recipient address")
    amount: float = Field(..., description="Amount to send")
    password: Optional[str] = Field(None, description="Password for wallet decryption if needed")
    token_address: Optional[str] = Field(None, description="Token contract address (if sending tokens)")
    network: Optional[str] = Field(None, description="Blockchain network (overrides wallet's network)")
    network_type: Optional[str] = Field(None, description="Network type (overrides wallet's network type)")
    gas_speed: str = Field("average", description="Gas price strategy (slow, average, fast)")

class BossmanCreateRequest(BaseModel):
    agent_name: str = Field("Bossman", description="Agent name")
    wallet_name: Optional[str] = Field("Bossman Wallet", description="Wallet name")
    network: str = Field("ethereum", description="Blockchain network")
    network_type: str = Field("goerli", description="Network type (mainnet/testnet)")

class BossmanCommandRequest(BaseModel):
    agent_id: str = Field(..., description="Target agent ID")
    command: str = Field(..., description="Command to execute")
    parameters: Dict[str, Any] = Field({}, description="Command parameters")

class MonitorAgentsRequest(BaseModel):
    agent_ids: List[str] = Field(..., description="List of agent IDs to monitor")

class MarketMonitorRequest(BaseModel):
    tokens: Optional[List[str]] = Field(None, description="List of token addresses to monitor")
    networks: Optional[List[str]] = Field(None, description="List of networks to monitor")

class RebalanceRequest(BaseModel):
    source_agent_id: str = Field(..., description="Source agent ID")
    target_agent_id: str = Field(..., description="Target agent ID")
    amount: Optional[float] = Field(None, description="Amount to transfer (if None, will calculate optimal amount)")
    token_address: Optional[str] = Field(None, description="Token address (if None, will transfer native token)")

class StrategyRequest(BaseModel):
    agent_id: str = Field(..., description="Agent ID")
    strategy: str = Field(..., description="Strategy name")
    parameters: Dict[str, Any] = Field({}, description="Strategy parameters")

class RiskUpdateRequest(BaseModel):
    risk_level: str = Field(..., description="Risk level (low, medium, high)")
    parameters: Dict[str, Any] = Field({}, description="Risk parameters")

# Initialize API router
alchemy_router = APIRouter(
    prefix="/alchemy",
    tags=["alchemy"],
    responses={404: {"description": "Not found"}},
)

# Store instances as module variables
_wallet_manager = None
_bossman_controller = None
_alchemy_integrations = {}

def initialize_alchemy_api(eliza_bridge, config_path: str = "config/alchemy_config.json"):
    """Initialize the Alchemy API with necessary components"""
    global _wallet_manager, _bossman_controller
    
    # Initialize wallet manager
    _wallet_manager = EnhancedWalletManager(config_path=config_path)
    
    # Initialize Bossman controller
    _bossman_controller = BossmanController(
        eliza_bridge=eliza_bridge,
        wallet_manager=_wallet_manager,
        config_path=config_path
    )
    
    logger.info("Alchemy API endpoints initialized")
    return alchemy_router

def get_wallet_manager():
    """Dependency to get wallet manager instance"""
    global _wallet_manager
    if not _wallet_manager:
        raise HTTPException(status_code=500, detail="Wallet manager not initialized")
    return _wallet_manager

def get_bossman_controller():
    """Dependency to get Bossman controller instance"""
    global _bossman_controller
    if not _bossman_controller:
        raise HTTPException(status_code=500, detail="Bossman controller not initialized")
    return _bossman_controller

# Enhanced wallet management endpoints
@alchemy_router.post("/wallets", response_model=Dict[str, Any])
async def create_wallet(
    request: WalletCreationRequest,
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Create a new wallet with enhanced blockchain capabilities"""
    try:
        wallet_info = wallet_manager.create_wallet(
            name=request.name,
            password=request.password,
            private_key=request.private_key,
            network=request.network,
            network_type=request.network_type
        )
        
        return {
            "success": True,
            "wallet": wallet_info
        }
    except Exception as e:
        logger.error(f"Error creating wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets", response_model=Dict[str, Any])
async def list_wallets(
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """List all wallets with their balances and network information"""
    try:
        wallets = wallet_manager.list_wallets()
        
        return {
            "success": True,
            "wallets": wallets
        }
    except Exception as e:
        logger.error(f"Error listing wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets/{wallet_id}", response_model=Dict[str, Any])
async def get_wallet(
    wallet_id: str = Path(..., description="Wallet ID"),
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Get detailed wallet information including tokens, NFTs, and recent transactions"""
    try:
        wallet_info = wallet_manager.get_wallet(wallet_id)
        
        if not wallet_info:
            raise HTTPException(status_code=404, detail=f"Wallet {wallet_id} not found")
        
        return {
            "success": True,
            "wallet": wallet_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting wallet {wallet_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.post("/wallets/assign", response_model=Dict[str, Any])
async def assign_wallet(
    request: WalletAssignmentRequest,
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Assign a wallet to an agent"""
    try:
        success = wallet_manager.assign_wallet_to_agent(
            wallet_id=request.wallet_id,
            agent_id=request.agent_id
        )
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to assign wallet {request.wallet_id} to agent {request.agent_id}"
            )
        
        return {
            "success": True,
            "message": f"Wallet {request.wallet_id} assigned to agent {request.agent_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets/agent/{agent_id}", response_model=Dict[str, Any])
async def get_agent_wallet(
    agent_id: str = Path(..., description="Agent ID"),
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Get wallet assigned to an agent"""
    try:
        wallet_info = wallet_manager.get_agent_wallet(agent_id)
        
        if not wallet_info:
            raise HTTPException(status_code=404, detail=f"No wallet found for agent {agent_id}")
        
        return {
            "success": True,
            "wallet": wallet_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent wallet for {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.post("/wallets/send", response_model=Dict[str, Any])
async def send_transaction(
    request: TransactionRequest,
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Send a transaction from a wallet"""
    try:
        tx_hash = wallet_manager.send_transaction(
            wallet_id=request.wallet_id,
            to_address=request.to_address,
            amount=request.amount,
            password=request.password,
            token_address=request.token_address,
            network=request.network,
            network_type=request.network_type,
            gas_speed=request.gas_speed
        )
        
        if not tx_hash:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send transaction from wallet {request.wallet_id}"
            )
        
        return {
            "success": True,
            "tx_hash": tx_hash,
            "message": f"Transaction sent from wallet {request.wallet_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets/{wallet_id}/tokens", response_model=Dict[str, Any])
async def get_token_balances(
    wallet_id: str = Path(..., description="Wallet ID"),
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Get token balances for a wallet"""
    try:
        tokens = wallet_manager.get_token_balances(wallet_id)
        
        return {
            "success": True,
            "wallet_id": wallet_id,
            "tokens": tokens
        }
    except Exception as e:
        logger.error(f"Error getting token balances for {wallet_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets/{wallet_id}/nfts", response_model=Dict[str, Any])
async def get_nft_balances(
    wallet_id: str = Path(..., description="Wallet ID"),
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Get NFT balances for a wallet"""
    try:
        nfts = wallet_manager.get_nft_balances(wallet_id)
        
        return {
            "success": True,
            "wallet_id": wallet_id,
            "nfts": nfts
        }
    except Exception as e:
        logger.error(f"Error getting NFT balances for {wallet_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@alchemy_router.get("/wallets/{wallet_id}/transactions", response_model=Dict[str, Any])
async def get_transaction_history(
    wallet_id: str = Path(..., description="Wallet ID"),
    limit: int = Query(100, description="Maximum number of transactions to retrieve"),
    wallet_manager: EnhancedWalletManager = Depends(get_wallet_manager)
):
    """Get transaction history for a wallet"""
    try:
        transactions = wallet_manager.get_transaction_history(wallet_id, limit=limit)
        
        return {
            "success": True,
            "wallet_id": wallet_id,
            "transactions": transactions
        }
    except Exception as e:
        logger.error(f"Error getting transaction history for {wallet_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
