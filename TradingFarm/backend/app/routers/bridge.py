from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..db import get_db, get_supabase_client
from sqlalchemy.orm import Session
import logging
from ..config import settings
import httpx
import json
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Models for LayerZero bridging
class BridgeQuoteRequest(BaseModel):
    from_chain_id: int
    to_chain_id: int
    token_address: str
    amount: str  # String representation of the amount
    sender_address: str

class BridgeExecuteRequest(BaseModel):
    from_chain_id: int
    to_chain_id: int
    token_address: str
    amount: str
    sender_address: str
    recipient_address: str
    wallet_id: Optional[str] = None
    farm_id: Optional[str] = None

class BridgeStatusRequest(BaseModel):
    tx_hash: str
    from_chain_id: int

class BridgeQuoteResponse(BaseModel):
    fee: str
    estimated_time: int  # in seconds
    from_token_price: Optional[str] = None
    to_token_price: Optional[str] = None
    success: bool
    error: Optional[str] = None

class BridgeExecuteResponse(BaseModel):
    tx_hash: Optional[str] = None
    status: str
    bridge_id: Optional[str] = None
    success: bool
    error: Optional[str] = None

class BridgeStatusResponse(BaseModel):
    status: str
    tx_hash: str
    from_chain_id: int
    to_chain_id: int
    confirmation_time: Optional[str] = None
    success: bool
    error: Optional[str] = None

# Chain ID to name mapping
CHAIN_NAMES = {
    1: "Ethereum",
    10: "Optimism",
    42161: "Arbitrum",
    137: "Polygon",
    56: "BNB Chain",
    43114: "Avalanche",
    8453: "Base",
    534352: "Scroll",
    59144: "Linea",
    324: "zkSync Era"
}

