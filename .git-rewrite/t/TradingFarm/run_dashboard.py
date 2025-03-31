import logging
import argparse
import json
import os
from src.monitoring.dashboard import create_dashboard

# Hyperliquid integration
from hyperliquid_integration import setup_hyperliquid_integration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Run the trading dashboard application."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="AI Trading Farm Dashboard")
    parser.add_argument(
        "--config", 
        type=str, 
        default="config/dashboard_config.json",
        help="Path to dashboard configuration file"
    )
    parser.add_argument(
        "--agent-config", 
        type=str, 
        default="config/arbitrum_agent_config.json",
        help="Path to agent configuration file"
    )
    parser.add_argument(
        "--host", 
        type=str, 
        default="0.0.0.0",
        help="Host to run the dashboard server on"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=9386,
        help="Port to run the dashboard server on"
    )
    parser.add_argument(
        "--debug", 
        action="store_true",
        help="Run in debug mode"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    
    # Set up Hyperliquid integration with the dashboard
    try:
        from hyperliquid_integration import setup_hyperliquid_integration
        # We'll hook into the dashboard after it's created
        # This will be handled by a callback in create_dashboard
        os.environ["INTEGRATE_HYPERLIQUID"] = "true"
        logger.info("Hyperliquid integration enabled")
    except Exception as e:
        logger.error(f"Error setting up Hyperliquid integration: {e}")
    
    config = {}
    if os.path.exists(args.config):
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
            logger.info(f"Loaded dashboard configuration from {args.config}")
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}", exc_info=True)
            logger.info("Using default configuration")
    
    # Add agent config path to the dashboard config
    config['config_path'] = args.agent_config
    logger.info(f"Using agent configuration from {args.agent_config}")
    
    # Create and run dashboard
    dashboard = create_dashboard(config)
    dashboard.start_metrics_collection()
    
    logger.info(f"Starting dashboard server on {args.host}:{args.port}")
    dashboard.run_server(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()
