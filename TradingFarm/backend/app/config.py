from pydantic import BaseSettings
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Settings(BaseSettings):
    # API settings
    API_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS settings
    ENABLE_CORS: bool = os.getenv("ENABLE_CORS", "True").lower() == "true"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js frontend
        "http://frontend:3000",   # Docker container reference
        "http://localhost:8080",  # Windmill
        "http://windmill:8000",   # Windmill container
    ]
    
    # Database settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    
    # Supabase settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "http://localhost:8000")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # JWT settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "trading_farm_secret_change_in_production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    DEFAULT_MODEL: str = "gpt-4o"
    
    # LayerZero settings
    LAYERZERO_API_KEY: Optional[str] = None
    LAYERZERO_ENDPOINT: str = os.getenv("LAYERZERO_ENDPOINT", "https://api.layerzero.network/v1")
    
    # ElizaOS settings
    ELIZAOS_URL: str = "http://elizaos:8080"
    ELIZAOS_API_KEY: Optional[str] = None
    ELIZAOS_WS_URL: str = "ws://elizaos:9090"
    ELIZAOS_MODELS: List[str] = ["gpt-4o", "claude-3-opus", "claude-3-sonnet", "gemini-pro"]
    ELIZAOS_WEBHOOK_SECRET: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
