"""
Vault Banking Routes - Handles routes for the vault banking system dashboard
"""
import json
from flask import Blueprint, render_template, request, jsonify
from ..elizaos_integration import get_elizaos_client

vault_banking = Blueprint('vault_banking', __name__)

# Create ElizaOS client connection for vault banking
def get_bank_client():
    elizaos = get_elizaos_client()
    return elizaos.get_bank_client()

@vault_banking.route('/banking')
def banking_dashboard():
    """Render the vault banking dashboard"""
    try:
        # Get vault status
        bank = get_bank_client()
        vault_status = bank.get_vault_status()
        vault_frozen = vault_status.get('frozen', False)
        
        return render_template('vault_banking.html', vault_frozen=vault_frozen)
    except Exception as e:
        # Handle any errors
        return render_template('vault_banking.html', vault_frozen=False, error=str(e))

# === API Routes ===

@vault_banking.route('/api/vault/status')
def vault_status():
    """Get the current status of the vault"""
    try:
        bank = get_bank_client()
        status = bank.get_vault_status()
        return jsonify({"success": True, "status": status})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/balances')
def vault_balances():
    """Get the balances of the master vault"""
    try:
        bank = get_bank_client()
        balances = bank.get_entity_balance('vault')
        return jsonify({"success": True, "balances": balances})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transactions/pending')
