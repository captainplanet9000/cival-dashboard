#!/bin/bash
set -e

# Debug information
echo "==================== DEBUG INFO ===================="
echo "Current directory: $(pwd)"
echo "Directory listing:"
ls -la
echo "Python path:"
python -c "import sys; print(sys.path)"
echo "==================== END DEBUG ===================="

# Try to directly start a simple HTTP server for testing
python -c "
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

@app.get('/')
async def root():
    return {'message': 'Hello from Trading Farm API'}

@app.get('/health')
async def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
" > simple_server.py

# Run the simple server
exec python simple_server.py
