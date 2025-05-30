"""
Trading Commands for ElizaOS Command Console

Implements secure trading commands for the ElizaOS command console,
including order placement, modification, and cancellation.
"""

import logging
import os
import time
from typing import Dict, Any, Optional

from ..command_console import CommandResult, CommandStatus, CommandPermissionLevel, CommandCategory
from ...exchanges.base import Order, OrderSide, OrderType, OrderStatus
from ...order_execution.order_manager import OrderManager
from ...risk_management.risk_manager import RiskManager

logger = logging.getLogger(__name__)

class TradingCommands:
    """
    Trading-related commands for the ElizaOS command console.
    
    Provides commands for executing trades, managing orders, and
    viewing positions and order history.
    """
    
    def __init__(
        self,
        console,
        order_manager: Optional[OrderManager] = None,
        risk_manager: Optional[RiskManager] = None
    ):
        """
        Initialize trading commands.
        
        Args:
            console: CommandConsole instance
            order_manager: OrderManager instance
            risk_manager: RiskManager instance
        """
        self.console = console
        self.order_manager = order_manager
        self.risk_manager = risk_manager
        
        # Register commands
        self._register_commands()
        
        logger.info("Trading commands initialized")
    
    def _register_commands(self):
        """Register trading commands with the console"""
        
        # Order commands
        self.console.register_command(
            name="order",
            description="Place a new order",
            handler=self.handle_order_command,
            permission_level=CommandPermissionLevel.ELEVATED,
            category=CommandCategory.TRADING,
            parameters=[
                {
                    "name": "symbol",
                    "description": "Market symbol (e.g., BTC/USDC)",
                    "required": True,
                    "type": "string"
                },
                {
                    "name": "side",
                    "description": "Order side (buy or sell)",
                    "required": True,
                    "type": "string"
                },
                {
                    "name": "quantity",
                    "description": "Order quantity",
                    "required": True,
                    "type": "number"
                },
                {
                    "name": "price",
                    "description": "Order price (not required for market orders)",
                    "required": False,
                    "type": "number"
                },
                {
                    "name": "type",
                    "description": "Order type (market or limit, default: limit)",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Exchange name",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "order symbol=BTC/USDC side=buy quantity=0.1 price=50000 type=limit",
                "order symbol=ETH/USDC side=sell quantity=1 type=market"
            ],
            is_async=True
        )
        
        self.console.register_command(
            name="cancel",
            description="Cancel an existing order",
            handler=self.handle_cancel_command,
            permission_level=CommandPermissionLevel.ELEVATED,
            category=CommandCategory.TRADING,
            parameters=[
                {
                    "name": "order_id",
                    "description": "Order ID to cancel",
                    "required": True,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Exchange name",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "cancel order_id=123456789",
                "cancel order_id=123456789 exchange=coinbase"
            ],
            is_async=True
        )
        
        self.console.register_command(
            name="orders",
            description="List active orders",
            handler=self.handle_orders_command,
            permission_level=CommandPermissionLevel.BASIC,
            category=CommandCategory.TRADING,
            parameters=[
                {
                    "name": "symbol",
                    "description": "Filter by market symbol",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Filter by exchange",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "status",
                    "description": "Filter by order status",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "orders",
                "orders symbol=BTC/USDC",
                "orders status=open exchange=coinbase"
            ]
        )
        
        self.console.register_command(
            name="positions",
            description="List current positions",
            handler=self.handle_positions_command,
            permission_level=CommandPermissionLevel.BASIC,
            category=CommandCategory.TRADING,
            parameters=[
                {
                    "name": "symbol",
                    "description": "Filter by market symbol",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Filter by exchange",
                    "required": False,
                    "type": "string"
                }
            ],
            examples=[
                "positions",
                "positions symbol=BTC/USDC",
                "positions exchange=coinbase"
            ]
        )
        
        # Trade history command
        self.console.register_command(
            name="trades",
            description="View trade history",
            handler=self.handle_trades_command,
            permission_level=CommandPermissionLevel.BASIC,
            category=CommandCategory.TRADING,
            parameters=[
                {
                    "name": "symbol",
                    "description": "Filter by market symbol",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "exchange",
                    "description": "Filter by exchange",
                    "required": False,
                    "type": "string"
                },
                {
                    "name": "limit",
                    "description": "Maximum number of trades to return",
                    "required": False,
                    "type": "integer"
                }
            ],
            examples=[
                "trades limit=10",
                "trades symbol=BTC/USDC limit=20",
                "trades exchange=coinbase symbol=ETH/USDC"
            ]
        )
    
    async def handle_order_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """
        Handle order placement command.
        
        Args:
            args: Command arguments
            session_id: Session ID
            user_id: User ID
            command_id: Command ID
            
        Returns:
            Command result
        """
        if not self.order_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Order manager not available",
                command_id=command_id
            )
        
        # Extract and validate parameters
        symbol = args.get("symbol")
        side_str = args.get("side", "").lower()
        quantity_str = args.get("quantity")
        price_str = args.get("price")
        type_str = args.get("type", "limit").lower()
        exchange = args.get("exchange")
        
        # Validate required parameters
        if not symbol:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Symbol is required",
                command_id=command_id
            )
        
        if not side_str:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Side is required",
                command_id=command_id
            )
        
        if not quantity_str:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Quantity is required",
                command_id=command_id
            )
        
        # Convert side to enum
        if side_str == "buy":
            side = OrderSide.BUY
        elif side_str == "sell":
            side = OrderSide.SELL
        else:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Invalid side, must be 'buy' or 'sell'",
                command_id=command_id
            )
        
        # Convert order type to enum
        if type_str == "market":
            order_type = OrderType.MARKET
        elif type_str == "limit":
            order_type = OrderType.LIMIT
        else:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Invalid order type, must be 'market' or 'limit'",
                command_id=command_id
            )
        
        # Validate price for limit orders
        if order_type == OrderType.LIMIT and not price_str:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Price is required for limit orders",
                command_id=command_id
            )
        
        try:
            # Convert quantity and price to float
            quantity = float(quantity_str)
            price = float(price_str) if price_str else None
            
            # Validate quantity and price
            if quantity <= 0:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message="Quantity must be greater than zero",
                    command_id=command_id
                )
            
            if order_type == OrderType.LIMIT and price <= 0:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message="Price must be greater than zero",
                    command_id=command_id
                )
            
            # Check risk limits if risk manager is available
            if self.risk_manager:
                risk_check = await self.risk_manager.check_order_risk(
                    symbol=symbol,
                    side=side,
                    quantity=quantity,
                    price=price,
                    order_type=order_type,
                    user_id=user_id
                )
                
                if not risk_check["approved"]:
                    return CommandResult(
                        status=CommandStatus.ERROR,
                        message=f"Risk check failed: {risk_check['reason']}",
                        data=risk_check,
                        command_id=command_id
                    )
            
            # Create and place order
            order = Order(
                symbol=symbol,
                side=side,
                quantity=quantity,
                price=price,
                order_type=order_type,
                exchange=exchange
            )
            
            # Log order placement attempt with user ID
            logger.info(
                f"ORDER_PLACEMENT: user={user_id} session={session_id} "
                f"symbol={symbol} side={side_str} quantity={quantity} "
                f"price={price} type={type_str} exchange={exchange}"
            )
            
            result = await self.order_manager.place_order(order)
            
            if result["success"]:
                # Log successful order placement
                logger.info(
                    f"ORDER_PLACED: user={user_id} order_id={result['order_id']} "
                    f"symbol={symbol} side={side_str} quantity={quantity}"
                )
                
                return CommandResult(
                    status=CommandStatus.SUCCESS,
                    message=f"{side_str.capitalize()} order placed successfully",
                    data=result["order"],
                    command_id=command_id
                )
            else:
                # Log failed order placement
                logger.error(
                    f"ORDER_FAILED: user={user_id} "
                    f"symbol={symbol} side={side_str} quantity={quantity} "
                    f"error='{result['error']}'"
                )
                
                return CommandResult(
                    status=CommandStatus.ERROR,
                    message=f"Failed to place order: {result['error']}",
                    command_id=command_id
                )
        
        except ValueError:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Invalid quantity or price value",
                command_id=command_id
            )
        except Exception as e:
            logger.error(
                f"ORDER_ERROR: user={user_id} "
                f"symbol={symbol} side={side_str} error='{str(e)}'"
            )
            
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error placing order: {str(e)}",
                command_id=command_id
            )
    
    async def handle_cancel_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """
        Handle order cancellation command.
        
        Args:
            args: Command arguments
            session_id: Session ID
            user_id: User ID
            command_id: Command ID
            
        Returns:
            Command result
        """
        if not self.order_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Order manager not available",
                command_id=command_id
            )
        
        # Extract parameters
        order_id = args.get("order_id")
        exchange = args.get("exchange")
        
        if not order_id:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Order ID is required",
                command_id=command_id
            )
        
        try:
            # Log cancel attempt
            logger.info(
                f"ORDER_CANCEL: user={user_id} session={session_id} "
                f"order_id={order_id} exchange={exchange}"
            )
            
            # Cancel order
            result = await self.order_manager.cancel_order(order_id, exchange)
            
            if result["success"]:
                # Log successful cancellation
                logger.info(
                    f"ORDER_CANCELLED: user={user_id} order_id={order_id}"
                )
                
                return CommandResult(
                    status=CommandStatus.SUCCESS,
                    message="Order cancelled successfully",
                    data=result["order"],
                    command_id=command_id
                )
            else:
                # Log failed cancellation
                logger.error(
                    f"ORDER_CANCEL_FAILED: user={user_id} order_id={order_id} "
                    f"error='{result['error']}'"
                )
                
                return CommandResult(
                    status=CommandStatus.ERROR,
                    message=f"Failed to cancel order: {result['error']}",
                    command_id=command_id
                )
        
        except Exception as e:
            logger.error(
                f"ORDER_CANCEL_ERROR: user={user_id} "
                f"order_id={order_id} error='{str(e)}'"
            )
            
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error cancelling order: {str(e)}",
                command_id=command_id
            )
    
    def handle_orders_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """
        Handle active orders list command.
        
        Args:
            args: Command arguments
            session_id: Session ID
            user_id: User ID
            command_id: Command ID
            
        Returns:
            Command result
        """
        if not self.order_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Order manager not available",
                command_id=command_id
            )
        
        # Extract filter parameters
        symbol = args.get("symbol")
        exchange = args.get("exchange")
        status_str = args.get("status", "open").lower()
        
        # Map status string to OrderStatus
        status = None
        if status_str:
            try:
                status = OrderStatus[status_str.upper()]
            except KeyError:
                return CommandResult(
                    status=CommandStatus.INVALID,
                    message=f"Invalid order status: {status_str}",
                    command_id=command_id
                )
        
        try:
            # Get orders
            orders = self.order_manager.get_orders(
                symbol=symbol,
                exchange=exchange,
                status=status
            )
            
            # Convert to dictionary for response
            orders_data = [order.to_dict() for order in orders]
            
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Found {len(orders_data)} orders",
                data=orders_data,
                command_id=command_id
            )
        
        except Exception as e:
            logger.error(
                f"ORDERS_LIST_ERROR: user={user_id} error='{str(e)}'"
            )
            
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error retrieving orders: {str(e)}",
                command_id=command_id
            )
    
    def handle_positions_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """
        Handle positions list command.
        
        Args:
            args: Command arguments
            session_id: Session ID
            user_id: User ID
            command_id: Command ID
            
        Returns:
            Command result
        """
        if not self.order_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Order manager not available",
                command_id=command_id
            )
        
        # Extract filter parameters
        symbol = args.get("symbol")
        exchange = args.get("exchange")
        
        try:
            # Get positions
            positions = self.order_manager.get_positions(
                symbol=symbol,
                exchange=exchange
            )
            
            # Convert to dictionary for response
            positions_data = [position.to_dict() for position in positions]
            
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Found {len(positions_data)} positions",
                data=positions_data,
                command_id=command_id
            )
        
        except Exception as e:
            logger.error(
                f"POSITIONS_LIST_ERROR: user={user_id} error='{str(e)}'"
            )
            
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error retrieving positions: {str(e)}",
                command_id=command_id
            )
    
    def handle_trades_command(
        self,
        args: Dict[str, str],
        session_id: Optional[str],
        user_id: Optional[str],
        command_id: str
    ) -> CommandResult:
        """
        Handle trade history command.
        
        Args:
            args: Command arguments
            session_id: Session ID
            user_id: User ID
            command_id: Command ID
            
        Returns:
            Command result
        """
        if not self.order_manager:
            return CommandResult(
                status=CommandStatus.ERROR,
                message="Order manager not available",
                command_id=command_id
            )
        
        # Extract filter parameters
        symbol = args.get("symbol")
        exchange = args.get("exchange")
        limit_str = args.get("limit", "20")
        
        try:
            # Convert limit to integer
            limit = int(limit_str)
            
            # Get trade history
            trades = self.order_manager.get_trade_history(
                symbol=symbol,
                exchange=exchange,
                limit=limit
            )
            
            # Convert to dictionary for response
            trades_data = [trade.to_dict() for trade in trades]
            
            return CommandResult(
                status=CommandStatus.SUCCESS,
                message=f"Found {len(trades_data)} trades",
                data=trades_data,
                command_id=command_id
            )
        
        except ValueError:
            return CommandResult(
                status=CommandStatus.INVALID,
                message="Invalid limit value",
                command_id=command_id
            )
        except Exception as e:
            logger.error(
                f"TRADES_LIST_ERROR: user={user_id} error='{str(e)}'"
            )
            
            return CommandResult(
                status=CommandStatus.ERROR,
                message=f"Error retrieving trade history: {str(e)}",
                command_id=command_id
            )
