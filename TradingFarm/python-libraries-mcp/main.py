from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routes import health
import os
from prometheus_client import make_asgi_app

# Create FastAPI app
app = FastAPI(
    title="Trading Farm Python Libraries MCP",
    description="MCP Server for Python Trading Libraries Integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API routers
app.include_router(health.router, prefix="/health", tags=["Health"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "Trading Farm Python Libraries MCP",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics"
        }
    }

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
