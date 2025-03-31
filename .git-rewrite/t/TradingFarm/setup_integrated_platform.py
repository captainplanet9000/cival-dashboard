"""
Setup script for the integrated Trading Farm platform with ElizaOS integration.
This script will check for required dependencies, set up configuration files,
and guide you through the setup process.
"""
import os
import sys
import json
import subprocess
import logging
import argparse
from typing import Dict, Any, List, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("setup")

# Required Python packages
REQUIRED_PACKAGES = [
    'flask', 
    'requests', 
    'python-dotenv', 
    'psycopg2-binary', 
    'websocket-client',
    'pyjwt',
    'matplotlib'
]

# Required environment variables
REQUIRED_ENV_VARS = [
    'NEON_API_KEY', 
    'NEON_PROJECT_ID', 
    'NEON_BRANCH_ID',
    'HYPERLIQUID_PRIVATE_KEY', 
    'HYPERLIQUID_WALLET_ADDRESS'
]

def check_python_version() -> bool:
    """Check if Python version is 3.7 or higher."""
    python_major = sys.version_info.major
    python_minor = sys.version_info.minor
    
    if python_major < 3 or (python_major == 3 and python_minor < 7):
        logger.error(f"Python 3.7+ is required. Detected: {python_major}.{python_minor}")
        return False
    
    logger.info(f"Python version check passed: {python_major}.{python_minor}")
    return True

def install_dependencies() -> bool:
    """Install required Python packages."""
    try:
        logger.info("Checking and installing required packages...")
        missing_packages = []
        
        for package in REQUIRED_PACKAGES:
            try:
                __import__(package.split('==')[0])
                logger.info(f"✓ {package} already installed")
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            logger.info(f"Installing missing packages: {', '.join(missing_packages)}")
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
            logger.info("All packages installed successfully")
            
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install dependencies: {e}")
        return False

def check_env_variables() -> List[str]:
    """Check if required environment variables are set."""
    missing_vars = []
    
    for var in REQUIRED_ENV_VARS:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")
    else:
        logger.info("✓ All required environment variables are set")
    
    return missing_vars

def create_env_file(missing_vars: List[str]) -> bool:
    """Create or update .env file with missing variables."""
    if not missing_vars:
        return True
    
    try:
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
        
        # Read existing .env file if it exists
        env_vars = {}
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        env_vars[key] = value
        
        # Add missing variables to the dict
        for var in missing_vars:
            if var not in env_vars:
                env_vars[var] = ""
        
        # Write back to .env file
        with open(env_path, 'w') as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        
        logger.info(f"Created/updated .env file at {env_path}")
        logger.info("Please fill in the missing environment variables")
        return True
    except Exception as e:
        logger.error(f"Failed to create .env file: {e}")
        return False

def check_directory_structure() -> bool:
    """Check and create necessary directories."""
    required_dirs = [
        'dashboard/static/css',
        'dashboard/static/js',
        'dashboard/templates',
        'elizaos_mcp_server'
    ]
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    for dir_path in required_dirs:
        full_path = os.path.join(base_dir, dir_path)
        if not os.path.exists(full_path):
            try:
                os.makedirs(full_path)
                logger.info(f"Created directory: {dir_path}")
            except Exception as e:
                logger.error(f"Failed to create directory {dir_path}: {e}")
                return False
    
    logger.info("✓ Directory structure check passed")
    return True

def check_neon_database() -> bool:
    """Check connection to Neon database."""
    try:
        # Import here to avoid dependency issues if not installed
        import psycopg2
        from elizaos_mcp_server.neon_store import NeonStrategyStore
        
        neon_project_id = os.getenv('NEON_PROJECT_ID')
        neon_branch_id = os.getenv('NEON_BRANCH_ID')
        neon_api_key = os.getenv('NEON_API_KEY')
        
        if not all([neon_project_id, neon_branch_id, neon_api_key]):
            logger.warning("Skipping Neon database check due to missing environment variables")
            return False
        
        # Create a store instance
        store = NeonStrategyStore()
        
        # Test connection
        logger.info("Testing connection to Neon database...")
        connected = store.test_connection()
        
        if connected:
            logger.info("✓ Successfully connected to Neon database")
            return True
        else:
            logger.error("Failed to connect to Neon database")
            return False
    except Exception as e:
        logger.error(f"Error checking Neon database: {e}")
        return False

def check_hyperliquid_connection() -> bool:
    """Check connection to Hyperliquid."""
    try:
        import requests
        
        wallet_address = os.getenv('HYPERLIQUID_WALLET_ADDRESS')
        
        if not wallet_address:
            logger.warning("Skipping Hyperliquid connection check due to missing wallet address")
            return False
        
        # Test connection by fetching account info
        logger.info("Testing connection to Hyperliquid API...")
        response = requests.get(f"https://api.hyperliquid.xyz/info?type=userState&user={wallet_address}")
        
        if response.status_code == 200:
            logger.info("✓ Successfully connected to Hyperliquid API")
            return True
        else:
            logger.error(f"Failed to connect to Hyperliquid API: {response.status_code} {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error checking Hyperliquid connection: {e}")
        return False

