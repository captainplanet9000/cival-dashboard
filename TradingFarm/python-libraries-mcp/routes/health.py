from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
import asyncio
import importlib
import sys
import time
import redis
import psycopg2
import os
from tenacity import retry, stop_after_attempt, wait_exponential

router = APIRouter()

# Modules to check
pandas_module = "pandas"
numpy_module = "numpy"
zipline_module = "zipline"
vectorbt_module = "vectorbt"
openbb_module = "openbb"
riskfolio_module = "riskfolio_lib"
ibapi_module = "ibapi"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
async def check_database() -> Dict[str, Any]:
    """Check database connection health."""
    try:
        conn = None
        start_time = time.time()
        conn_str = os.getenv("DATABASE_URL", "postgresql://tradingfarm:tradingfarm_secure_password@timescaledb:5432/tradingfarm")
        
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        
        latency = (time.time() - start_time) * 1000  # Convert to ms
        
        return {
            "name": "Database",
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "version": conn.server_version,
        }
    except Exception as e:
        return {
            "name": "Database",
            "status": "unhealthy",
            "error": str(e)
        }
    finally:
        if conn:
            conn.close()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
async def check_redis() -> Dict[str, Any]:
    """Check Redis connection health."""
    try:
        start_time = time.time()
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        
        r = redis.from_url(redis_url)
        r.ping()
        
        latency = (time.time() - start_time) * 1000  # Convert to ms
        
        return {
            "name": "Redis",
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "version": r.info()["redis_version"],
        }
    except Exception as e:
        return {
            "name": "Redis",
            "status": "unhealthy",
            "error": str(e)
        }

async def check_module(module_name: str, display_name: str) -> Dict[str, Any]:
    """Check if a Python module is properly loaded."""
    try:
        start_time = time.time()
        module = importlib.import_module(module_name)
        latency = (time.time() - start_time) * 1000  # Convert to ms
        
        return {
            "name": display_name,
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "version": getattr(module, "__version__", "unknown"),
        }
    except ImportError:
        return {
            "name": display_name,
            "status": "unhealthy",
            "error": f"Module {module_name} not installed"
        }
    except Exception as e:
        return {
            "name": display_name,
            "status": "unhealthy",
            "error": str(e)
        }

@router.get("/", response_model=Dict[str, Any])
async def health_check():
    """
    Overall health check endpoint that evaluates the state of all dependencies.
    """
    results = await asyncio.gather(
        check_database(),
        check_redis(),
        check_module(pandas_module, "Pandas"),
        check_module(numpy_module, "NumPy"),
        check_module(zipline_module, "Zipline"),
        check_module(vectorbt_module, "VectorBT"),
        check_module(openbb_module, "OpenBB"),
        check_module(riskfolio_module, "Riskfolio"),
        check_module(ibapi_module, "IBAPI")
    )
    
    # Convert results to dictionary
    services_dict = {result["name"]: result for result in results}
    
    # Determine overall health
    unhealthy_services = [service for service in results if service["status"] == "unhealthy"]
    
    overall_status = "healthy" if not unhealthy_services else "unhealthy"
    
    # Get Python version info
    python_version = {
        "name": "Python",
        "status": "healthy",
        "version": sys.version,
    }
    
    # Add Python version to services
    services_dict["Python"] = python_version
    
    return {
        "status": overall_status,
        "timestamp": time.time(),
        "services": services_dict,
    }

@router.get("/ready", response_model=Dict[str, Any])
async def readiness_check():
    """
    Readiness check for Kubernetes/Docker health monitoring.
    Returns 200 OK if the service is ready to accept traffic.
    """
    health_result = await health_check()
    if health_result["status"] == "healthy":
        return {"status": "ready", "timestamp": time.time()}
    else:
        raise HTTPException(status_code=503, detail="Service not ready")

@router.get("/live", response_model=Dict[str, Any])
async def liveness_check():
    """
    Liveness check for Kubernetes/Docker health monitoring.
    Returns 200 OK if the service is alive.
    """
    return {"status": "alive", "timestamp": time.time()}
