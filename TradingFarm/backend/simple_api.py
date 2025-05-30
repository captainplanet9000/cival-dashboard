from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Trading Farm API", description="API for Trading Farm platform")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, in production this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Trading Farm API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "up"  # This would be dynamic in a real implementation
        }
    }

if __name__ == "__main__":
    # Run the server when the script is executed directly
    uvicorn.run("simple_api:app", host="0.0.0.0", port=8000, reload=False)