class LayerZeroClient:
    """
    Client for interacting with the LayerZero API
    """
    def __init__(self, api_key: str = None, endpoint: str = None):
        self.api_key = api_key or settings.LAYERZERO_API_KEY
        self.endpoint = endpoint or settings.LAYERZERO_ENDPOINT
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_bridge_quote(self, request: BridgeQuoteRequest) -> Dict[str, Any]:
        """
        Get a quote for bridging tokens across chains
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.endpoint}/quote",
                    headers=self.headers,
                    json={
                        "srcChainId": request.from_chain_id,
                        "dstChainId": request.to_chain_id,
                        "tokenAddress": request.token_address,
                        "amount": request.amount,
                        "sender": request.sender_address
                    },
                    timeout=30.0  # Extended timeout for bridge operations
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "fee": data.get("fee", "0"),
                        "estimated_time": data.get("estimatedTime", 300),  # default 5 mins
                        "from_token_price": data.get("srcTokenPrice"),
                        "to_token_price": data.get("dstTokenPrice"),
                        "success": True
                    }
                else:
                    logger.error(f"LayerZero API error: {response.text}")
                    return {
                        "success": False,
                        "error": f"API Error: {response.status_code} - {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error getting bridge quote: {e}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
    
    async def execute_bridge(self, request: BridgeExecuteRequest) -> Dict[str, Any]:
        """
        Execute a bridge transaction
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.endpoint}/bridge",
                    headers=self.headers,
                    json={
                        "srcChainId": request.from_chain_id,
                        "dstChainId": request.to_chain_id,
                        "tokenAddress": request.token_address,
                        "amount": request.amount,
                        "sender": request.sender_address,
                        "recipient": request.recipient_address
                    },
                    timeout=60.0  # Extended timeout for bridge executions
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "tx_hash": data.get("txHash"),
                        "status": "pending",
                        "bridge_id": data.get("bridgeId"),
                        "success": True
                    }
                else:
                    logger.error(f"LayerZero API error: {response.text}")
                    return {
                        "status": "failed",
                        "success": False,
                        "error": f"API Error: {response.status_code} - {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error executing bridge: {e}")
            return {
                "status": "failed",
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
    
    async def get_bridge_status(self, tx_hash: str, from_chain_id: int) -> Dict[str, Any]:
        """
        Check the status of a bridge transaction
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.endpoint}/status/{from_chain_id}/{tx_hash}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": data.get("status", "unknown"),
                        "tx_hash": tx_hash,
                        "from_chain_id": from_chain_id,
                        "to_chain_id": data.get("dstChainId"),
                        "confirmation_time": data.get("confirmationTime"),
                        "success": True
                    }
                else:
                    logger.error(f"LayerZero API error: {response.text}")
                    return {
                        "status": "unknown",
                        "tx_hash": tx_hash,
                        "from_chain_id": from_chain_id,
                        "success": False,
                        "error": f"API Error: {response.status_code} - {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error getting bridge status: {e}")
            return {
                "status": "unknown",
                "tx_hash": tx_hash,
                "from_chain_id": from_chain_id,
                "success": False,
                "error": f"Connection error: {str(e)}"
            }

@router.post("/quote", response_model=BridgeQuoteResponse)
async def get_bridge_quote(
    request: BridgeQuoteRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Get a quote for bridging tokens across chains
    """
    # In development mode, we can use a mock response for testing
    if settings.ENVIRONMENT != "production" and not settings.LAYERZERO_API_KEY:
        logger.info("Using mock bridge quote in development mode")
        return BridgeQuoteResponse(
            fee="0.001",
            estimated_time=300,  # 5 minutes
            from_token_price="1.0",
            to_token_price="0.998",  # Slight price difference between chains
            success=True
        )
    
    # Initialize LayerZero client
    client = LayerZeroClient()
    
    # Get bridge quote
    result = await client.get_bridge_quote(request)
    
    # Return response
    if result["success"]:
        return BridgeQuoteResponse(**result)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

@router.post("/execute", response_model=BridgeExecuteResponse)
async def execute_bridge(
    request: BridgeExecuteRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Execute a bridge transaction
    """
    # Validate farm_id if provided
    if request.farm_id:
        supabase = get_supabase_client()
        farm_result = supabase.table("farms").select("*").eq("id", request.farm_id).execute()
        if not farm_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {request.farm_id} not found"
            )
    
    # Validate wallet if provided
    if request.wallet_id:
        supabase = get_supabase_client()
        wallet_result = supabase.table("wallets").select("*").eq("id", request.wallet_id).execute()
        if not wallet_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wallet with ID {request.wallet_id} not found"
            )
    
    # In development mode, we can use a mock response for testing
    if settings.ENVIRONMENT != "production" and not settings.LAYERZERO_API_KEY:
        logger.info("Using mock bridge execution in development mode")
        
        # Generate a realistic random tx hash
        import random
        import string
        tx_hash = "0x" + ''.join(random.choices(string.hexdigits, k=64)).lower()
        
        # Create a record in the bridges table
        supabase = get_supabase_client()
        bridge_data = {
            "from_chain_id": request.from_chain_id,
            "to_chain_id": request.to_chain_id,
            "token_address": request.token_address,
            "amount": request.amount,
            "sender_address": request.sender_address,
            "recipient_address": request.recipient_address,
            "tx_hash": tx_hash,
            "status": "pending",
            "farm_id": request.farm_id,
            "wallet_id": request.wallet_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        bridge_result = supabase.table("bridges").insert(bridge_data).execute()
        bridge_id = bridge_result.data[0]["id"] if bridge_result.data else None
        
        return BridgeExecuteResponse(
            tx_hash=tx_hash,
            status="pending",
            bridge_id=bridge_id,
            success=True
        )
    
    # Initialize LayerZero client
    client = LayerZeroClient()
    
    # Execute bridge
    result = await client.execute_bridge(request)
    
    # If successful, store the transaction in the database
    if result["success"] and result.get("tx_hash"):
        supabase = get_supabase_client()
        bridge_data = {
            "from_chain_id": request.from_chain_id,
            "to_chain_id": request.to_chain_id,
            "token_address": request.token_address,
            "amount": request.amount,
            "sender_address": request.sender_address,
            "recipient_address": request.recipient_address,
            "tx_hash": result["tx_hash"],
            "status": result["status"],
            "farm_id": request.farm_id,
            "wallet_id": request.wallet_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        bridge_result = supabase.table("bridges").insert(bridge_data).execute()
        
        # Update result with bridge_id if available
        if bridge_result.data:
            result["bridge_id"] = bridge_result.data[0]["id"]
    
    # Return response
    if result["success"]:
        return BridgeExecuteResponse(**result)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Unknown error during bridge execution")
        )

@router.post("/status", response_model=BridgeStatusResponse)
async def get_bridge_status(
    request: BridgeStatusRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Check the status of a bridge transaction
    """
    # In development mode, we can use a mock response for testing
    if settings.ENVIRONMENT != "production" and not settings.LAYERZERO_API_KEY:
        logger.info("Using mock bridge status in development mode")
        
        # Get the bridge record from the database
        supabase = get_supabase_client()
        bridge_result = supabase.table("bridges").select("*").eq("tx_hash", request.tx_hash).execute()
        
        if bridge_result.data:
            bridge = bridge_result.data[0]
            
            # Simulate status progression for demo purposes
            import random
            statuses = ["pending", "confirming", "confirmed", "completed"]
            current_status_idx = statuses.index(bridge.get("status", "pending"))
            
            # 20% chance of status progression in development mode
            if random.random() < 0.2 and current_status_idx < len(statuses) - 1:
                new_status = statuses[current_status_idx + 1]
                
                # Update the status in the database
                supabase.table("bridges").update({"status": new_status}).eq("tx_hash", request.tx_hash).execute()
                
                # Use the new status for the response
                bridge["status"] = new_status
            
            return BridgeStatusResponse(
                status=bridge.get("status", "pending"),
                tx_hash=request.tx_hash,
                from_chain_id=bridge.get("from_chain_id", request.from_chain_id),
                to_chain_id=bridge.get("to_chain_id"),
                confirmation_time=bridge.get("updated_at"),
                success=True
            )
        else:
            return BridgeStatusResponse(
                status="not_found",
                tx_hash=request.tx_hash,
                from_chain_id=request.from_chain_id,
                to_chain_id=0,  # Unknown
                success=False,
                error="Transaction not found in database"
            )
    
    # Initialize LayerZero client
    client = LayerZeroClient()
    
    # Get bridge status
    result = await client.get_bridge_status(request.tx_hash, request.from_chain_id)
    
    # If successful, update the transaction status in the database
    if result["success"] and result.get("status") != "unknown":
        supabase = get_supabase_client()
        supabase.table("bridges").update({
            "status": result["status"],
            "updated_at": datetime.utcnow().isoformat()
        }).eq("tx_hash", request.tx_hash).execute()
    
    # Return response
    if result["success"]:
        return BridgeStatusResponse(**result)
    else:
        # Even if the API call fails, try to get status from our database
        supabase = get_supabase_client()
        bridge_result = supabase.table("bridges").select("*").eq("tx_hash", request.tx_hash).execute()
        
        if bridge_result.data:
            bridge = bridge_result.data[0]
            return BridgeStatusResponse(
                status=bridge.get("status", "pending"),
                tx_hash=request.tx_hash,
                from_chain_id=bridge.get("from_chain_id", request.from_chain_id),
                to_chain_id=bridge.get("to_chain_id"),
                confirmation_time=bridge.get("updated_at"),
                success=True
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Unknown error checking bridge status")
            )

@router.get("/chains", response_model=Dict[str, Any])
async def get_supported_chains():
    """
    Get a list of supported chains for bridging
    """
    return {
        "chains": [
            {"id": chain_id, "name": name} 
            for chain_id, name in CHAIN_NAMES.items()
        ],
        "success": True
    }