def create_elizaos_config() -> bool:
    """Create or update ElizaOS config file."""
    try:
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'elizaos_config.json')
        
        config = {
            "chains": {
                "hyperliquid": {
                    "enabled": True,
                    "api_base_url": "https://api.hyperliquid.xyz",
                    "ws_url": "wss://api.hyperliquid.xyz/ws"
                },
                "arbitrum": {
                    "enabled": False,
                    "api_base_url": "",
                    "rpc_url": ""
                },
                "sonic": {
                    "enabled": False,
                    "api_base_url": "",
                    "ws_url": ""
                },
                "solana": {
                    "enabled": False,
                    "api_base_url": "",
                    "rpc_url": ""
                }
            },
            "database": {
                "type": "neon",
                "project_id": "${NEON_PROJECT_ID}",
                "branch_id": "${NEON_BRANCH_ID}",
                "database_name": "trading_farm"
            },
            "storage_path": "storage",
            "log_level": "info",
            "api": {
                "port": 3000,
                "host": "0.0.0.0"
            },
            "agents": {
                "eliza_trading_agent_1": {
                    "name": "ElizaOS Trading Agent",
                    "description": "Main trading agent for the Trading Farm",
                    "models": ["gpt-4", "mistral-large"],
                    "memory_capacity": 100,
                    "functions": [
                        "analyze_market",
                        "execute_trade",
                        "manage_risk",
                        "optimize_strategy"
                    ]
                }
            }
        }
        
        # Write config to file
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Created ElizaOS config file at {config_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create ElizaOS config file: {e}")
        return False

def setup_database_tables() -> bool:
    """Set up required database tables."""
    try:
        # Import here to avoid dependency issues if not installed
        from elizaos_mcp_server.neon_store import NeonStrategyStore
        
        neon_project_id = os.getenv('NEON_PROJECT_ID')
        neon_branch_id = os.getenv('NEON_BRANCH_ID')
        neon_api_key = os.getenv('NEON_API_KEY')
        
        if not all([neon_project_id, neon_branch_id, neon_api_key]):
            logger.warning("Skipping database table setup due to missing environment variables")
            return False
        
        logger.info("Setting up database tables...")
        
        # Create a store instance
        store = NeonStrategyStore()
        
        # Initialize tables
        success = store.initialize_tables()
        
        if success:
            logger.info("✓ Successfully set up database tables")
            return True
        else:
            logger.error("Failed to set up database tables")
            return False
    except Exception as e:
        logger.error(f"Error setting up database tables: {e}")
        return False

def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(description="Set up the integrated Trading Farm platform")
    parser.add_argument("--skip-deps", action="store_true", help="Skip dependency installation")
    parser.add_argument("--skip-db", action="store_true", help="Skip database setup")
    args = parser.parse_args()
    
    logger.info("=== Trading Farm Platform Setup ===")
    
    # Check Python version
    if not check_python_version():
        logger.error("Setup cannot continue due to Python version requirement")
        return False
    
    # Check directory structure
    if not check_directory_structure():
        logger.error("Setup cannot continue due to directory structure issues")
        return False
    
    # Install dependencies
    if not args.skip_deps and not install_dependencies():
        logger.error("Setup cannot continue due to dependency installation failure")
        return False
    
    # Check environment variables
    missing_vars = check_env_variables()
    if missing_vars:
        create_env_file(missing_vars)
        logger.warning("Please fill in the missing environment variables in the .env file and run this script again")
        return False
    
    # Create ElizaOS config
    if not create_elizaos_config():
        logger.warning("Failed to create ElizaOS config file")
    
    # Check Neon database connection
    if not args.skip_db and not check_neon_database():
        logger.warning("Failed to connect to Neon database. Some functionality may not work")
    
    # Check Hyperliquid connection
    if not check_hyperliquid_connection():
        logger.warning("Failed to connect to Hyperliquid API. Some functionality may not work")
    
    # Set up database tables
    if not args.skip_db and not setup_database_tables():
        logger.warning("Failed to set up database tables. Some functionality may not work")
    
    logger.info("=== Setup Complete ===")
    logger.info("")
    logger.info("Next steps:")
    logger.info("1. Run 'python run_elizaos_server.py' to start the ElizaOS MCP server")
    logger.info("2. Run 'python run_integrated_dashboard.py' to start the dashboard")
    logger.info("3. Open your browser at http://localhost:9386 to access the dashboard")
    
    return True

if __name__ == "__main__":
    main()
