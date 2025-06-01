import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
import hashlib

# For exchange API interactions
import ccxt.async_support as ccxt

# For blockchain wallet interactions
from web3 import Web3, AsyncHTTPProvider
from web3.eth import AsyncEth

# Supabase client for database operations
from supabase import create_client, Client

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('deposit_monitor')

# Exchange provider mapping
EXCHANGE_CLASS_MAP = {
    'binance': ccxt.binance,
    'coinbase': ccxt.coinbase,
    'bybit': ccxt.bybit,
    'okx': ccxt.okx,
    'hyperliquid': None,  # Custom handling required
    # Add other exchanges as needed
}

# Blockchain provider mapping
BLOCKCHAIN_NETWORK_MAP = {
    'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/',
    'arbitrum': 'https://arb-mainnet.g.alchemy.com/v2/',
    'base': 'https://base-mainnet.g.alchemy.com/v2/',
    'solana': None,  # Custom handling required
    # Add other networks as needed
}

# Function to get monitorable accounts from database
async def get_monitorable_accounts(supabase_url: str, supabase_key: str) -> List[Dict[str, Any]]:
    """
    Fetch linked accounts that require monitoring from the database
    
    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        List of account records that need monitoring
    """
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        
        # Get accounts marked for monitoring
        response = await asyncio.to_thread(
            lambda: supabase.table('linked_accounts')
                .select('*')
                .eq('requires_monitoring', True)
                .eq('status', 'active')
                .execute()
        )
        
        if not response.data:
            logger.info("No monitorable accounts found")
            return []
            
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching monitorable accounts: {str(e)}")
        return []

# Function to decrypt account credentials
async def get_decrypted_creds(
    account: Dict[str, Any], 
    vault_encryption_key: str, 
    supabase_url: str, 
    supabase_key: str
) -> Dict[str, Any]:
    """
    Decrypt the encrypted credentials for an account
    
    Args:
        account: The linked account record with encrypted_credentials
        vault_encryption_key: Master key for decryption
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Dictionary with decrypted credentials
    """
    try:
        if not account.get('encrypted_credentials'):
            logger.error(f"Account {account['id']} has no encrypted credentials")
            return {}
            
        # In a production environment, you would use a secure method to decrypt the credentials
        # Here's a simplified version for demonstration
        from cryptography.fernet import Fernet
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        import base64
        
        # Derive a key from the master key
        salt = account['id'].encode()[:16].ljust(16, b'\0')  # Use account ID as salt
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(vault_encryption_key.encode()))
        
        # Create a Fernet cipher
        cipher = Fernet(key)
        
        # Decrypt the credentials
        decrypted_data = cipher.decrypt(account['encrypted_credentials'].encode()).decode()
        credentials = json.loads(decrypted_data)
        
        return credentials
        
    except Exception as e:
        logger.error(f"Error decrypting credentials for account {account['id']}: {str(e)}")
        return {}

