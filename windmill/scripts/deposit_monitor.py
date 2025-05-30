import asyncio
import json
import datetime
from typing import List, Dict, Any, Optional, Union
from decimal import Decimal
import time
from cryptography.fernet import Fernet
import base64
import hashlib
import ccxt
import httpx
from web3 import Web3

# Type definitions
AccountType = Dict[str, Any]
CredentialType = Dict[str, Any]
DepositType = Dict[str, Any]

async def get_monitorable_accounts(supabase_url: str, supabase_key: str) -> List[AccountType]:
    """
    Fetch all linked accounts that require monitoring from the database.
    
    Args:
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        List of account objects that need monitoring
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{supabase_url}/rest/v1/linked_accounts",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json"
            },
            params={
                "select": "*",
                "requires_monitoring": "eq.true",
                "status": "eq.active"
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to fetch accounts: {response.text}")
        
        return response.json()

async def get_decrypted_creds(
    account: AccountType, 
    vault_encryption_key: str,
    supabase_url: str,
    supabase_key: str
) -> CredentialType:
    """
    Decrypt the encrypted credentials for a linked account.
    
    Args:
        account: The linked account object
        vault_encryption_key: The master encryption key
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Decrypted credentials as a dictionary
    """
    if not account.get("encrypted_credentials"):
        return None
    
    # Create a unique salt based on the account ID
    account_id = account.get("id", "")
    salt = hashlib.sha256(account_id.encode()).digest()[:16]
    
    # Derive a unique key using the master key and salt
    key_material = vault_encryption_key.encode()
    derived_key = hashlib.pbkdf2_hmac("sha256", key_material, salt, 100000, 32)
    
    # Create a Fernet cipher with the derived key
    cipher = Fernet(base64.urlsafe_b64encode(derived_key))
    
    try:
        # Decrypt the credentials
        encrypted_data = account["encrypted_credentials"].encode()
        decrypted_data = cipher.decrypt(encrypted_data)
        credentials = json.loads(decrypted_data.decode())
        
        return credentials
    except Exception as e:
        print(f"Error decrypting credentials for account {account_id}: {str(e)}")
        return None

async def check_blockchain_deposits(
    account: AccountType,
    credentials: CredentialType,
    blockchain_node_urls: Dict[str, str],
    last_check_time: Optional[str] = None
) -> List[DepositType]:
    """
    Check for new deposits in a blockchain wallet.
    
    Args:
        account: The linked account object
        credentials: The decrypted credentials
        blockchain_node_urls: URLs for blockchain nodes
        last_check_time: ISO timestamp of the last check
        
    Returns:
        List of deposit objects
    """
    if not credentials or account.get("type") != "defi_wallet":
        return []
    
    wallet_address = credentials.get("address")
    if not wallet_address:
        print(f"Missing wallet address for account {account.get('id')}")
        return []
    
    chain = account.get("provider", "ethereum").lower()
    
    # Get the appropriate node URL
    node_url = blockchain_node_urls.get(chain)
    if not node_url:
        print(f"No node URL found for chain: {chain}")
        return []
    
    # Convert last_check_time to a timestamp
    last_check_timestamp = 0
    if last_check_time:
        try:
            dt = datetime.datetime.fromisoformat(last_check_time.replace('Z', '+00:00'))
            last_check_timestamp = int(dt.timestamp())
        except Exception as e:
            print(f"Error parsing last_check_time: {str(e)}")
    
    # Initialize Web3
    w3 = Web3(Web3.HTTPProvider(node_url))
    if not w3.is_connected():
        print(f"Failed to connect to {chain} node")
        return []
    
    # Get the latest block number
    latest_block = w3.eth.block_number
    
    # Determine starting block (default to last 100 blocks if no last check)
    start_block = max(latest_block - 100, 0)
    if last_check_timestamp > 0:
        # Try to find the block closest to the last check time
        # This is a simplified approach - in production, you'd want a more accurate method
        current_block = w3.eth.get_block(latest_block)
        current_timestamp = current_block.timestamp
        
        # Rough estimate based on average block time
        blocks_to_check = (current_timestamp - last_check_timestamp) // 15  # ~15 seconds per block for Ethereum
        start_block = max(latest_block - blocks_to_check, 0)
    
    # Get transactions to this address
    deposits = []
    
    try:
        # Check for native currency (ETH, BNB, etc.) transactions
        # This is a simplified implementation - in production, you'd use archive nodes or APIs
        for block_num in range(start_block, latest_block + 1):
            block = w3.eth.get_block(block_num, full_transactions=True)
            
            for tx in block.transactions:
                # Check if this is a transaction to our wallet
                if hasattr(tx, 'to') and tx.to and tx.to.lower() == wallet_address.lower():
                    # Convert Wei to Ether
                    amount = w3.from_wei(tx.value, 'ether')
                    if amount > 0:
                        asset_symbol = {
                            "ethereum": "ETH",
                            "arbitrum": "ARB",
                            "optimism": "OP",
                            "polygon": "MATIC",
                            "base": "ETH",
                        }.get(chain, "ETH")
                        
                        deposits.append({
                            "asset_symbol": asset_symbol,
                            "amount": float(amount),
                            "transaction_hash": tx.hash.hex(),
                            "timestamp": block.timestamp,
                            "block_number": block_num,
                            "from_address": tx['from'],
                            "to_address": tx.to,
                            "deposit_type": "blockchain"
                        })
        
        # In a real implementation, you'd also check for ERC20 token transfers
        # This would require parsing logs or using an indexer service
        
    except Exception as e:
        print(f"Error checking blockchain deposits: {str(e)}")
    
    return deposits

async def check_exchange_deposits(
    account: AccountType,
    credentials: CredentialType,
    last_check_time: Optional[str] = None
) -> List[DepositType]:
    """
    Check for new deposits in a cryptocurrency exchange account.
    
    Args:
        account: The linked account object
        credentials: The decrypted credentials
        last_check_time: ISO timestamp of the last check
        
    Returns:
        List of deposit objects
    """
    if not credentials or account.get("type") != "exchange_api":
        return []
    
    exchange_id = account.get("provider", "").lower()
    
    # CCXT exchange class mapping
    EXCHANGE_CLASS_MAP = {
        "binance": ccxt.binance,
        "coinbase": ccxt.coinbasepro,
        "bybit": ccxt.bybit,
        "okx": ccxt.okx,
        "kraken": ccxt.kraken,
        "kucoin": ccxt.kucoin,
        "huobi": ccxt.huobi,
    }
    
    # Get the exchange class
    exchange_class = EXCHANGE_CLASS_MAP.get(exchange_id)
    if not exchange_class:
        print(f"Unsupported exchange: {exchange_id}")
        return []
    
    # Initialize the exchange
    try:
        api_key = credentials.get("apiKey") or credentials.get("api_key")
        api_secret = credentials.get("secret") or credentials.get("api_secret")
        
        if not api_key or not api_secret:
            print(f"Missing API credentials for {exchange_id}")
            return []
        
        exchange_params = {"apiKey": api_key, "secret": api_secret}
        
        # Add additional parameters if needed
        if exchange_id == "binance" and "testnet" in account.get("metadata", {}):
            exchange_params["options"] = {"defaultType": "future"}
            if account["metadata"]["testnet"]:
                exchange_params["testnet"] = True
        
        exchange = exchange_class(exchange_params)
        
        # Set the since parameter for deposit history
        since = None
        if last_check_time:
            try:
                dt = datetime.datetime.fromisoformat(last_check_time.replace('Z', '+00:00'))
                since = int(dt.timestamp() * 1000)  # CCXT uses milliseconds
            except Exception as e:
                print(f"Error parsing last_check_time: {str(e)}")
        
        # Fetch deposit history
        deposit_history = []
        try:
            if hasattr(exchange, 'fetch_deposits'):
                deposit_history = await exchange.fetch_deposits(since=since)
            else:
                # Fallback for exchanges without fetch_deposits
                transactions = await exchange.fetch_transactions(since=since)
                deposit_history = [tx for tx in transactions if tx['type'] == 'deposit']
        except Exception as e:
            print(f"Error fetching deposits from {exchange_id}: {str(e)}")
            return []
        
        deposits = []
        for deposit in deposit_history:
            if deposit['status'] == 'ok' or deposit['status'] == 'complete' or deposit['status'] == 'confirmed':
                deposits.append({
                    "asset_symbol": deposit['currency'],
                    "amount": float(deposit['amount']),
                    "transaction_hash": deposit.get('txid', ''),
                    "timestamp": deposit['timestamp'] // 1000 if deposit.get('timestamp') else int(time.time()),
                    "address": deposit.get('address', ''),
                    "tag": deposit.get('tag', ''),
                    "external_id": deposit.get('id', ''),
                    "deposit_type": "exchange"
                })
        
        return deposits
        
    except Exception as e:
        print(f"Error in check_exchange_deposits: {str(e)}")
        return []

async def update_vault_balance_api(
    farm_id: str,
    asset_symbol: str,
    amount: float,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Update the vault balance for a given asset by calling the API.
    
    Args:
        farm_id: The farm ID
        asset_symbol: The asset symbol (e.g., 'BTC', 'ETH')
        amount: The amount to add to the balance
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Updated vault balance object with vault_id
    """
    try:
        # First, check if there's a vault for this farm
        async with httpx.AsyncClient() as client:
            vault_response = await client.get(
                f"{supabase_url}/rest/v1/vaults",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "select": "*",
                    "farm_id": f"eq.{farm_id}",
                    "limit": "1"
                }
            )
            
            if vault_response.status_code != 200:
                raise Exception(f"Failed to fetch vault: {vault_response.text}")
            
            vaults = vault_response.json()
            
            # If no vault exists, create one
            if not vaults:
                vault_create_response = await client.post(
                    f"{supabase_url}/rest/v1/vaults",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json={
                        "farm_id": farm_id,
                        "name": "Main Vault",
                        "description": "Primary vault for farm assets"
                    }
                )
                
                if vault_create_response.status_code != 201:
                    raise Exception(f"Failed to create vault: {vault_create_response.text}")
                
                vault = vault_create_response.json()[0]
            else:
                vault = vaults[0]
            
            vault_id = vault["id"]
            
            # Check if balance record exists for this asset
            balance_response = await client.get(
                f"{supabase_url}/rest/v1/vault_balances",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "select": "*",
                    "vault_id": f"eq.{vault_id}",
                    "asset_symbol": f"eq.{asset_symbol}"
                }
            )
            
            if balance_response.status_code != 200:
                raise Exception(f"Failed to fetch balance: {balance_response.text}")
            
            balances = balance_response.json()
            
            if balances:
                # Update existing balance
                existing_balance = balances[0]
                new_amount = Decimal(str(existing_balance["amount"])) + Decimal(str(amount))
                
                update_response = await client.patch(
                    f"{supabase_url}/rest/v1/vault_balances",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    params={
                        "id": f"eq.{existing_balance['id']}"
                    },
                    json={
                        "amount": str(new_amount),
                        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    }
                )
                
                if update_response.status_code != 200:
                    raise Exception(f"Failed to update balance: {update_response.text}")
                
                updated_balance = update_response.json()[0]
                updated_balance["vault_id"] = vault_id
                return updated_balance
                
            else:
                # Create new balance record
                create_response = await client.post(
                    f"{supabase_url}/rest/v1/vault_balances",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json={
                        "vault_id": vault_id,
                        "asset_symbol": asset_symbol,
                        "amount": str(amount),
                        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    }
                )
                
                if create_response.status_code != 201:
                    raise Exception(f"Failed to create balance: {create_response.text}")
                
                new_balance = create_response.json()[0]
                new_balance["vault_id"] = vault_id
                return new_balance
                
    except Exception as e:
        print(f"Error in update_vault_balance_api: {str(e)}")
        return {"error": str(e)}