def pending_transactions():
    """Get all pending transactions"""
    try:
        bank = get_bank_client()
        transactions = bank.get_pending_transactions()
        return jsonify({"success": True, "transactions": transactions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transactions/history')
def transaction_history():
    """Get transaction history with optional filters"""
    try:
        # Get filter parameters
        chain_id = request.args.get('chain_id')
        asset = request.args.get('asset')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        
        # Get transaction history
        bank = get_bank_client()
        transactions = bank.get_transaction_history(limit=limit)
        
        # Apply filters
        if chain_id:
            transactions = [tx for tx in transactions if tx.get('chain_id') == chain_id]
        if asset:
            transactions = [tx for tx in transactions if tx.get('asset') == asset]
        if status:
            transactions = [tx for tx in transactions if tx.get('status', '').lower() == status.lower()]
        
        return jsonify({"success": True, "transactions": transactions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transaction/<transaction_id>')
def get_transaction(transaction_id):
    """Get details of a specific transaction"""
    try:
        bank = get_bank_client()
        # This is a placeholder - implement the actual method in the bank client
        transaction = bank.get_transaction(transaction_id)
        return jsonify({"success": True, "transaction": transaction})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transaction', methods=['POST'])
def create_transaction():
    """Create a new transaction from the vault"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        chain_id = data.get('chain_id')
        to_address = data.get('to_address')
        asset = data.get('asset')
        amount = float(data.get('amount'))
        metadata = data.get('metadata')
        
        # Create transaction
        result = bank.create_vault_transaction(
            chain_id=chain_id,
            to_address=to_address,
            amount=amount,
            asset=asset,
            metadata=metadata
        )
        
        return jsonify({"success": True, "transaction": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transaction/<transaction_id>/approve', methods=['POST'])
def approve_transaction(transaction_id):
    """Approve a pending transaction"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        approver_key = data.get('key')
        notes = data.get('notes')
        
        # Approve transaction
        result = bank.approve_transaction(
            transaction_id=transaction_id,
            approver_key=approver_key,
            notes=notes
        )
        
        return jsonify({"success": True, "transaction": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transaction/<transaction_id>/reject', methods=['POST'])
def reject_transaction(transaction_id):
    """Reject a pending transaction"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        rejector_key = data.get('key')
        reason = data.get('reason')
        
        # Reject transaction
        result = bank.reject_transaction(
            transaction_id=transaction_id,
            rejector_key=rejector_key,
            reason=reason
        )
        
        return jsonify({"success": True, "transaction": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/freeze', methods=['POST'])
def freeze_vault():
    """Freeze all vault operations (emergency measure)"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        key = data.get('key')
        reason = data.get('reason')
        
        # Freeze vault
        result = bank.freeze_vault(key=key, reason=reason)
        
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/unfreeze', methods=['POST'])
def unfreeze_vault():
    """Unfreeze vault operations"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        key = data.get('key')
        reason = data.get('reason')
        
        # Unfreeze vault
        result = bank.unfreeze_vault(key=key, reason=reason)
        
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/agents')
def get_agents():
    """Get all registered agents"""
    try:
        # This is a placeholder - implement the actual method to get agents
        # This would likely come from the ElizaOS integration
        elizaos = get_elizaos_client()
        agents = elizaos.get_agents()
        
        return jsonify({"success": True, "agents": agents})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/agent/<agent_id>/wallets')
def get_agent_wallets(agent_id):
    """Get all wallets for a specific agent"""
    try:
        bank = get_bank_client()
        wallets = bank.get_agent_wallets(agent_id)
        
        return jsonify({"success": True, "wallets": wallets})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/wallet/<wallet_id>')
def get_wallet(wallet_id):
    """Get details of a specific wallet"""
    try:
        bank = get_bank_client()
        wallet = bank.get_wallet(wallet_id)
        
        return jsonify({"success": True, "wallet": wallet})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/wallet/<wallet_id>/balances')
def get_wallet_balances(wallet_id):
    """Get balances of a specific wallet"""
    try:
        bank = get_bank_client()
        balances = bank.get_entity_balance(wallet_id)
        
        return jsonify({"success": True, "balances": balances})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/wallet', methods=['POST'])
def create_wallet():
    """Create a new wallet for an agent"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        agent_id = data.get('agent_id')
        name = data.get('name')
        wallet_type = data.get('wallet_type', 'trading')
        purpose = data.get('purpose')
        custom_permissions = data.get('permissions')
        custom_limits = data.get('limits')
        
        # Create wallet
        result = bank.create_agent_wallet(
            agent_id=agent_id,
            name=name,
            wallet_type=wallet_type,
            purpose=purpose,
            custom_permissions=custom_permissions,
            custom_limits=custom_limits
        )
        
        return jsonify({"success": True, "wallet": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/wallet/<wallet_id>/fund', methods=['POST'])
def fund_wallet(wallet_id):
    """Fund a wallet from the vault"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        admin_key = data.get('key')
        agent_id = data.get('agent_id')
        chain_id = data.get('chain_id')
        asset = data.get('asset')
        amount = float(data.get('amount'))
        memo = data.get('memo')
        
        # Fund wallet
        result = bank.fund_agent_wallet(
            admin_key=admin_key,
            agent_id=agent_id,
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            memo=memo
        )
        
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/transfer', methods=['POST'])
def transfer_between_agents():
    """Transfer funds between two agent wallets"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        from_agent_id = data.get('from_agent_id')
        to_agent_id = data.get('to_agent_id')
        chain_id = data.get('chain_id')
        asset = data.get('asset')
        amount = float(data.get('amount'))
        memo = data.get('memo')
        
        # Transfer funds
        result = bank.transfer_between_agents(
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            chain_id=chain_id,
            asset=asset,
            amount=amount,
            memo=memo
        )
        
        return jsonify({"success": True, "transfer": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/transfer/cross-chain', methods=['POST'])
def cross_chain_transfer():
    """Transfer funds across different chains"""
    try:
        data = request.json
        bank = get_bank_client()
        
        # Extract required fields
        from_agent_id = data.get('from_agent_id')
        from_chain_id = data.get('from_chain_id')
        to_chain_id = data.get('to_chain_id')
        asset = data.get('asset')
        amount = float(data.get('amount'))
        to_agent_id = data.get('to_agent_id')
        memo = data.get('memo')
        
        # Cross-chain transfer
        result = bank.cross_chain_transfer(
            from_agent_id=from_agent_id,
            from_chain_id=from_chain_id,
            to_chain_id=to_chain_id,
            asset=asset,
            amount=amount,
            to_agent_id=to_agent_id,
            memo=memo
        )
        
        return jsonify({"success": True, "transfer": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/transfers/recent')
def recent_transfers():
    """Get recent transfers"""
    try:
        bank = get_bank_client()
        
        # Placeholder - implement the actual method to get recent transfers
        # This would likely come from the transfer network
        transfers = bank.transfer_network.get_recent_transfers()
        
        return jsonify({"success": True, "transfers": transfers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/bridges')
def bridge_routes():
    """Get available bridge routes for cross-chain transfers"""
    try:
        bank = get_bank_client()
        
        # Placeholder - implement the actual method to get bridge routes
        # This would likely come from the transfer network
        bridges = bank.transfer_network.get_bridge_routes()
        
        return jsonify({"success": True, "bridges": bridges})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/chains')
def get_chains():
    """Get supported blockchain chains"""
    try:
        # Placeholder - implement the actual method to get supported chains
        chains = [
            {"id": "eth", "name": "Ethereum"},
            {"id": "bsc", "name": "BNB Chain"},
            {"id": "polygon", "name": "Polygon"},
            {"id": "avalanche", "name": "Avalanche"},
            {"id": "solana", "name": "Solana"}
        ]
        
        return jsonify({"success": True, "chains": chains})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/assets')
def get_assets():
    """Get supported assets/tokens"""
    try:
        # Placeholder - implement the actual method to get supported assets
        assets = [
            {"id": "BTC", "name": "Bitcoin"},
            {"id": "ETH", "name": "Ethereum"},
            {"id": "USDT", "name": "Tether"},
            {"id": "USDC", "name": "USD Coin"},
            {"id": "BNB", "name": "Binance Coin"}
        ]
        
        return jsonify({"success": True, "assets": assets})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/analytics')
def get_analytics():
    """Get analytics data for the vault banking system"""
    try:
        bank = get_bank_client()
        
        # Placeholder - implement the actual method to get analytics data
        # This would likely come from the ledger
        
        # Sample data for the charts
        tx_volume = {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "datasets": [
                {
                    "label": "Transaction Volume",
                    "data": [12, 19, 3, 5, 2, 3],
                    "backgroundColor": "rgba(75, 192, 192, 0.2)",
                    "borderColor": "rgba(75, 192, 192, 1)",
                    "borderWidth": 1
                }
            ]
        }
        
        asset_distribution = {
            "labels": ["BTC", "ETH", "USDT", "USDC", "BNB"],
            "datasets": [
                {
                    "label": "Asset Distribution",
                    "data": [30, 25, 20, 15, 10],
                    "backgroundColor": [
                        "rgba(255, 99, 132, 0.2)",
                        "rgba(54, 162, 235, 0.2)",
                        "rgba(255, 206, 86, 0.2)",
                        "rgba(75, 192, 192, 0.2)",
                        "rgba(153, 102, 255, 0.2)"
                    ],
                    "borderColor": [
                        "rgba(255, 99, 132, 1)",
                        "rgba(54, 162, 235, 1)",
                        "rgba(255, 206, 86, 1)",
                        "rgba(75, 192, 192, 1)",
                        "rgba(153, 102, 255, 1)"
                    ],
                    "borderWidth": 1
                }
            ]
        }
        
        metrics = {
            "total_tx_volume": 12345.67,
            "avg_tx_size": 123.45,
            "active_wallets": 42
        }
        
        return jsonify({
            "success": True,
            "tx_volume": tx_volume,
            "asset_distribution": asset_distribution,
            "metrics": metrics
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@vault_banking.route('/api/vault/export/transactions')
def export_transactions():
    """Export transactions to a CSV file"""
    try:
        # Get filter parameters
        chain_id = request.args.get('chain_id')
        asset = request.args.get('asset')
        status = request.args.get('status')
        
        bank = get_bank_client()
        
        # Get all transactions for export
        transactions = bank.get_transaction_history(limit=1000)
        
        # Apply filters
        if chain_id:
            transactions = [tx for tx in transactions if tx.get('chain_id') == chain_id]
        if asset:
            transactions = [tx for tx in transactions if tx.get('asset') == asset]
        if status:
            transactions = [tx for tx in transactions if tx.get('status', '').lower() == status.lower()]
        
        # Create CSV content
        csv_content = "ID,Type,From,To,Amount,Asset,Chain,Status,Date\n"
        
        for tx in transactions:
            csv_content += f"{tx.get('id', '')},{tx.get('type', 'Transfer')},{tx.get('from_address', '')},{tx.get('to_address', '')},"
            csv_content += f"{tx.get('amount', '')},{tx.get('asset', '')},{tx.get('chain_id', '')},"
            csv_content += f"{tx.get('status', '')},{tx.get('timestamp', tx.get('created_at', ''))}\n"
        
        # Create response with CSV file
        from flask import Response
        response = Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=transactions_export.csv"}
        )
        
        return response
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
