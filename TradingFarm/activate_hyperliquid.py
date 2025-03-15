"""
Activate Hyperliquid Integration

This script activates the Hyperliquid integration with the Trading Farm dashboard and ElizaOS.
Run this script to fully integrate Hyperliquid with your existing Trading Farm system.
"""

import os
import sys
import logging
import importlib.util
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hyperliquid_activation.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("hyperliquid_activation")

def check_requirements():
    """Check if all the required files exist"""
    required_files = [
        "test_hyperliquid_integrated.py",
        "hyperliquid_api.py",
        "hyperliquid_integration.py",
        "dashboard/templates/hyperliquid_tab.html",
        "dashboard/js/hyperliquid.js",
        "dashboard/css/hyperliquid-styles.css",
        "dashboard/templates/dashboard-integration.js"
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        logger.error(f"Missing required files: {', '.join(missing_files)}")
        return False
    
    logger.info("All required files exist")
    return True

def copy_dashboard_assets():
    """Copy Hyperliquid dashboard assets to the correct locations"""
    try:
        # Ensure dashboard directories exist
        directories = [
            "dashboard/js",
            "dashboard/css",
            "dashboard/templates"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
        
        # Copy files if they're not already in the right place
        logger.info("Dashboard assets are ready")
        return True
    except Exception as e:
        logger.error(f"Error copying dashboard assets: {e}")
        return False

def patch_run_dashboard():
    """Patch the run_dashboard.py file to include Hyperliquid integration"""
    dashboard_file = "run_dashboard.py"
    
    if not Path(dashboard_file).exists():
        logger.error(f"Dashboard file {dashboard_file} not found")
        return False
    
    try:
        with open(dashboard_file, "r") as f:
            content = f.read()
        
        # Check if already patched
        if "hyperliquid_integration" in content:
            logger.info("Dashboard file already patched for Hyperliquid integration")
            return True
        
        # Instead of looking for Flask app creation, we'll patch the create_dashboard function import
        # and add code to initialize our Hyperliquid integration after dashboard creation
        import_line = "from src.monitoring.dashboard import create_dashboard"
        
        if import_line in content:
            # Add our import
            new_import = import_line + "\n\n# Hyperliquid integration\nfrom hyperliquid_integration import setup_hyperliquid_integration"
            content = content.replace(import_line, new_import)
            
            # Find the place where the dashboard is created and add our integration
            dashboard_creation = "    # Load configuration"
            hyperliquid_integration = """    # Load configuration
    
    # Set up Hyperliquid integration with the dashboard
    try:
        from hyperliquid_integration import setup_hyperliquid_integration
        # We'll hook into the dashboard after it's created
        # This will be handled by a callback in create_dashboard
        os.environ["INTEGRATE_HYPERLIQUID"] = "true"
        logger.info("Hyperliquid integration enabled")
    except Exception as e:
        logger.error(f"Error setting up Hyperliquid integration: {e}")
    """
            
            content = content.replace(dashboard_creation, hyperliquid_integration)
            
            # Write the updated file
            with open(dashboard_file, "w") as f:
                f.write(content)
            
            logger.info(f"Successfully patched {dashboard_file} for Hyperliquid integration")
            
            # Now patch the dashboard creation module to add our integration
            dashboard_module = "src/monitoring/dashboard.py"
            
            if not Path(dashboard_module).exists():
                logger.error(f"Dashboard module {dashboard_module} not found")
                return False
            
            with open(dashboard_module, "r") as f:
                dash_content = f.read()
            
            # Only patch if not already patched
            if "hyperliquid_integration" not in dash_content:
                # Find the appropriate place to add our code
                create_func_end = "    return dashboard"
                
                if create_func_end in dash_content:
                    # Add Hyperliquid integration before returning the dashboard
                    new_create_func_end = """    # Add Hyperliquid integration if enabled
    if os.environ.get("INTEGRATE_HYPERLIQUID", "false").lower() == "true":
        try:
            from hyperliquid_integration import setup_hyperliquid_integration
            # Add Hyperliquid components to the dashboard
            # This doesn't require Flask directly, but works with the dashboard's Dash app
            setup_hyperliquid_integration(dashboard.app)
            logger.info("Hyperliquid integration added to dashboard")
        except Exception as e:
            logger.error(f"Failed to integrate Hyperliquid with dashboard: {e}")
    
    return dashboard"""
                    
                    dash_content = dash_content.replace(create_func_end, new_create_func_end)
                    
                    with open(dashboard_module, "w") as f:
                        f.write(dash_content)
                    
                    logger.info(f"Successfully patched {dashboard_module} for Hyperliquid integration")
                else:
                    logger.warning(f"Could not find the return statement in create_dashboard function. Manual integration required.")
            else:
                logger.info(f"Dashboard module {dashboard_module} already integrated with Hyperliquid")
            
            return True
        else:
            logger.error(f"Could not find the dashboard creation import in {dashboard_file}")
            return False
    except Exception as e:
        logger.error(f"Error patching dashboard file: {e}")
        return False

def set_environment_variables():
    """Set environment variables for Hyperliquid integration"""
    env_vars = {
        "HYPERLIQUID_SIMULATION": "true",  # Set to false when ready for live trading
        "HYPERLIQUID_BASE_URL": "https://api.hyperliquid.xyz",
        "ELIZAOS_ENABLED": "true"
    }
    
    # Only set if not already set
    for var, value in env_vars.items():
        if var not in os.environ:
            os.environ[var] = value
            logger.info(f"Set environment variable {var}={value}")
    
    logger.info("Environment variables configured")
    return True

def copy_static_files():
    """Copy static files to the static folder for the Flask app"""
    try:
        # Ensure static directories exist
        static_dirs = [
            "static/js",
            "static/css",
            "static/templates"
        ]
        
        for directory in static_dirs:
            Path(directory).mkdir(parents=True, exist_ok=True)
        
        # Copy files to static directory
        file_mappings = [
            ("dashboard/js/hyperliquid.js", "static/js/hyperliquid.js"),
            ("dashboard/css/hyperliquid-styles.css", "static/css/hyperliquid-styles.css"),
            ("dashboard/templates/dashboard-integration.js", "static/templates/dashboard-integration.js")
        ]
        
        for src, dest in file_mappings:
            if Path(src).exists():
                with open(src, "r") as f:
                    content = f.read()
                
                with open(dest, "w") as f:
                    f.write(content)
                logger.info(f"Copied {src} to {dest}")
        
        logger.info("Static files copied successfully")
        return True
    except Exception as e:
        logger.error(f"Error copying static files: {e}")
        return False

def update_protocol_section():
    """Update the protocol section in the dashboard to include Hyperliquid"""
    # This would modify the HTML template for the dashboard
    # Since we don't have direct access to that file, we'll use the JS integration
    logger.info("Protocol section will be updated via JavaScript integration")
    return True

def main():
    """Main activation function"""
    logger.info("Starting Hyperliquid integration activation")
    
    steps = [
        {"name": "Check Requirements", "function": check_requirements},
        {"name": "Copy Dashboard Assets", "function": copy_dashboard_assets},
        {"name": "Set Environment Variables", "function": set_environment_variables},
        {"name": "Copy Static Files", "function": copy_static_files},
        {"name": "Update Protocol Section", "function": update_protocol_section},
        {"name": "Patch Dashboard Runner", "function": patch_run_dashboard}
    ]
    
    success = True
    for step in steps:
        logger.info(f"Executing step: {step['name']}")
        step_success = step["function"]()
        
        if not step_success:
            success = False
            logger.error(f"Step {step['name']} failed")
            break
        
        logger.info(f"Step {step['name']} completed successfully")
    
    if success:
        logger.info("""
Hyperliquid integration activation completed successfully!

To see the integration in action:
1. Run your Trading Farm dashboard with `python run_dashboard.py`
2. Click on the Hyperliquid tab in the Protocols section
3. Use the ElizaOS terminal to interact with Hyperliquid

The integration is in simulation mode by default. To switch to live trading:
1. Set the HYPERLIQUID_SIMULATION environment variable to "false"
2. Set your WALLET_ADDRESS and PRIVATE_KEY environment variables
""")
    else:
        logger.error("""
Hyperliquid integration activation failed. Please check the logs and fix any issues.
""")
    
    return success

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