# Function to check external deposits for exchange accounts
async def check_exchange_deposits(
    account: Dict[str, Any], 
    credentials: Dict[str, Any],
    last_check_time: datetime
) -> List[Dict[str, Any]]:
    """
    Check for new deposits on an exchange account since the last check
    
    Args:
        account: The linked account record
        credentials: Decrypted API credentials for the exchange
        last_check_time: Timestamp of the last check
        
    Returns:
        List of new deposit transactions found
    """
    try:
        # Get the appropriate exchange class
        provider = account.get('provider', '').lower()
        exchange_class = EXCHANGE_CLASS_MAP.get(provider)
        
        if not exchange_class:
            logger.error(f"Unsupported exchange provider: {provider}")
            return []
            
        # Initialize exchange client with credentials
        exchange_options = {}
        if provider == 'binance':
            exchange_options = {
                'apiKey': credentials.get('api_key'),
                'secret': credentials.get('api_secret'),
            }
        elif provider == 'coinbase':
            exchange_options = {
                'apiKey': credentials.get('api_key'),
                'secret': credentials.get('api_secret'),
            }
        elif provider == 'bybit':
            exchange_options = {
                'apiKey': credentials.get('api_key'),
                'secret': credentials.get('api_secret'),
            }
        elif provider == 'okx':
            exchange_options = {
                'apiKey': credentials.get('api_key'),
                'secret': credentials.get('api_secret'),
                'password': credentials.get('passphrase', ''),
            }
        
        exchange = exchange_class(exchange_options)
        
        try:
            # Convert last_check_time to milliseconds timestamp for CCXT
            since = int(last_check_time.timestamp() * 1000)
            
            # Fetch deposit history
            # Note: The exact method might vary between exchanges
            deposits = await exchange.fetch_deposits(None, since)
            
            # Filter for completed/confirmed deposits
            new_deposits = []
            for deposit in deposits:
                # Check if the deposit is confirmed/completed
                if deposit['status'] in ['ok', 'complete', 'confirmed']:
                    # Create a standardized transaction record
                    tx = {
                        'external_id': deposit['id'],
                        'transaction_hash': deposit.get('txid'),
                        'asset_symbol': deposit['currency'],
                        'amount': float(deposit['amount']),
                        'status': 'completed',
                        'executed_at': datetime.fromtimestamp(deposit['timestamp'] / 1000, tz=timezone.utc),
                        'metadata': {
                            'exchange': provider,
                            'raw_data': deposit
                        }
                    }
                    new_deposits.append(tx)
            
            return new_deposits
                
        finally:
            # Always close the exchange client
            await exchange.close()
        
    except Exception as e:
        logger.error(f"Error checking exchange deposits for account {account['id']}: {str(e)}")
        return []

# Function to check blockchain wallet deposits
async def check_blockchain_deposits(
    account: Dict[str, Any], 
    credentials: Dict[str, Any],
    blockchain_node_urls: Dict[str, str],
    last_check_time: datetime
) -> List[Dict[str, Any]]:
    """
    Check for new deposits to a blockchain wallet address since the last check
    
    Args:
        account: The linked account record
        credentials: Wallet credentials (address, etc.)
        blockchain_node_urls: URLs for blockchain node providers
        last_check_time: Timestamp of the last check
        
    Returns:
        List of new deposit transactions found
    """
    try:
        wallet_address = credentials.get('address')
        if not wallet_address:
            logger.error(f"No wallet address found in credentials for account {account['id']}")
            return []
            
        # Get blockchain network and URL
        network = account.get('metadata', {}).get('network', 'ethereum').lower()
        base_url = BLOCKCHAIN_NETWORK_MAP.get(network)
        api_key = blockchain_node_urls.get(network)
        
        if not base_url or not api_key:
            logger.error(f"Unsupported blockchain network: {network}")
            return []
            
        # Handle based on network type
        if network in ['ethereum', 'arbitrum', 'base']:
            # Connect to Ethereum-compatible network
            w3 = Web3(AsyncHTTPProvider(f"{base_url}{api_key}"), modules={"eth": (AsyncEth,)})
            
            # Calculate block range: ~15s per block, add buffer
            seconds_since_last_check = (datetime.now(timezone.utc) - last_check_time).total_seconds()
            blocks_to_check = min(10000, int(seconds_since_last_check / 15) + 100)  # Limit to prevent too large queries
            
            # Get current block
            current_block = await w3.eth.block_number
            from_block = max(0, current_block - blocks_to_check)
            
            # Create filter for incoming transactions to the wallet address
            address_filter = {
                'fromBlock': from_block,
                'toBlock': 'latest',
                'address': Web3.to_checksum_address(wallet_address),
            }
            
            # Get transaction events
            txs = await w3.eth.get_logs(address_filter)
            
            # Process transaction logs
            new_deposits = []
            for tx in txs:
                # Get the full transaction
                tx_hash = tx.transactionHash.hex()
                tx_data = await w3.eth.get_transaction(tx_hash)
                tx_receipt = await w3.eth.get_transaction_receipt(tx_hash)
                
                # Skip failed transactions
                if tx_receipt.status != 1:
                    continue
                    
                # Get timestamp of the block
                block = await w3.eth.get_block(tx.blockNumber)
                tx_time = datetime.fromtimestamp(block.timestamp, tz=timezone.utc)
                
                # Skip if transaction is older than last check
                if tx_time <= last_check_time:
                    continue
                
                # For simplicity, assume ETH transfer (token parsing would require more logic)
                # In a real implementation, you'd parse ERC20 transfers from logs
                if tx_data.to.lower() == wallet_address.lower():
                    new_deposits.append({
                        'external_id': f"{network}_{tx_hash}",
                        'transaction_hash': tx_hash,
                        'asset_symbol': 'ETH',  # Default for native currency
                        'amount': w3.from_wei(tx_data.value, 'ether'),
                        'status': 'completed',
                        'executed_at': tx_time,
                        'metadata': {
                            'network': network,
                            'block_number': tx.blockNumber,
                            'from_address': tx_data.get('from')
                        }
                    })
            
            return new_deposits
            
        else:
            logger.warning(f"Network {network} checking not yet implemented")
            return []
        
    except Exception as e:
        logger.error(f"Error checking blockchain deposits for account {account['id']}: {str(e)}")
        return []

