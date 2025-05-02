"""
Vault Banking System Routes - Provides RESTful API endpoints for the vault banking system
"""
import os
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, session

# Configure logging
logger = logging.getLogger("vault_banking_routes")

# Import vault components
from vault.bank import Bank
from vault.master_vault import MasterVault
from vault.agent_wallet import AgentWallet
from vault.ledger import Ledger
from vault.transfer_network import TransferNetwork

# Create blueprint
vault_banking = Blueprint('vault_banking', __name__)

# Initialize bank singleton
bank = Bank()

@vault_banking.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for Railway deployment monitoring
    """
    return jsonify({
        "status": "healthy",
        "service": "vault_banking",
        "version": "1.0.0",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@vault_banking.route('/balance', methods=['GET'])
def get_balances():
    """
    Get balances for all vaults and wallets
    """
    try:
        # Get master vault balance
        master_balance = bank.master_vault.get_balance()
        
        # Get agent wallet balances
        agent_balances = {}
        for agent_id, wallet in bank.agent_wallets.items():
            agent_balances[agent_id] = wallet.get_balance()
        
        return jsonify({
            "status": "success",
            "master_balance": master_balance,
            "agent_balances": agent_balances,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error getting balances: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to get balances: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/transactions', methods=['GET'])
def get_transactions():
    """
    Get transaction history
    """
    try:
        # Get transaction history from ledger
        transactions = bank.ledger.get_transactions()
        
        return jsonify({
            "status": "success",
            "transactions": transactions,
            "count": len(transactions),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error getting transactions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to get transactions: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/transfer', methods=['POST'])
def transfer():
    """
    Transfer funds between wallets
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['source_id', 'destination_id', 'amount', 'currency']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }), 400
        
        # Extract transfer details
        source_id = data['source_id']
        destination_id = data['destination_id']
        amount = float(data['amount'])
        currency = data['currency']
        description = data.get('description', 'Transfer')
        
        # Execute transfer
        transfer_result = bank.transfer_network.execute_transfer(
            source_id=source_id,
            destination_id=destination_id,
            amount=amount,
            currency=currency,
            description=description
        )
        
        return jsonify({
            "status": "success",
            "transfer": transfer_result,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error executing transfer: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to execute transfer: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/wallet/<agent_id>', methods=['GET'])
def get_wallet(agent_id):
    """
    Get wallet details for a specific agent
    """
    try:
        # Check if wallet exists
        if agent_id not in bank.agent_wallets:
            return jsonify({
                "status": "error",
                "message": f"Wallet not found for agent: {agent_id}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }), 404
        
        # Get wallet details
        wallet = bank.agent_wallets[agent_id]
        wallet_details = {
            "agent_id": agent_id,
            "balance": wallet.get_balance(),
            "status": wallet.status,
            "created_at": wallet.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify({
            "status": "success",
            "wallet": wallet_details,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error getting wallet details: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to get wallet details: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/wallet', methods=['POST'])
def create_wallet():
    """
    Create a new agent wallet
    """
    try:
        data = request.json
        
        # Validate required fields
        if 'agent_id' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: agent_id",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # Extract wallet details
        agent_id = data['agent_id']
        initial_balance = data.get('initial_balance', {})
        
        # Check if wallet already exists
        if agent_id in bank.agent_wallets:
            return jsonify({
                "status": "error",
                "message": f"Wallet already exists for agent: {agent_id}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }), 409
        
        # Create new wallet
        wallet = bank.create_agent_wallet(agent_id, initial_balance)
        
        return jsonify({
            "status": "success",
            "wallet": {
                "agent_id": agent_id,
                "balance": wallet.get_balance(),
                "status": wallet.status,
                "created_at": wallet.created_at.strftime("%Y-%m-%d %H:%M:%S")
            },
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error creating wallet: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to create wallet: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/emergency/freeze', methods=['POST'])
def emergency_freeze():
    """
    Emergency freeze all wallets
    """
    try:
        # Freeze all wallets
        bank.emergency_freeze()
        
        return jsonify({
            "status": "success",
            "message": "Emergency freeze activated",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error freezing wallets: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to freeze wallets: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@vault_banking.route('/emergency/unfreeze', methods=['POST'])
def emergency_unfreeze():
    """
    Emergency unfreeze all wallets
    """
    try:
        # Unfreeze all wallets
        bank.emergency_unfreeze()
        
        return jsonify({
            "status": "success",
            "message": "Emergency freeze deactivated",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        logger.error(f"Error unfreezing wallets: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to unfreeze wallets: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 500
