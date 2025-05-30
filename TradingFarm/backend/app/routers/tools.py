from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..db import get_db, get_supabase_client
from sqlalchemy.orm import Session
import logging
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain.tools import BaseTool
from langchain_openai import ChatOpenAI
from ..config import settings
import json

router = APIRouter()
logger = logging.getLogger(__name__)

# Models for request/response
class ToolInput(BaseModel):
    command: str
    farm_id: Optional[str] = None
    agent_id: Optional[str] = None
    user_id: Optional[str] = None

class ToolResponse(BaseModel):
    response: str
    parsed_intent: Optional[Dict[str, Any]] = None
    success: bool
    needs_confirmation: bool = False
    confirmation_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Trading Tools
class OpenPositionTool(BaseTool):
    name = "open_position"
    description = "Open a trading position with the specified parameters."
    
    def _run(self, 
             symbol: str, 
             direction: str, 
             size: float, 
             leverage: Optional[float] = 1.0,
             stop_loss: Optional[float] = None,
             take_profit: Optional[float] = None
            ) -> str:
        """
        Open a trading position.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTC/USD')
            direction: Trade direction, either 'long' or 'short'
            size: Position size in base currency units
            leverage: Leverage multiplier (default: 1.0)
            stop_loss: Optional stop loss price
            take_profit: Optional take profit price
            
        Returns:
            Confirmation message with position details
        """
        # Validate inputs
        if direction.lower() not in ["long", "short"]:
            return "Error: Direction must be 'long' or 'short'"
        
        # In a real implementation, this would call the appropriate exchange API
        # For now, we just return a confirmation message
        details = {
            "symbol": symbol,
            "direction": direction.lower(),
            "size": size,
            "leverage": leverage,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "order_status": "pending"
        }
        
        return f"Position opened: {json.dumps(details)}"
    
    async def _arun(self, symbol: str, direction: str, size: float, **kwargs) -> str:
        return self._run(symbol, direction, size, **kwargs)

class ClosePositionTool(BaseTool):
    name = "close_position"
    description = "Close an existing trading position."
    
    def _run(self, 
             position_id: Optional[str] = None,
             symbol: Optional[str] = None
            ) -> str:
        """
        Close a trading position.
        
        Args:
            position_id: ID of the position to close (if known)
            symbol: Symbol of the position to close (if position_id not provided)
            
        Returns:
            Confirmation message
        """
        if position_id:
            return f"Position {position_id} has been closed."
        elif symbol:
            return f"All positions for {symbol} have been closed."
        else:
            return "Error: Either position_id or symbol must be provided."
    
    async def _arun(self, **kwargs) -> str:
        return self._run(**kwargs)

class GetPriceTool(BaseTool):
    name = "get_price"
    description = "Get the current price of a trading pair."
    
    def _run(self, symbol: str) -> str:
        """
        Get the current price of a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTC/USD')
            
        Returns:
            Current price information
        """
        # Mock price data
        mock_prices = {
            "BTC/USD": 62345.67,
            "ETH/USD": 3456.78,
            "SOL/USD": 123.45,
            "XRP/USD": 0.5678
        }
        
        # Check if symbol exists in our mock data
        cleaned_symbol = symbol.upper().replace("-", "/")
        if cleaned_symbol in mock_prices:
            return f"Current price of {cleaned_symbol}: ${mock_prices[cleaned_symbol]}"
        else:
            # For any other symbol, generate a random price
            import random
            price = random.uniform(0.1, 10000)
            return f"Current price of {cleaned_symbol}: ${price:.2f}"
    
    async def _arun(self, symbol: str) -> str:
        return self._run(symbol)

class GetMATool(BaseTool):
    name = "get_ma"
    description = "Get the moving average for a trading pair."
    
    def _run(self, 
             symbol: str, 
             period: int = 200, 
             ma_type: str = "simple"
            ) -> str:
        """
        Get the moving average for a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTC/USD')
            period: Number of periods for the MA (e.g., 200 for 200-day MA)
            ma_type: Type of moving average ('simple', 'exponential', 'weighted')
            
        Returns:
            Moving average value
        """
        # Mock MA data
        import random
        
        cleaned_symbol = symbol.upper().replace("-", "/")
        base_price = {
            "BTC/USD": 62000,
            "ETH/USD": 3400,
            "SOL/USD": 120,
            "XRP/USD": 0.55
        }.get(cleaned_symbol, random.uniform(0.1, 5000))
        
        # Add some randomness to create a realistic MA
        ma_value = base_price * (1 + random.uniform(-0.05, 0.05))
        
        return f"{period}-period {ma_type} MA for {cleaned_symbol}: ${ma_value:.2f}"
    
    async def _arun(self, symbol: str, period: int = 200, ma_type: str = "simple") -> str:
        return self._run(symbol, period, ma_type)

