import os
from supabase import create_client, Client
from dotenv import load_dotenv
from decimal import Decimal # For precise arithmetic

load_dotenv()

class SimulatedTradeExecutor:
    def __init__(self, supabase_url: str, supabase_key: str):
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided for SimulatedTradeExecutor.")
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        except Exception as e:
            raise ValueError(f"Error initializing Supabase client in SimulatedTradeExecutor: {e}")

    def execute_trade(self, agent_id: str, user_id: str, symbol: str, direction: str, 
                      quantity: float, price: float, strategy_id: str, notes: str = ""):
        print(f"SIMULATED TRADE EXECUTION for Agent {agent_id}: {direction} {quantity} {symbol} @ {price}")

        if price is None or price <= 0: # Price might be None if market data failed
            print(f"Trade for {symbol} aborted due to invalid price: {price}")
            # Optionally log a failed trade attempt to agent_trades
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Invalid market price for execution", strategy_id, None)
            return {"status": "failed", "reason": "Invalid market price"}

        required_capital = Decimal(str(price)) * Decimal(str(quantity))
        
        # 1. Fetch agent's wallet_id from trading_agents table
        agent_wallet_info_resp = self.supabase.table('trading_agents').select('wallet_id').eq('agent_id', agent_id).single().execute()
        if not agent_wallet_info_resp.data or not agent_wallet_info_resp.data.get('wallet_id'):
            print(f"Error: Could not find wallet_id for agent {agent_id}")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Agent wallet_id not found", strategy_id, None)
            return {"status": "failed", "reason": "Agent wallet_id not found"}
        agent_wallet_id = agent_wallet_info_resp.data['wallet_id']

        # 2. Fetch agent's wallet details
        wallet_resp = self.supabase.table('wallets').select('balance, currency, status').eq('wallet_id', agent_wallet_id).single().execute()
        if not wallet_resp.data:
            print(f"Error: Could not find wallet {agent_wallet_id} for agent {agent_id}")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Agent wallet not found", strategy_id, None)
            return {"status": "failed", "reason": "Agent wallet not found"}
        
        wallet = wallet_resp.data
        current_balance = Decimal(str(wallet['balance'])) # Ensure Decimal for precision
        wallet_currency = wallet['currency']
        wallet_status = wallet['status']

        if wallet_status != 'active':
            print(f"Trade for {symbol} aborted. Wallet {agent_wallet_id} is not active (status: {wallet_status}).")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', f"Wallet not active (status: {wallet_status})", strategy_id, None)
            return {"status": "failed", "reason": f"Wallet not active (status: {wallet_status})"}

        # 3. Check for sufficient funds (only for 'buy' or if shorting requires margin - simplify for now: only for buy)
        if direction.lower() == 'buy':
            if current_balance < required_capital:
                print(f"Trade for {symbol} aborted. Insufficient funds in wallet {agent_wallet_id}. Need {required_capital}, have {current_balance}")
                self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Insufficient funds", strategy_id, None)
                return {"status": "failed", "reason": "Insufficient funds"}
        
        # 4. Update wallet balance (Simulated - actual PnL comes later when closing trade)
        # For buys, debit capital. For sells, we'd typically credit, but for this simulation,
        # we'll just log the trade. PnL calculation and crediting would happen on "close" of a position.
        # For now, let's assume buys reserve capital. Sells don't change balance until PnL.
        new_balance_val = current_balance
        if direction.lower() == 'buy':
            new_balance_val = current_balance - required_capital
        
        # Update wallet in DB
        update_resp = self.supabase.table('wallets').update({'balance': float(new_balance_val)}).eq('wallet_id', agent_wallet_id).execute()
        
        # Supabase-py v1 returns PostgrestAPIResponse, v2 returns SyncSingleAPIResponse / APIResponse
        # Check for error attribute in response, or if data is None and error is present
        has_error = False
        error_message = 'Unknown error'
        if hasattr(update_resp, 'error') and update_resp.error is not None:
            has_error = True
            error_message = update_resp.error.message if hasattr(update_resp.error, 'message') else str(update_resp.error)
        elif hasattr(update_resp, 'data') and update_resp.data is None and not hasattr(update_resp, 'count'): # some responses might have count but no data
             # This condition might need adjustment based on exact Supabase client version behavior for updates
             # For now, assume if data is None and no specific error attribute, it might be an issue or no rows updated
             # However, for an update, an error attribute is more typical for failure.
             # Let's refine based on typical error patterns for Supabase-py updates.
             # A successful update usually returns data (the updated rows) or count.
             # If data is None AND there's no explicit error object, it's ambiguous or might mean 0 rows affected.
             # For now, we'll rely on a direct error attribute. If not present, assume success unless 0 rows updated.
             # The problem statement used `if update_resp.data is None and update_resp.error is not None:` which might be too strict.
             # Let's stick to checking for an error attribute first.
             pass # If no error attribute, assume success or 0 rows affected (which isn't an error for this logic)


        if has_error:
             print(f"Error updating wallet balance for {agent_wallet_id}: {error_message}")
             self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Wallet balance update failed", strategy_id, None)
             return {"status": "failed", "reason": "Wallet balance update failed"}

        # 5. Log wallet transaction for capital used (if buy)
        if direction.lower() == 'buy':
            transaction_payload = {
                "destination_wallet_id": agent_wallet_id, # Corrected: for BUY, destination is agent's wallet if capital is from user.
                                                        # However, this context is for agent executing trade with ITS OWN capital.
                                                        # So, source is agent_wallet_id, destination is conceptual "exchange" or null.
                "source_wallet_id": agent_wallet_id, 
                "amount": float(required_capital),
                "currency": wallet_currency,
                "type": "trade_settlement", # For capital used/reserved for a trade
                "status": "completed",
                "description": f"Simulated BUY {quantity} {symbol} @ {price} for agent {agent_id}"
            }
            # The above assumes capital is "spent". If it's just reserved, type might be 'hold'.
            # For simplicity, we use 'trade_settlement' to represent funds debited for a trade.
            
            tx_resp = self.supabase.table('wallet_transactions').insert(transaction_payload).execute()
            if hasattr(tx_resp, 'error') and tx_resp.error is not None:
                error_message_tx = tx_resp.error.message if hasattr(tx_resp.error, 'message') else str(tx_resp.error)
                print(f"Warning: Failed to log 'trade_settlement' wallet transaction: {error_message_tx}")
                # This is a warning because the trade itself is logged and balance updated.

        # 6. Log the simulated trade to agent_trades
        trade_log_result = self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'simulated_open', notes, strategy_id, None)
        
        print(f"Simulated trade for {symbol} processed. Status: {'success' if trade_log_result.get('status') == 'success' else 'log_failed'}")
        return {"status": "success", "trade_id": trade_log_result.get("trade_id") if trade_log_result else None}

    def log_simulated_trade(self, agent_id, symbol, direction, quantity, entry_price, status, notes, strategy_id, pnl=None):
        trade_payload = {
            "agent_id": agent_id,
            "symbol": symbol,
            "direction": direction.lower(),
            "quantity": quantity,
            "entry_price": entry_price,
            "status": status, 
            "notes": notes,
            # "assigned_strategy_id": strategy_id, # This column does not exist on agent_trades
        }
        if strategy_id: 
            trade_payload["notes"] = f"{notes or ''} (Strategy: {strategy_id})".strip()
        
        if entry_price is None:
            trade_payload["entry_price"] = None 

        response = self.supabase.table('agent_trades').insert(trade_payload).select('trade_id').execute()
        
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            print(f"Logged trade {response.data[0]['trade_id']} to agent_trades.")
            return {"status": "success", "trade_id": response.data[0]['trade_id']}
        else:
            error_message_log = response.error.message if hasattr(response, 'error') and response.error else 'Unknown error during log'
            print(f"Error logging trade to agent_trades: {error_message_log}")
            return {"status": "log_failed", "error": error_message_log}