# Function to update vault balance and log transaction via API
async def update_vault_balance_api(
    farm_id: str,
    asset_symbol: str,
    amount: float,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Update the vault balance via Supabase API
    
    Args:
        farm_id: ID of the farm
        asset_symbol: Symbol of the asset (e.g., BTC, ETH)
        amount: Amount to add to the balance
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        API response data
    """
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        
        # Get the vault for this farm
        vault_response = await asyncio.to_thread(
            lambda: supabase.table('vaults')
                .select('id')
                .eq('farm_id', farm_id)
                .limit(1)
                .execute()
        )
        
        if not vault_response.data or len(vault_response.data) == 0:
            # Create a default vault if none exists
            vault_response = await asyncio.to_thread(
                lambda: supabase.table('vaults')
                    .insert({
                        'farm_id': farm_id,
                        'name': 'Default Vault',
                        'description': 'Auto-created vault for deposits'
                    })
                    .execute()
            )
            
        vault_id = vault_response.data[0]['id']
        
        # Check if balance record exists
        balance_response = await asyncio.to_thread(
            lambda: supabase.table('vault_balances')
                .select('id, amount')
                .eq('vault_id', vault_id)
                .eq('asset_symbol', asset_symbol)
                .limit(1)
                .execute()
        )
        
        if balance_response.data and len(balance_response.data) > 0:
            # Update existing balance
            balance_id = balance_response.data[0]['id']
            current_amount = float(balance_response.data[0]['amount'])
            new_amount = current_amount + amount
            
            result = await asyncio.to_thread(
                lambda: supabase.table('vault_balances')
                    .update({
                        'amount': new_amount,
                        'last_updated': datetime.now(timezone.utc).isoformat()
                    })
                    .eq('id', balance_id)
                    .execute()
            )
            
            return result.data[0] if result.data else {"error": "Failed to update balance"}
            
        else:
            # Create new balance record
            result = await asyncio.to_thread(
                lambda: supabase.table('vault_balances')
                    .insert({
                        'vault_id': vault_id,
                        'asset_symbol': asset_symbol,
                        'amount': amount,
                        'last_updated': datetime.now(timezone.utc).isoformat()
                    })
                    .execute()
            )
            
            return result.data[0] if result.data else {"error": "Failed to create balance"}
            
    except Exception as e:
        logger.error(f"Error updating vault balance: {str(e)}")
        return {"error": str(e)}

# Function to log transaction
async def log_deposit_transaction_api(
    farm_id: str,
    vault_id: str,
    linked_account_id: str,
    deposit: Dict[str, Any],
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Log a deposit transaction via Supabase API
    
    Args:
        farm_id: ID of the farm
        vault_id: ID of the vault
        linked_account_id: ID of the linked account
        deposit: Dictionary with deposit details
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        API response data
    """
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        
        # Check if this transaction has already been recorded to avoid duplicates
        external_id = deposit.get('external_id')
        tx_hash = deposit.get('transaction_hash')
        
        query = supabase.table('transaction_logs').select('id')
        if external_id:
            query = query.eq('external_id', external_id)
        elif tx_hash:
            query = query.eq('transaction_hash', tx_hash)
        else:
            # Create a unique ID based on the transaction data
            unique_str = f"{farm_id}_{deposit.get('asset_symbol')}_{deposit.get('amount')}_{deposit.get('executed_at')}"
            unique_id = hashlib.md5(unique_str.encode()).hexdigest()
            external_id = f"generated_{unique_id}"
        
        existing_response = await asyncio.to_thread(lambda: query.execute())
        
        if existing_response.data and len(existing_response.data) > 0:
            # Transaction already recorded
            logger.info(f"Transaction already recorded: {external_id or tx_hash}")
            return {"id": existing_response.data[0]['id'], "already_recorded": True}
        
        # Log the new transaction
        tx_data = {
            'farm_id': farm_id,
            'vault_id': vault_id,
            'linked_account_id': linked_account_id,
            'transaction_type': 'deposit',
            'asset_symbol': deposit.get('asset_symbol'),
            'amount': deposit.get('amount'),
            'status': 'completed',
            'executed_at': deposit.get('executed_at'),
            'description': f"Deposit of {deposit.get('amount')} {deposit.get('asset_symbol')}",
            'metadata': deposit.get('metadata', {})
        }
        
        if external_id:
            tx_data['external_id'] = external_id
        if tx_hash:
            tx_data['transaction_hash'] = tx_hash
            
        result = await asyncio.to_thread(
            lambda: supabase.table('transaction_logs')
                .insert(tx_data)
                .execute()
        )
        
        return result.data[0] if result.data else {"error": "Failed to log transaction"}
            
    except Exception as e:
        logger.error(f"Error logging deposit transaction: {str(e)}")
        return {"error": str(e)}

# Function to update the last_monitored_at timestamp for an account
async def update_last_monitored_at(
    account_id: str,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Update the last_monitored_at timestamp for a linked account
    
    Args:
        account_id: ID of the linked account to update
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        API response data
    """
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        
        # Update timestamp
        result = await asyncio.to_thread(
            lambda: supabase.table('linked_accounts')
                .update({
                    'last_monitored_at': datetime.now(timezone.utc).isoformat()
                })
                .eq('id', account_id)
                .execute()
        )
        
        return result.data[0] if result.data else {"error": "Failed to update last_monitored_at timestamp"}
            
    except Exception as e:
        logger.error(f"Error updating last_monitored_at for account {account_id}: {str(e)}")
        return {"error": str(e)}

# Main function to monitor deposits for an account
async def monitor_account_deposits(
    account: Dict[str, Any],
    vault_encryption_key: str,
    blockchain_node_urls: Dict[str, str],
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Monitor deposits for a single account
    
    Args:
        account: The linked account record
        vault_encryption_key: Master key for decrypting credentials
        blockchain_node_urls: URLs for blockchain node providers
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Summary of monitoring results
    """
    try:
        logger.info(f"Monitoring deposits for account: {account['id']} ({account['name']})")
        
        # Get last check time from metadata or default to 24 hours ago
        last_check_time = datetime.now(timezone.utc) - timedelta(hours=24)
        if account.get('last_monitored_at'):
            try:
                last_check_time = datetime.fromisoformat(account['last_monitored_at'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass
                
        # Decrypt account credentials
        credentials = await get_decrypted_creds(account, vault_encryption_key, supabase_url, supabase_key)
        if not credentials:
            return {
                "account_id": account['id'],
                "success": False,
                "error": "Failed to decrypt credentials",
                "deposits_found": 0
            }
            
        # Check for deposits based on account type
        new_deposits = []
        account_type = account.get('type', '').lower()
        
        if account_type == 'exchange_api':
            new_deposits = await check_exchange_deposits(account, credentials, last_check_time)
        elif account_type == 'defi_wallet':
            new_deposits = await check_blockchain_deposits(
                account, credentials, blockchain_node_urls, last_check_time
            )
        else:
            logger.warning(f"Unsupported account type: {account_type}")
            
        # Update last monitored timestamp
        supabase = create_client(supabase_url, supabase_key)
        await asyncio.to_thread(
            lambda: supabase.table('linked_accounts')
                .update({'last_monitored_at': datetime.now(timezone.utc).isoformat()})
                .eq('id', account['id'])
                .execute()
        )
        
        # Process any deposits found
        processed_deposits = []
        for deposit in new_deposits:
            logger.info(f"Processing deposit: {deposit['asset_symbol']} {deposit['amount']}")
            
            # Update vault balance
            balance_result = await update_vault_balance_api(
                account['farm_id'],
                deposit['asset_symbol'],
                deposit['amount'],
                supabase_url,
                supabase_key
            )
            
            # Get the vault ID (from result or query)
            vault_id = None
            if isinstance(balance_result, dict) and 'vault_id' in balance_result:
                vault_id = balance_result['vault_id']
            else:
                # Get vault ID from database
                vault_response = await asyncio.to_thread(
                    lambda: supabase.table('vaults')
                        .select('id')
                        .eq('farm_id', account['farm_id'])
                        .limit(1)
                        .execute()
                )
                if vault_response.data and len(vault_response.data) > 0:
                    vault_id = vault_response.data[0]['id']
            
            # Log the transaction
            if vault_id:
                tx_result = await log_deposit_transaction_api(
                    account['farm_id'],
                    vault_id,
                    account['id'],
                    deposit,
                    supabase_url,
                    supabase_key
                )
                
                processed_deposits.append({
                    "deposit": deposit,
                    "balance_update": balance_result,
                    "transaction_log": tx_result
                })
                
        return {
            "account_id": account['id'],
            "success": True,
            "deposits_found": len(new_deposits),
            "deposits_processed": len(processed_deposits),
            "deposits_detail": processed_deposits if processed_deposits else None
        }
            
    except Exception as e:
        logger.error(f"Error monitoring deposits for account {account['id']}: {str(e)}")
        return {
            "account_id": account['id'],
            "success": False,
            "error": str(e),
            "deposits_found": 0
        }

# Main deposit monitoring workflow function for Windmill
async def deposit_monitor_flow(
    supabase_url: str,
    supabase_key: str,
    vault_encryption_key: str,
    blockchain_node_urls: Dict[str, str]
) -> Dict[str, Any]:
    """
    Main workflow function for deposit monitoring
    
    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        vault_encryption_key: Master key for decrypting credentials
        blockchain_node_urls: URLs for blockchain node providers
        
    Returns:
        Summary of monitoring results
    """
    try:
        # Get monitorable accounts
        accounts = await get_monitorable_accounts(supabase_url, supabase_key)
        if not accounts:
            return {"success": True, "accounts_checked": 0, "message": "No accounts to monitor"}
            
        # Monitor each account
        results = []
        for account in accounts:
            result = await monitor_account_deposits(
                account,
                vault_encryption_key,
                blockchain_node_urls,
                supabase_url,
                supabase_key
            )
            results.append(result)
            
        # Summarize results
        total_deposits = sum(result.get('deposits_found', 0) for result in results)
        success_count = sum(1 for result in results if result.get('success', False))
        
        return {
            "success": True,
            "accounts_checked": len(accounts),
            "accounts_succeeded": success_count,
            "accounts_failed": len(accounts) - success_count,
            "total_deposits_found": total_deposits,
            "results": results
        }
            
    except Exception as e:
        logger.error(f"Error in deposit monitoring workflow: {str(e)}")
        return {"success": False, "error": str(e)}

# Windmill entry point function
async def main(
    supabase_url: str,
    supabase_key: str,
    vault_encryption_key: str,
    blockchain_node_urls: Dict[str, str] = None
) -> Dict[str, Any]:
    """
    Windmill entry point for deposit monitoring workflow
    
    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        vault_encryption_key: Master key for decrypting credentials
        blockchain_node_urls: URLs for blockchain node providers (optional)
        
    Returns:
        Summary of monitoring results
    """
    # Set default blockchain_node_urls if not provided
    if not blockchain_node_urls:
        blockchain_node_urls = {
            'ethereum': 'j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r',
            'arbitrum': 'j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r',
            'base': 'j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r',
            'solana': 'j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r',
        }
        
    return await deposit_monitor_flow(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        vault_encryption_key=vault_encryption_key,
        blockchain_node_urls=blockchain_node_urls
    ) 