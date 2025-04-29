import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date
import uuid

from app.models.trading import (
    OrderSide,
    OrderType,
    RiskProfile,
    Position,
    TradePerformance
)
from app.services.exchange_connector import exchange_connector
from app.db import get_db_connection

logger = logging.getLogger(__name__)


class RiskManagementService:
    """
    Risk Management Service ensures trades are within risk parameters:
    - Position sizing limits
    - Daily loss circuit breakers
    - Portfolio exposure constraints
    """
    
    async def validate_order(self, user_id: str, agent_id: Optional[str], 
                            exchange: str, symbol: str, side: OrderSide, 
                            quantity: float) -> Tuple[bool, Optional[str]]:
        """
        Validate if an order meets risk criteria
        
        Args:
            user_id: ID of the user placing the order
            agent_id: Optional ID of the agent placing the order
            exchange: Exchange name
            symbol: Trading pair (e.g., 'BTC/USDT')
            side: Buy or sell
            quantity: Order size
            
        Returns:
            Tuple of (allowed, reason)
        """
        try:
            # Get risk profile
            risk_profile = await self.get_risk_profile(user_id, agent_id)
            
            if not risk_profile:
                # No risk profile means use defaults
                risk_profile = RiskProfile(
                    user_id=user_id,
                    agent_id=agent_id,
                    max_position_pct=0.05,  # 5% default
                    max_daily_loss=0.02,    # 2% default
                    circuit_breaker=False
                )
            
            # Check circuit breaker
            if risk_profile.circuit_breaker:
                # If circuit breaker is active, check daily performance
                today_perf = await self.get_daily_performance(user_id, agent_id)
                
                if today_perf and today_perf.pnl < 0:
                    # Calculate loss as percentage of account value
                    total_value = await self._get_account_value(user_id, exchange)
                    if total_value > 0:
                        loss_pct = abs(today_perf.pnl) / total_value
                        
                        if loss_pct >= risk_profile.max_daily_loss:
                            return False, f"Circuit breaker triggered: Daily loss of {loss_pct:.2%} exceeds limit of {risk_profile.max_daily_loss:.2%}"
            
            # Check position size
            total_value = await self._get_account_value(user_id, exchange)
            
            if total_value <= 0:
                return False, "Unable to determine account value"
            
            # Get current price of asset
            market_data = await exchange_connector.get_market_data(user_id, exchange, symbol)
            if not market_data:
                return False, f"Unable to get current price for {symbol}"
            
            # Calculate order value
            order_value = quantity * market_data.price
            
            # Get current position for this symbol
            position = await self._get_position(user_id, agent_id, symbol)
            
            # Calculate position value after order
            new_position_value = 0
            if position:
                # Current position
                current_position_value = abs(position.quantity) * market_data.price
                
                # New position after this order
                if side == OrderSide.BUY:
                    new_position_value = current_position_value + order_value
                else:
                    # For sell orders, we need more logic
                    if position.quantity > 0:
                        # Reducing long position
                        new_position_value = max(0, current_position_value - order_value)
                    else:
                        # Increasing short position
                        new_position_value = current_position_value + order_value
            else:
                # New position
                new_position_value = order_value
            
            # Calculate as percentage of account
            position_pct = new_position_value / total_value
            
            if position_pct > risk_profile.max_position_pct:
                return False, f"Position size of {position_pct:.2%} exceeds limit of {risk_profile.max_position_pct:.2%}"
            
            # All checks passed
            return True, None
            
        except Exception as e:
            logger.error(f"Error validating order: {str(e)}")
            # Default to allowing the order if risk checks fail
            return True, f"Warning: Risk validation error: {str(e)}"
    
    async def _get_account_value(self, user_id: str, exchange: str) -> float:
        """Calculate total account value across all assets"""
        try:
            # Get balances
            balances = await exchange_connector.get_wallet_balances(user_id, exchange)
            
            if not balances:
                return 0
            
            # Sum up values in USD
            total_value = 0
            
            for balance in balances:
                if balance.currency == 'USDT' or balance.currency == 'USD':
                    # Stablecoins at face value
                    total_value += balance.free + balance.locked
                else:
                    # Get price for this asset
                    symbol = f"{balance.currency}/USDT"
                    market_data = await exchange_connector.get_market_data(user_id, exchange, symbol)
                    
                    if market_data:
                        asset_value = (balance.free + balance.locked) * market_data.price
                        total_value += asset_value
            
            return total_value
            
        except Exception as e:
            logger.error(f"Error calculating account value: {str(e)}")
            return 0
    
    async def _get_position(self, user_id: str, agent_id: Optional[str], symbol: str) -> Optional[Position]:
        """Get current position for a symbol"""
        try:
            async with get_db_connection() as conn:
                query = """
                    SELECT * FROM positions
                    WHERE user_id = $1 AND symbol = $2
                """
                params = [user_id, symbol]
                
                if agent_id:
                    query += " AND agent_id = $3"
                    params.append(agent_id)
                
                row = await conn.fetchrow(query, *params)
                
                if row:
                    return Position(
                        id=row['id'],
                        user_id=row['user_id'],
                        agent_id=row['agent_id'],
                        symbol=row['symbol'],
                        quantity=row['quantity'],
                        avg_price=row['avg_price'],
                        unrealised_pnl=row['unrealised_pnl'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                
                return None
                
        except Exception as e:
            logger.error(f"Error fetching position for {symbol}: {str(e)}")
            return None
    
    async def get_daily_performance(self, user_id: str, agent_id: Optional[str]) -> Optional[TradePerformance]:
        """Get today's performance metrics"""
        try:
            today = date.today().isoformat()
            
            async with get_db_connection() as conn:
                query = """
                    SELECT * FROM trades_performance
                    WHERE user_id = $1 AND period = $2
                """
                params = [user_id, f"daily:{today}"]
                
                if agent_id:
                    query += " AND agent_id = $3"
                    params.append(agent_id)
                
                row = await conn.fetchrow(query, *params)
                
                if row:
                    return TradePerformance(
                        id=row['id'],
                        user_id=row['user_id'],
                        agent_id=row['agent_id'],
                        period=row['period'],
                        pnl=row['pnl'],
                        win_rate=row['win_rate'],
                        sharpe_ratio=row['sharpe_ratio'],
                        drawdown=row['drawdown'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                
                # No performance record for today
                return None
                
        except Exception as e:
            logger.error(f"Error fetching daily performance: {str(e)}")
            return None
    
    async def get_risk_profile(self, user_id: str, agent_id: Optional[str]) -> Optional[RiskProfile]:
        """Get risk profile for user/agent"""
        try:
            async with get_db_connection() as conn:
                query = """
                    SELECT * FROM risk_config
                    WHERE user_id = $1
                """
                params = [user_id]
                
                if agent_id:
                    query += " AND agent_id = $2"
                    params.append(agent_id)
                else:
                    query += " AND agent_id IS NULL"
                
                row = await conn.fetchrow(query, *params)
                
                if row:
                    return RiskProfile(
                        id=row['id'],
                        user_id=row['user_id'],
                        agent_id=row['agent_id'],
                        max_position_pct=row['max_position_pct'],
                        max_daily_loss=row['max_daily_loss'],
                        circuit_breaker=row['circuit_breaker'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                
                return None
                
        except Exception as e:
            logger.error(f"Error fetching risk profile: {str(e)}")
            return None
    
    async def update_risk_profile(self, risk_profile: RiskProfile) -> bool:
        """Create or update risk profile"""
        try:
            async with get_db_connection() as conn:
                if risk_profile.id:
                    # Update existing profile
                    await conn.execute(
                        """
                        UPDATE risk_config
                        SET max_position_pct = $1, max_daily_loss = $2, 
                            circuit_breaker = $3, updated_at = NOW()
                        WHERE id = $4 AND user_id = $5
                        """,
                        risk_profile.max_position_pct,
                        risk_profile.max_daily_loss,
                        risk_profile.circuit_breaker,
                        risk_profile.id,
                        risk_profile.user_id
                    )
                else:
                    # Create new profile
                    await conn.execute(
                        """
                        INSERT INTO risk_config (
                            user_id, agent_id, max_position_pct, 
                            max_daily_loss, circuit_breaker
                        ) VALUES ($1, $2, $3, $4, $5)
                        """,
                        risk_profile.user_id,
                        risk_profile.agent_id,
                        risk_profile.max_position_pct,
                        risk_profile.max_daily_loss,
                        risk_profile.circuit_breaker
                    )
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating risk profile: {str(e)}")
            return False
    
    async def update_positions_pnl(self, user_id: str) -> bool:
        """Update unrealized PnL for all positions"""
        try:
            async with get_db_connection() as conn:
                # Get all positions
                rows = await conn.fetch(
                    """
                    SELECT * FROM positions
                    WHERE user_id = $1
                    """,
                    user_id
                )
                
                for row in rows:
                    try:
                        # Split symbol to get exchange format
                        symbol_parts = row['symbol'].split('/')
                        if len(symbol_parts) != 2:
                            continue
                        
                        # Get current price from default exchange
                        # This is a simplification - should use the exchange from the position
                        exchange = 'binance'  # Default exchange
                        
                        market_data = await exchange_connector.get_market_data(
                            user_id, exchange, row['symbol']
                        )
                        
                        if not market_data:
                            continue
                        
                        # Calculate unrealized PnL
                        # For long positions: (current_price - avg_price) * quantity
                        # For short positions: (avg_price - current_price) * abs(quantity)
                        
                        quantity = row['quantity']
                        avg_price = row['avg_price']
                        current_price = market_data.price
                        
                        if quantity > 0:
                            # Long position
                            unrealised_pnl = (current_price - avg_price) * quantity
                        else:
                            # Short position
                            unrealised_pnl = (avg_price - current_price) * abs(quantity)
                        
                        # Update position
                        await conn.execute(
                            """
                            UPDATE positions
                            SET unrealised_pnl = $1, updated_at = NOW()
                            WHERE id = $2
                            """,
                            unrealised_pnl, row['id']
                        )
                    except Exception as e:
                        logger.error(f"Error updating PnL for position {row['id']}: {str(e)}")
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating positions PnL: {str(e)}")
            return False


# Singleton instance
risk_manager = RiskManagementService()
