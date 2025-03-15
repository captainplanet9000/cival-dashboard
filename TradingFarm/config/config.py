import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# API Configuration
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz"
HYPERLIQUID_WEBSOCKET_URL = "wss://api.hyperliquid.xyz/ws"
SONIC_API_URL = "https://api.soniclabs.com"
SONIC_GATEWAY_URL = "https://gateway.soniclabs.com"
VERTEX_API_URL = "https://api.vertexprotocol.com"

# API Keys (load from environment variables)
HYPERLIQUID_API_KEY = os.getenv("HYPERLIQUID_API_KEY")
SONIC_API_KEY = os.getenv("SONIC_API_KEY")
VERTEX_API_KEY = os.getenv("VERTEX_API_KEY")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")  # Ethereum wallet private key

# Trading Parameters
TRADING_SYMBOLS = ["BTC/USDC", "ETH/USDC", "SOL/USDC"]
TRADING_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"]

# Risk Management Parameters
MAX_POSITION_SIZE_PERCENT = 0.05  # Maximum position size as percentage of account balance
STOP_LOSS_PERCENT = 0.02  # Default stop loss percentage
TAKE_PROFIT_PERCENT = 0.05  # Default take profit percentage
TRAILING_STOP_ACTIVATION_PERCENT = 0.03  # Percentage of profit at which trailing stop activates
TRAILING_STOP_DISTANCE_PERCENT = 0.015  # Distance of trailing stop as percentage

# Strategy Parameters
# Elliott Wave
ELLIOTT_WAVE_MIN_WAVE_HEIGHT = 0.02
ELLIOTT_WAVE_FIBONACCI_LEVELS = [0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618]

# Darvas Box
DARVAS_BOX_LOOKBACK_PERIOD = 20
DARVAS_BOX_ATR_PERIOD = 14
DARVAS_BOX_ATR_MULTIPLIER = 1.5

# Renko Charts
RENKO_BRICK_SIZE = 0.01  # 1% brick size
RENKO_USE_ATR = True
RENKO_ATR_PERIOD = 14

# Ichimoku Cloud
ICHIMOKU_TENKAN_PERIOD = 9
ICHIMOKU_KIJUN_PERIOD = 26
ICHIMOKU_SENKOU_SPAN_B_PERIOD = 52
ICHIMOKU_DISPLACEMENT = 26

# Williams Alligator
ALLIGATOR_JAW_PERIOD = 13
ALLIGATOR_TEETH_PERIOD = 8
ALLIGATOR_LIPS_PERIOD = 5
ALLIGATOR_JAW_OFFSET = 8
ALLIGATOR_TEETH_OFFSET = 5
ALLIGATOR_LIPS_OFFSET = 3

# Workflow Parameters
DATA_UPDATE_INTERVAL_SECONDS = 60
SIGNAL_GENERATION_INTERVAL_SECONDS = 300
RISK_CHECK_INTERVAL_SECONDS = 30

# Backtesting Parameters
BACKTEST_START_DATE = "2023-01-01"
BACKTEST_END_DATE = "2023-12-31"
COMMISSION_RATE = 0.0006  # 0.06% commission rate

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///trading_farm.db")

# Logging Configuration
LOG_LEVEL = "INFO"
LOG_FILE = BASE_DIR / "logs" / "trading_farm.log"

# ElizaOS Integration
ELIZAOS_CONFIG = {
    "api_url": "https://api.elizaos.ai",
    "api_key": os.getenv("ELIZAOS_API_KEY"),
    "chain_id": 42161,  # Arbitrum One chain ID
}

# Security Configuration
ENABLE_2FA = True
API_RATE_LIMIT = 100  # Rate limit per minute