class ListPositionsTool(BaseTool):
    name = "list_positions"
    description = "List all currently open positions."
    
    def _run(self) -> str:
        """
        List all currently open positions.
        
        Returns:
            List of all open positions
        """
        # Mock position data
        mock_positions = [
            {"id": "pos-123", "symbol": "BTC/USD", "direction": "long", "size": 0.5, "entry_price": 61234.56, "current_pnl": 550.25},
            {"id": "pos-124", "symbol": "ETH/USD", "direction": "short", "size": 3.0, "entry_price": 3567.89, "current_pnl": -125.67},
            {"id": "pos-125", "symbol": "SOL/USD", "direction": "long", "size": 25.0, "entry_price": 118.45, "current_pnl": 125.00}
        ]
        
        if not mock_positions:
            return "No open positions found."
        
        result = "Open positions:\n"
        for pos in mock_positions:
            pnl_str = f"+${pos['current_pnl']:.2f}" if pos['current_pnl'] >= 0 else f"-${abs(pos['current_pnl']):.2f}"
            result += f"- {pos['symbol']} {pos['direction'].upper()} {pos['size']} @ ${pos['entry_price']} (P&L: {pnl_str})\n"
        
        return result
    
    async def _arun(self) -> str:
        return self._run()

class SetStopLossTool(BaseTool):
    name = "set_stop_loss"
    description = "Set or modify a stop loss for an existing position."
    
    def _run(self, 
             position_id: Optional[str] = None,
             symbol: Optional[str] = None,
             price: float = None
            ) -> str:
        """
        Set or modify a stop loss.
        
        Args:
            position_id: ID of the position to modify (if known)
            symbol: Symbol of the position to modify (if position_id not provided)
            price: Stop loss price
            
        Returns:
            Confirmation message
        """
        if price is None:
            return "Error: Stop loss price must be provided."
        
        if position_id:
            return f"Stop loss for position {position_id} set to ${price:.2f}"
        elif symbol:
            return f"Stop loss for all {symbol} positions set to ${price:.2f}"
        else:
            return "Error: Either position_id or symbol must be provided."
    
    async def _arun(self, **kwargs) -> str:
        return self._run(**kwargs)

@router.post("/execute", response_model=ToolResponse)
async def execute_tool_command(
    tool_input: ToolInput = Body(...),
    db: Session = Depends(get_db)
):
    """
    Execute a natural language tool command using LangChain
    """
    try:
        # Initialize LangChain tools
        tools = [
            OpenPositionTool(),
            ClosePositionTool(),
            GetPriceTool(),
            GetMATool(),
            ListPositionsTool(),
            SetStopLossTool()
        ]
        
        # Initialize memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Initialize LLM
        llm = ChatOpenAI(
            temperature=0,
            model=settings.DEFAULT_MODEL,
            api_key=settings.OPENAI_API_KEY,
            streaming=False
        )
        
        # Initialize agent
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.OPENAI_FUNCTIONS,
            verbose=True,
            memory=memory,
            handle_parsing_errors=True
        )
        
        # Process the command
        result = agent.invoke({"input": tool_input.command})
        
        # Parse the result to extract intent if possible
        parsed_intent = None
        needs_confirmation = False
        confirmation_data = None
        
        # Check if this is a trading action that needs confirmation
        if "open_position" in result.get("intermediate_steps", []):
            needs_confirmation = True
            # Extract details for confirmation
            confirmation_data = {
                "action": "open_position",
                "details": extract_position_details(result["output"])
            }
        
        # Store command history in database
        store_command_history(
            db=db,
            user_id=tool_input.user_id,
            command=tool_input.command,
            response=result["output"],
            farm_id=tool_input.farm_id,
            agent_id=tool_input.agent_id
        )
        
        return ToolResponse(
            response=result["output"],
            parsed_intent=parsed_intent,
            success=True,
            needs_confirmation=needs_confirmation,
            confirmation_data=confirmation_data
        )
        
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return ToolResponse(
            response="An error occurred while processing your command.",
            success=False,
            error=str(e)
        )

def extract_position_details(output: str) -> Dict[str, Any]:
    """
    Extract position details from agent output
    """
    # Simplified extraction for the prototype
    try:
        # Look for JSON in the output
        import re
        json_match = re.search(r'{.*}', output)
        if json_match:
            return json.loads(json_match.group(0))
    except:
        pass
    
    # Fallback - return a dictionary with the raw output
    return {"raw_output": output}

def store_command_history(
    db: Session,
    user_id: Optional[str],
    command: str,
    response: str,
    farm_id: Optional[str] = None,
    agent_id: Optional[str] = None
):
    """
    Store command history in the database
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Insert into command_history table
        result = supabase.table("command_history").insert({
            "user_id": user_id,
            "command": command,
            "response": response,
            "farm_id": farm_id,
            "agent_id": agent_id,
            "created_at": "now()"
        }).execute()
        
        logger.info(f"Command history saved: {command}")
        return result
    except Exception as e:
        logger.error(f"Error storing command history: {e}")
        # Don't fail the main request if this fails
        return None
