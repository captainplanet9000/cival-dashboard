"""
Vault Banking System Server - Responsible for setting up the Flask server for the vault banking routes
"""
import os
import logging
from flask import Flask, Blueprint, render_template

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("vault_banking_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("vault_banking_server")

def create_vault_banking_app(config=None):
    """
    Create a Flask application for the vault banking system.
    
    Args:
        config: Configuration dictionary
    
    Returns:
        Flask application configured for vault banking
    """
    # Create Flask app
    app = Flask(__name__, 
                template_folder=os.path.join('..', '..', 'dashboard', 'templates'),
                static_folder=os.path.join('..', '..', 'dashboard', 'static'))
    
    # Set secret key for CSRF protection
    app.secret_key = config.get('secret_key', os.urandom(24))
    
    # Import and register route blueprints
    from dashboard.routes.vault_banking import vault_banking
    app.register_blueprint(vault_banking, url_prefix='/vault')
    
    # Add a route for the vault banking index page
    @app.route('/')
    def index():
        return render_template('vault_banking.html')
    
    logger.info("Vault Banking Flask app created")
    return app

def start_vault_banking_server(config=None, host='0.0.0.0', port=9387, debug=False):
    """
    Start the vault banking server.
    
    Args:
        config: Configuration dictionary
        host: Host to bind to
        port: Port to listen on
        debug: Whether to run in debug mode
    """
    app = create_vault_banking_app(config)
    logger.info(f"Starting vault banking server on {host}:{port}")
    app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    # Start the server if run directly
    start_vault_banking_server(debug=True)
