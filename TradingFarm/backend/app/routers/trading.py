from fastapi import APIRouter, Depends, HTTPException, Header, Query, Body, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import logging
import uuid
from datetime import datetime

from app.models.trading import (
    OrderRequest,
    OrderResponse,
    OrderStatus,
    Order,
    Position,
    RiskProfile,
    MarketData,
    WalletBalance
)
from app.services.order_management import order_manager
from app.services.risk_management import risk_manager
from app.services.exchange_connector import exchange_connector
from app.db import get_db_connection

router = APIRouter(
    prefix="/trading",
    tags=["trading"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Unauthorized"}
    }
)

logger = logging.getLogger(__name__)


async def get_user_id(x_user_id: Optional[str] = Header(None)):
    """Extract and verify user ID from request headers"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID is required")
    return x_user_id


# Order Management Endpoints
@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_request: OrderRequest,
    user_id: str = Depends(get_user_id)
):
    """Create a new order"""
    try:
        success, response, error = await order_manager.create_order(user_id, order_request)
        
        if not success:
            raise HTTPException(status_code=400, detail=error or "Failed to create order")
        
        return response
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders", response_model=List[Order])
async def get_orders(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    user_id: str = Depends(get_user_id)
):
    """Get list of orders with optional filtering"""
    try:
        orders = await order_manager.get_orders(user_id, agent_id, status, limit)
        return orders
    except Exception as e:
        logger.error(f"Error fetching orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(
    order_id: int,
    user_id: str = Depends(get_user_id)
):
    """Get details for a specific order"""
    try:
        order = await order_manager.get_order(user_id, order_id)
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: int,
    user_id: str = Depends(get_user_id)
):
    """Cancel an open order"""
    try:
        success, error = await order_manager.cancel_order(user_id, order_id)
        
        if not success:
            raise HTTPException(status_code=400, detail=error or "Failed to cancel order")
        
        return {"message": "Order cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/orders/{order_id}/sync")
async def sync_order_status(
    order_id: int,
    user_id: str = Depends(get_user_id)
):
    """Sync order status with exchange"""
    try:
        success, error = await order_manager.sync_order_status(user_id, order_id)
        
        if not success:
            raise HTTPException(status_code=400, detail=error or "Failed to sync order status")
        
        return {"message": "Order status synced successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Position Management Endpoints
@router.get("/positions", response_model=List[Position])
async def get_positions(
    agent_id: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    """Get current positions"""
    try:
        async with get_db_connection() as conn:
            query = """
                SELECT * FROM positions
                WHERE user_id = $1
            """
            params = [user_id]
            
            if agent_id:
                query += f" AND agent_id = ${len(params) + 1}"
                params.append(agent_id)
                
            if symbol:
                query += f" AND symbol = ${len(params) + 1}"
                params.append(symbol)
                
            rows = await conn.fetch(query, *params)
            
            positions = []
            for row in rows:
                positions.append(Position(
                    id=row['id'],
                    user_id=row['user_id'],
                    agent_id=row['agent_id'],
                    symbol=row['symbol'],
                    quantity=row['quantity'],
                    avg_price=row['avg_price'],
                    unrealised_pnl=row['unrealised_pnl'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                ))
            
            return positions
    except Exception as e:
        logger.error(f"Error fetching positions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/positions/update-pnl")
async def update_positions_pnl(
    user_id: str = Depends(get_user_id)
):
    """Update unrealized PnL for all positions"""
    try:
        success = await risk_manager.update_positions_pnl(user_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update positions PnL")
        
        return {"message": "Positions PnL updated successfully"}
    except Exception as e:
        logger.error(f"Error updating positions PnL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Risk Management Endpoints
@router.get("/risk-profile", response_model=RiskProfile)
async def get_risk_profile(
    agent_id: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    """Get risk profile for user/agent"""
    try:
        profile = await risk_manager.get_risk_profile(user_id, agent_id)
        
        if not profile:
            # Return default profile
            profile = RiskProfile(
                user_id=user_id,
                agent_id=agent_id,
                max_position_pct=0.05,
                max_daily_loss=0.02,
                circuit_breaker=False
            )
        
        return profile
    except Exception as e:
        logger.error(f"Error fetching risk profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-profile", response_model=RiskProfile)
async def update_risk_profile(
    risk_profile: RiskProfile,
    user_id: str = Depends(get_user_id)
):
    """Create or update risk profile"""
    try:
        # Ensure user_id matches authenticated user
        if risk_profile.user_id != user_id:
            raise HTTPException(status_code=400, detail="User ID in profile does not match authenticated user")
        
        success = await risk_manager.update_risk_profile(risk_profile)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update risk profile")
        
        # Return the updated profile
        updated_profile = await risk_manager.get_risk_profile(user_id, risk_profile.agent_id)
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating risk profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Market Data Endpoints
@router.get("/market-data/{exchange}/{symbol}", response_model=MarketData)
async def get_market_data(
    exchange: str,
    symbol: str,
    user_id: str = Depends(get_user_id)
):
    """Get current market data for a trading pair"""
    try:
        market_data = await exchange_connector.get_market_data(user_id, exchange, symbol)
        
        if not market_data:
            raise HTTPException(status_code=404, detail=f"Market data not available for {symbol} on {exchange}")
        
        return market_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Wallet Endpoints
@router.get("/balances/{exchange}", response_model=List[WalletBalance])
async def get_wallet_balances(
    exchange: str,
    user_id: str = Depends(get_user_id)
):
    """Get wallet balances from an exchange"""
    try:
        balances = await exchange_connector.get_wallet_balances(user_id, exchange)
        
        if balances is None:
            raise HTTPException(status_code=400, detail=f"Failed to fetch balances from {exchange}")
        
        return balances
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching wallet balances: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