async def log_deposit_transaction_api(
    farm_id: str,
    vault_id: str,
    linked_account_id: str,
    deposit: DepositType,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Log a deposit transaction in the transaction_logs table.
    
    Args:
        farm_id: The farm ID
        vault_id: The vault ID
        linked_account_id: The linked account ID
        deposit: The deposit object
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Created transaction log object
    """
    try:
        transaction_type = "deposit"
        status = "completed"
        
        # Create metadata based on deposit type
        metadata = {
            "deposit_type": deposit.get("deposit_type", "unknown"),
        }
        
        if deposit.get("deposit_type") == "blockchain":
            metadata.update({
                "block_number": deposit.get("block_number"),
                "from_address": deposit.get("from_address"),
                "to_address": deposit.get("to_address")
            })
        elif deposit.get("deposit_type") == "exchange":
            metadata.update({
                "address": deposit.get("address"),
                "tag": deposit.get("tag")
            })
        
        # Format timestamp
        executed_at = datetime.datetime.fromtimestamp(
            deposit.get("timestamp", int(time.time())),
            datetime.timezone.utc
        ).isoformat()
        
        # Create transaction log
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_url}/rest/v1/transaction_logs",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "farm_id": farm_id,
                    "vault_id": vault_id,
                    "linked_account_id": linked_account_id,
                    "transaction_type": transaction_type,
                    "asset_symbol": deposit["asset_symbol"],
                    "amount": str(deposit["amount"]),
                    "status": status,
                    "transaction_hash": deposit.get("transaction_hash", ""),
                    "external_id": deposit.get("external_id", ""),
                    "description": f"Deposit of {deposit['amount']} {deposit['asset_symbol']}",
                    "metadata": metadata,
                    "executed_at": executed_at
                }
            )
            
            if response.status_code != 201:
                raise Exception(f"Failed to create transaction log: {response.text}")
            
            return response.json()[0]
            
    except Exception as e:
        print(f"Error in log_deposit_transaction_api: {str(e)}")
        return {"error": str(e)}

async def update_last_monitored_at(
    account_id: str,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Update the last_monitored_at timestamp for a linked account.
    
    Args:
        account_id: The linked account ID
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Updated account object
    """
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{supabase_url}/rest/v1/linked_accounts",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                params={
                    "id": f"eq.{account_id}"
                },
                json={
                    "last_monitored_at": now
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to update last_monitored_at: {response.text}")
            
            return response.json()[0]
            
    except Exception as e:
        print(f"Error in update_last_monitored_at: {str(e)}")
        return {"error": str(e)} 