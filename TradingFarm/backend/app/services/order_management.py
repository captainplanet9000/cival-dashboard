import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import uuid

from app.models.trading import (
    Order, 
    OrderRequest, 
    OrderResponse, 
    OrderStatus, 
    OrderType,
    Position
)
from app.services.exchange_connector import exchange_connector
from app.services.risk_management import risk_manager
from app.db import get_db_connection

logger = logging.getLogger(__name__)


class OrderManagementService:
    """
    Order Management Service handles the lifecycle of orders:
    - Creating new orders
    - Tracking order status
    - Updating positions
    - Syncing with exchange
    """
    
    async def create_order(self, user_id: str, order_request: OrderRequest) -> Tuple[bool, Optional[OrderResponse], Optional[str]]:
        """
        Create a new order after validating with risk management
        
        Args:
            user_id: ID of the user placing the order
            order_request: Order details
            
        Returns:
            Tuple of (success, order_response, error_message)
        """
        try:
            # Validate with risk management first
            allowed, risk_message = await risk_manager.validate_order(
                user_id, 
                order_request.agent_id, 
                order_request.exchange, 
                order_request.symbol, 
                order_request.side, 
                order_request.quantity
            )
            
            if not allowed:
                return False, None, f"Risk check failed: {risk_message}"
            
            # Create order record in database
            async with get_db_connection() as conn:
                order_id = await conn.fetchval(
                    """
                    INSERT INTO live_orders (
                        user_id, agent_id, exchange, symbol, side, 
                        type, price, quantity, status, executed_qty
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                    """,
                    user_id,
                    order_request.agent_id,
                    order_request.exchange,
                    order_request.symbol,
                    order_request.side.value,
                    order_request.type.value,
                    order_request.price,
                    order_request.quantity,
                    OrderStatus.PENDING.value,
                    0
                )
                
                # Create order object for exchange connector
                order = Order(
                    id=order_id,
                    user_id=user_id,
                    agent_id=order_request.agent_id,
                    exchange=order_request.exchange,
                    symbol=order_request.symbol,
                    side=order_request.side,
                    type=order_request.type,
                    price=order_request.price,
                    quantity=order_request.quantity,
                    status=OrderStatus.PENDING
                )
                
                # Get exchange credentials
                creds_row = await conn.fetchrow(
                    """
                    SELECT id, exchange, api_key_encrypted, api_secret_encrypted, passphrase
                    FROM exchange_credentials
                    WHERE user_id = $1 AND exchange = $2 AND is_active = true
                    ORDER BY last_used DESC NULLS LAST
                    LIMIT 1
                    """,
                    user_id, order_request.exchange
                )
                
                if not creds_row:
                    await conn.execute(
                        "UPDATE live_orders SET status = $1 WHERE id = $2",
                        OrderStatus.REJECTED.value, order_id
                    )
                    return False, None, f"No active credentials found for {order_request.exchange}"
                
                from app.models.trading import ExchangeCredentials
                creds = ExchangeCredentials(
                    id=creds_row['id'],
                    user_id=user_id,
                    exchange=creds_row['exchange'],
                    api_key_encrypted=creds_row['api_key_encrypted'],
                    api_secret_encrypted=creds_row['api_secret_encrypted'],
                    passphrase=creds_row['passphrase']
                )
                
                # Connect to exchange if not already connected
                connected = await exchange_connector.connect(creds)
                if not connected:
                    await conn.execute(
                        "UPDATE live_orders SET status = $1 WHERE id = $2",
                        OrderStatus.REJECTED.value, order_id
                    )
                    return False, None, f"Failed to connect to {order_request.exchange}"
                
                # Place order on exchange
                success, tx_id, error = await exchange_connector.place_order(order)
                
                if not success:
                    # Order was rejected by exchange
                    return False, None, f"Exchange rejected order: {error}"
                
                # Create response
                response = OrderResponse(
                    id=order_id,
                    exchange=order_request.exchange,
                    symbol=order_request.symbol,
                    side=order_request.side.value,
                    type=order_request.type.value,
                    price=order_request.price,
                    quantity=order_request.quantity,
                    status=OrderStatus.OPEN.value,
                    tx_id=tx_id
                )
                
                return True, response, None
                
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            return False, None, f"Internal error: {str(e)}"
    
    async def get_order(self, user_id: str, order_id: int) -> Optional[Order]:
        """Get order details by ID"""
        try:
            async with get_db_connection() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM live_orders
                    WHERE id = $1 AND user_id = $2
                    """,
                    order_id, user_id
                )
                
                if not row:
                    return None
                
                # Convert row to Order model
                return Order(
                    id=row['id'],
                    user_id=row['user_id'],
                    agent_id=row['agent_id'],
                    exchange=row['exchange'],
                    symbol=row['symbol'],
                    side=row['side'],
                    type=row['type'],
                    price=row['price'],
                    quantity=row['quantity'],
                    status=row['status'],
                    executed_qty=row['executed_qty'],
                    tx_id=row['tx_id'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                
        except Exception as e:
            logger.error(f"Error fetching order {order_id}: {str(e)}")
            return None
    
    async def get_orders(self, user_id: str, agent_id: Optional[str] = None, 
                        status: Optional[str] = None, limit: int = 100) -> List[Order]:
        """Get list of orders with optional filtering"""
        try:
            query = """
                SELECT * FROM live_orders
                WHERE user_id = $1
            """
            params = [user_id]
            
            if agent_id:
                query += f" AND agent_id = ${len(params) + 1}"
                params.append(agent_id)
                
            if status:
                query += f" AND status = ${len(params) + 1}"
                params.append(status)
                
            query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
            params.append(limit)
            
            async with get_db_connection() as conn:
                rows = await conn.fetch(query, *params)
                
                orders = []
                for row in rows:
                    orders.append(Order(
                        id=row['id'],
                        user_id=row['user_id'],
                        agent_id=row['agent_id'],
                        exchange=row['exchange'],
                        symbol=row['symbol'],
                        side=row['side'],
                        type=row['type'],
                        price=row['price'],
                        quantity=row['quantity'],
                        status=row['status'],
                        executed_qty=row['executed_qty'],
                        tx_id=row['tx_id'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    ))
                
                return orders
                
        except Exception as e:
            logger.error(f"Error fetching orders: {str(e)}")
            return []
    
    async def cancel_order(self, user_id: str, order_id: int) -> Tuple[bool, Optional[str]]:
        """Cancel an existing order"""
        try:
            async with get_db_connection() as conn:
                # Get order details
                row = await conn.fetchrow(
                    """
                    SELECT * FROM live_orders
                    WHERE id = $1 AND user_id = $2
                    """,
                    order_id, user_id
                )
                
                if not row:
                    return False, "Order not found"
                
                if row['status'] not in [OrderStatus.OPEN.value, OrderStatus.PENDING.value]:
                    return False, f"Cannot cancel order with status: {row['status']}"
                
                if not row['tx_id']:
                    # Order hasn't been placed on exchange yet, just mark as cancelled
                    await conn.execute(
                        """
                        UPDATE live_orders
                        SET status = $1, updated_at = NOW()
                        WHERE id = $2
                        """,
                        OrderStatus.CANCELLED.value, order_id
                    )
                    return True, None
                
                # Cancel on exchange
                cancelled = await exchange_connector.cancel_order(
                    user_id, row['exchange'], row['tx_id'], row['symbol']
                )
                
                if cancelled:
                    await conn.execute(
                        """
                        UPDATE live_orders
                        SET status = $1, updated_at = NOW()
                        WHERE id = $2
                        """,
                        OrderStatus.CANCELLED.value, order_id
                    )
                    return True, None
                else:
                    return False, "Failed to cancel order on exchange"
                
        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {str(e)}")
            return False, f"Internal error: {str(e)}"
    
    async def sync_order_status(self, user_id: str, order_id: int) -> Tuple[bool, Optional[str]]:
        """Sync order status with exchange"""
        try:
            async with get_db_connection() as conn:
                # Get order details
                row = await conn.fetchrow(
                    """
                    SELECT * FROM live_orders
                    WHERE id = $1 AND user_id = $2
                    """,
                    order_id, user_id
                )
                
                if not row:
                    return False, "Order not found"
                
                if not row['tx_id']:
                    return False, "Order has no transaction ID"
                
                # Get status from exchange
                status = await exchange_connector.get_order_status(
                    user_id, row['exchange'], row['tx_id']
                )
                
                if not status:
                    return False, "Failed to get order status from exchange"
                
                # Update order status
                await conn.execute(
                    """
                    UPDATE live_orders
                    SET status = $1, executed_qty = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    status['status'], status['executed_qty'], order_id
                )
                
                # If order is filled or partially filled, update position
                if status['status'] in [OrderStatus.FILLED.value, OrderStatus.PARTIAL.value] and status['executed_qty'] > 0:
                    await self._update_position(
                        conn, user_id, row['agent_id'], row['symbol'], 
                        row['side'], status['executed_qty'], status['price']
                    )
                
                return True, None
                
        except Exception as e:
            logger.error(f"Error syncing order status for {order_id}: {str(e)}")
            return False, f"Internal error: {str(e)}"
    
    async def _update_position(self, conn, user_id: str, agent_id: Optional[str], 
                             symbol: str, side: str, quantity: float, price: float) -> None:
        """Update position after order execution"""
        try:
            # Adjust quantity based on side (buy positive, sell negative)
            position_delta = quantity if side == 'buy' else -quantity
            
            # Check if position exists
            row = await conn.fetchrow(
                """
                SELECT * FROM positions
                WHERE user_id = $1 AND agent_id = $2 AND symbol = $3
                """,
                user_id, agent_id, symbol
            )
            
            if row:
                # Update existing position
                current_qty = row['quantity']
                current_price = row['avg_price']
                
                new_qty = current_qty + position_delta
                
                # Calculate new average price
                if new_qty > 0 and position_delta > 0:
                    # Adding to position, weighted average
                    new_price = ((current_qty * current_price) + (position_delta * price)) / new_qty
                elif new_qty < 0 and position_delta < 0:
                    # Adding to short position, weighted average
                    new_price = ((current_qty * current_price) + (position_delta * price)) / new_qty
                elif new_qty == 0:
                    # Position closed
                    new_price = 0
                else:
                    # Position reversed, use new price
                    new_price = price
                
                # Update position
                await conn.execute(
                    """
                    UPDATE positions
                    SET quantity = $1, avg_price = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    new_qty, new_price, row['id']
                )
                
                # If position is zero, consider removing it
                if new_qty == 0:
                    await conn.execute(
                        """
                        DELETE FROM positions
                        WHERE id = $1
                        """,
                        row['id']
                    )
            else:
                # Create new position if quantity isn't zero
                if position_delta != 0:
                    await conn.execute(
                        """
                        INSERT INTO positions (
                            user_id, agent_id, symbol, quantity, avg_price
                        ) VALUES ($1, $2, $3, $4, $5)
                        """,
                        user_id, agent_id, symbol, position_delta, price
                    )
        
        except Exception as e:
            logger.error(f"Error updating position for {symbol}: {str(e)}")
            # Don't re-raise, just log the error to avoid breaking the order flow


# Singleton instance
order_manager = OrderManagementService()
