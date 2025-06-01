"""
Security validation for dashboard API.
Ensures sensitive credentials are not exposed through the Grafana API.
"""
import os
import sys
import json
import requests
import logging
from pathlib import Path

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# List of sensitive patterns to check for
SENSITIVE_PATTERNS = [
    "private_key",
    "privatekey",
    "0x[a-fA-F0-9]{64}",  # Hex private key pattern
    "wallet_address",
    "wallet",
    "0x[a-fA-F0-9]{40}",  # Ethereum address pattern
    "password",
    "secret",
    "apikey",
    "api_key"
]

def check_api_endpoint_security(url):
    """Check if an API endpoint returns sensitive information."""
    try:
        logger.info(f"Checking endpoint: {url}")
        response = requests.get(url, timeout=5)
        response_text = response.text.lower()
        
        for pattern in SENSITIVE_PATTERNS:
            if pattern.lower() in response_text:
                logger.warning(f"Potential sensitive data leak at {url}: Contains pattern '{pattern}'")
                return False
        
        logger.info(f"Endpoint {url} secure - no sensitive patterns detected")
        return True
    except Exception as e:
        logger.error(f"Error checking endpoint {url}: {e}")
        return False

def validate_dashboard_security():
    """Validate dashboard and API security."""
    logger.info("Starting dashboard security validation...")
    
    base_url = "http://localhost:8051"
    endpoints = [
        "/",
        "/health",
        "/search",
    ]
    
    all_secure = True
    for endpoint in endpoints:
        if not check_api_endpoint_security(f"{base_url}{endpoint}"):
            all_secure = False
    
    if all_secure:
        logger.info("SECURITY CHECK PASSED: No sensitive information exposed in API endpoints")
    else:
        logger.warning("SECURITY CHECK FAILED: Potential sensitive information exposure detected")
        logger.warning("Please review API implementation to protect private keys and wallet addresses")
    
    return all_secure

def security_recommendations():
    """Provide security recommendations for the dashboard."""
    recommendations = [
        "1. Ensure private keys are never stored in the database accessible to the API",
        "2. Never expose full wallet addresses in dashboard UI",
        "3. Use truncated addresses (e.g., 0xAe93...Da2) for display purposes",
        "4. Implement proper authentication for Grafana access",
        "5. Run Grafana behind a reverse proxy with HTTPS for production use",
        "6. Rotate any API keys regularly",
        "7. Use environment variables rather than hardcoded credentials"
    ]
    
    logger.info("SECURITY RECOMMENDATIONS:")
    for rec in recommendations:
        logger.info(rec)

if __name__ == "__main__":
    validate_dashboard_security()
    security_recommendations()
