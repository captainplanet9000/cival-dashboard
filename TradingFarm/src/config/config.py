import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# API Configuration
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz"
HYPERLIQUID_WEBSOCKET_URL = "wss://api.hyperliquid.xyz/ws"
HYPERLIQUID_TESTNET_API_URL = "https://api.hyperliquid-testnet.xyz"
HYPERLIQUID_TESTNET_WEBSOCKET_URL = "wss://api.hyperliquid-testnet.xyz/ws"
SONIC_API_URL = "https://api.soniclabs.com"
SONIC_GATEWAY_URL = "https://gateway.soniclabs.com"
VERTEX_API_URL = "https://api.vertexprotocol.com"

# API Keys (load from environment variables)
HYPERLIQUID_API_KEY = os.getenv("HYPERLIQUID_API_KEY")
SONIC_API_KEY = os.getenv("SONIC_API_KEY")
VERTEX_API_KEY = os.getenv("VERTEX_API_KEY")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a")  # Default to the provided private key
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS", "0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2")  # Default to the provided wallet address

# AI Model Configuration
GEMMA_API_KEY = os.getenv("GEMMA_API_KEY", "AIzaSyDks11WLILaPei2sW9M8QgCp2K4G5goE8k")
GEMMA_MODEL_VERSION = "gemma-3-8b"
GEMMA_TEMPERATURE = 0.7
GEMMA_MAX_TOKENS = 1024
GEMMA_TOP_P = 0.95

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

# Moving Averages
MA_FAST_PERIOD = 9
MA_SLOW_PERIOD = 21
MA_SIGNAL_PERIOD = 9

# RSI
RSI_PERIOD = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD = 30

# Bollinger Bands
BOLLINGER_PERIOD = 20
BOLLINGER_STD_DEV = 2

# MACD
MACD_FAST_PERIOD = 12
MACD_SLOW_PERIOD = 26
MACD_SIGNAL_PERIOD = 9

# Dashboard Settings
DASHBOARD_UPDATE_INTERVAL = 5000  # milliseconds
