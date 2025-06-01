from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from supabase import create_client, Client
from typing import Generator
import os
from .config import settings
import logging

logger = logging.getLogger(__name__)

# SQLAlchemy setup
DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Connect to Supabase using the service role key
def get_supabase_client() -> Client:
    """
    Get a Supabase client instance authenticated with the service role key.
    This has admin access and bypasses RLS.
    """
    try:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        raise

@contextmanager
def get_db_connection() -> Generator:
    """
    Context manager for database sessions
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db():
    """
    Dependency for FastAPI endpoints that need a database session
    """
    with get_db_connection() as db:
        yield db
