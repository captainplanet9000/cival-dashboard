"""
API service for exposing trading metrics to Grafana.
"""
import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import random
import uvicorn
from fastapi import FastAPI, Query, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.database.db_manager import DatabaseManager
from src.agents.hyperliquid_agent_manager import HyperliquidAgentManager
from src.api.eliza_api import initialize_eliza_api

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="TradingFarm Metrics API",
    description="API for exposing trading metrics to Grafana",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DB_PATH = os.environ.get("DB_PATH", "data/trading_farm.db")

def get_db():
    """Get database connection."""
    db = DatabaseManager(db_path=DB_PATH)
    try:
        yield db
    finally:
        db.close()

# Models
class TimeSeriesQuery(BaseModel):
    """Grafana time series query model."""
    start: str
    end: str
    interval: str
    format: str = "time_series"
    max_data_points: int = 1000

class TimeSeriesPoint(BaseModel):
    """Time series data point."""
    time: datetime
    value: float

class TimeSeriesResponse(BaseModel):
    """Grafana time series response model."""
    target: str
    datapoints: List[List[float]]

# Routes
@app.get("/", response_class=HTMLResponse)
def read_root():
    """Root endpoint with HTML content."""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TradingFarm Metrics API</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary-color: #2E8B57;
                --primary-light: #3CB371;
                --primary-dark: #1F593A;
                --secondary-color: #3F704D;
                --accent-color: #6B8E23;
                --bg-color: #F7F9F8;
                --card-bg: #FFFFFF;
                --text-color: #333333;
                --text-light: #666666;
                --text-lighter: #888888;
                --border-radius: 8px;
                --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                --spacing-xs: 4px;
                --spacing-sm: 8px;
                --spacing-md: 16px;
                --spacing-lg: 24px;
                --spacing-xl: 32px;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                background-color: var(--bg-color);
                color: var(--text-color);
                padding: var(--spacing-lg);
            }
            
            .container {
                max-width: 1000px;
                margin: 0 auto;
                background-color: var(--card-bg);
                padding: var(--spacing-xl);
                border-radius: var(--border-radius);
                box-shadow: var(--box-shadow);
            }
            
            header {
                margin-bottom: var(--spacing-xl);
                border-bottom: 2px solid var(--primary-color);
                padding-bottom: var(--spacing-lg);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .logo {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }
            
            .logo-icon {
                font-size: 24px;
                color: var(--primary-color);
            }
            
            h1 {
                color: var(--primary-color);
                font-size: 2rem;
                font-weight: 700;
            }
            
            h2 {
                color: var(--secondary-color);
                font-size: 1.5rem;
                margin-top: var(--spacing-xl);
                margin-bottom: var(--spacing-md);
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }
            
            h3 {
                color: var(--primary-dark);
                font-size: 1.2rem;
                margin-bottom: var(--spacing-sm);
                font-weight: 600;
            }
            
            p {
                margin-bottom: var(--spacing-md);
                color: var(--text-color);
            }
            
            .status-container {
                background-color: #E8F5E9;
                border-radius: var(--border-radius);
                padding: var(--spacing-lg);
                margin: var(--spacing-lg) 0;
                border-left: 4px solid var(--primary-color);
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                font-weight: 500;
            }
            
            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #4CAF50;
                display: inline-block;
            }
            
            .section {
                margin-bottom: var(--spacing-xl);
            }
            
            .card {
                background-color: var(--bg-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-lg);
                margin-bottom: var(--spacing-lg);
                border-left: 4px solid var(--primary-color);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
            }
            
            pre {
                background-color: #272822;
                color: #f8f8f2;
                padding: var(--spacing-lg);
                border-radius: 4px;
                overflow-x: auto;
                margin: var(--spacing-md) 0;
                font-family: 'Fira Code', 'Courier New', Courier, monospace;
                font-size: 14px;
            }
            
            code {
                background-color: #ECEFF1;
                padding: 2px 5px;
                border-radius: 3px;
                font-family: 'Fira Code', 'Courier New', Courier, monospace;
                font-size: 14px;
                color: var(--primary-dark);
            }
            
            .method {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 12px;
                margin-right: var(--spacing-sm);
            }
            
            .method.get {
                background-color: #E3F2FD;
                color: #0D47A1;
            }
            
            .method.post {
                background-color: #E8F5E9;
                color: #1B5E20;
            }
            
            ul {
                list-style-type: none;
                padding-left: var(--spacing-lg);
                margin-bottom: var(--spacing-lg);
            }
            
            li {
                margin-bottom: var(--spacing-sm);
                position: relative;
            }
            
            li:before {
                content: "→";
                color: var(--primary-color);
                font-weight: bold;
                position: absolute;
                left: -20px;
            }
            
            .steps {
                counter-reset: step-counter;
                list-style-type: none;
                padding-left: var(--spacing-lg);
            }
            
            .steps li {
                counter-increment: step-counter;
                margin-bottom: var(--spacing-md);
                position: relative;
            }
            
            .steps li:before {
                content: counter(step-counter);
                color: white;
                font-weight: bold;
                background-color: var(--primary-color);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                position: absolute;
                left: -36px;
                top: 0;
            }
            
            a {
                color: var(--primary-color);
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s;
            }
            
            a:hover {
                color: var(--primary-light);
                text-decoration: underline;
            }
            
            .security-note {
                background-color: #FFEBEE;
                border-left: 4px solid #C62828;
                padding: var(--spacing-lg);
                margin: var(--spacing-lg) 0;
                border-radius: var(--border-radius);
            }
            
            .icon {
                display: inline-block;
                width: 20px;
                height: 20px;
                margin-right: var(--spacing-xs);
            }
            
            .footer {
                margin-top: var(--spacing-xl);
                padding-top: var(--spacing-lg);
                border-top: 1px solid #ECEFF1;
                color: var(--text-lighter);
                text-align: center;
                font-size: 0.9rem;
            }
            
            .two-column {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--spacing-lg);
            }
            
            @media (max-width: 768px) {
                .two-column {
                    grid-template-columns: 1fr;
                }
                
                .container {
                    padding: var(--spacing-md);
                }
                
                h1 {
                    font-size: 1.6rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="logo">
                    <span class="logo-icon">📊</span>
                    <h1>TradingFarm Metrics API</h1>
                </div>
                <div class="version">v1.0.0</div>
            </header>
            
            <p>This API provides trading metrics data for the Grafana dashboard with a forest green theme, allowing comprehensive visualization of trading performance data.</p>
            
            <div class="status-container">
                <h2><span class="icon">🔍</span> API Status</h2>
                <div class="status-indicator">
                    <span class="status-dot"></span>
                    <span>The API server is running correctly!</span>
                </div>
            </div>
            
            <div class="section">
                <h2><span class="icon">🔌</span> Available Endpoints</h2>
                
                <div class="card">
                    <h3><span class="method get">GET</span> /health</h3>
                    <p>Health check endpoint for Grafana.</p>
                    <pre>GET /health

// Response
{
  "status": "ok"
}</pre>
                </div>
                
                <div class="card">
                    <h3><span class="method get">GET</span> /search</h3>
                    <p>Search available metrics for Grafana.</p>
                    <pre>GET /search

// Response
[
  "trades_pnl",
  "portfolio_value",
  "win_rate",
  "signal_count",
  "position_count"
]</pre>
                </div>
                
                <div class="card">
                    <h3><span class="method post">POST</span> /query</h3>
                    <p>Query metrics for Grafana time series visualization.</p>
                    <pre>POST /query

// Request Body
{
  "start": "2025-01-01T00:00:00Z",
  "end": "2025-01-31T23:59:59Z",
  "interval": "1h",
  "target": "trades_pnl"
}

// Response
{
  "target": "trades_pnl",
  "datapoints": [
    [0.35, 1717428000000],
    [0.48, 1717431600000],
    ...
  ]
}</pre>
                </div>
            </div>
            
            <div class="section">
                <h2><span class="icon">📊</span> Using with Grafana</h2>
                <div class="two-column">
                    <div>
                        <h3>Setup Instructions</h3>
                        <p>To use this API with Grafana:</p>
                        <ul>
                            <li>Set up a Grafana instance using the provided docker-compose.yml</li>
                            <li>Add this API as a SimpleJSON data source in Grafana</li>
                            <li>Import the trading_dashboard.json dashboard</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Dashboard Features</h3>
                        <ul>
                            <li>Portfolio performance tracking with forest green theme</li>
                            <li>Real-time position monitoring</li>
                            <li>Trading signals visualization</li>
                            <li>Agent performance comparison</li>
                            <li>Risk management metrics</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2><span class="icon">📝</span> Next Steps</h2>
                <p>To set up the complete Grafana dashboard with forest green theme:</p>
                <ol class="steps">
                    <li>Ensure this API server is running (it is!)</li>
                    <li>Navigate to the grafana_setup directory</li>
                    <li>Run <code>docker-compose up -d</code> to start Grafana</li>
                    <li>Access Grafana at <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
                    <li>Login with username <code>admin</code> and the default login credentials</li>
                </ol>
            </div>
            
            <div class="security-note">
                <h3><span class="icon">🔒</span> Security Notes</h3>
                <p>Important security practices for your dashboard:</p>
                <ul>
                    <li>Never expose sensitive wallet information in dashboards</li>
                    <li>Use truncated addresses for display (e.g., 0xAbcd...1234)</li>
                    <li>Store API keys and credentials as environment variables</li>
                    <li>Change default access credentials immediately after setup</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>TradingFarm &copy; 2025 | Forest Green Grafana Dashboard</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

@app.get("/health")
def health_check():
    """Health check endpoint for Grafana."""
    return {"status": "ok"}

@app.get("/search", response_model=List[str])
def search_metrics(db: DatabaseManager = Depends(get_db)):
    """
    Search available metrics for Grafana.
    
    Returns:
        List of available metric types
    """
    # Get unique metric types from the database
    metric_types = [
        "signals_count", 
        "signals_accuracy",
        "trades_count", 
        "trades_pnl", 
        "trades_win_rate",
        "positions_count", 
        "positions_value"
    ]
    
    # Add metrics for each symbol
    symbols = []
    agents = db.get_all_agent_configs()
    for agent in agents:
        agent_symbols = json.loads(agent.get('symbols', '[]')) if isinstance(agent.get('symbols'), str) else agent.get('symbols', [])
        symbols.extend(agent_symbols)
    
    unique_symbols = list(set(symbols))
    for symbol in unique_symbols:
        metric_types.extend([
            f"{symbol}_price",
            f"{symbol}_volume",
            f"{symbol}_trades"
        ])
    
    return metric_types

@app.post("/query")
def query_metrics(
    query: TimeSeriesQuery,
    target: str = Query(..., description="Metric type to query"),
    db: DatabaseManager = Depends(get_db)
):
    """
    Query metrics for Grafana time series visualization.
    
    Args:
        query: Time series query parameters
        target: Metric type to query
        
    Returns:
        Grafana time series response
    """
    try:
        # Parse time range
        start_time = datetime.fromisoformat(query.start.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(query.end.replace('Z', '+00:00'))
        
        # Get metrics from database based on target
        if target == "signals_count":
            data = get_signals_count(db, start_time, end_time)
        elif target == "signals_accuracy":
            data = get_signals_accuracy(db, start_time, end_time)
        elif target == "trades_count":
            data = get_trades_count(db, start_time, end_time)
        elif target == "trades_pnl":
            data = get_trades_pnl(db, start_time, end_time)
        elif target == "trades_win_rate":
            data = get_trades_win_rate(db, start_time, end_time)
        elif target == "positions_count":
            data = get_positions_count(db, start_time, end_time)
        elif target == "positions_value":
            data = get_positions_value(db, start_time, end_time)
        elif "_price" in target:
            symbol = target.split("_")[0]
            data = get_symbol_price(db, symbol, start_time, end_time)
        elif "_volume" in target:
            symbol = target.split("_")[0]
            data = get_symbol_volume(db, symbol, start_time, end_time)
        elif "_trades" in target:
            symbol = target.split("_")[0]
            data = get_symbol_trades(db, symbol, start_time, end_time)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown metric type: {target}")
        
        # Format response for Grafana
        return {
            "target": target,
            "datapoints": [[value, int(timestamp.timestamp() * 1000)] for timestamp, value in data]
        }
    
    except Exception as e:
        logger.error(f"Error querying metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Metric helper functions
def get_signals_count(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get signal count metrics."""
    metrics = db.get_metrics(
        metric_type="signals", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        count = data.get('count', 0)
        result.append((timestamp, count))
    
    return result

def get_signals_accuracy(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get signal accuracy metrics."""
    metrics = db.get_metrics(
        metric_type="signals", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        correct = data.get('correct', 0)
        total = data.get('count', 0)
        accuracy = (correct / total) * 100 if total > 0 else 0
        result.append((timestamp, accuracy))
    
    return result

def get_trades_count(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get trade count metrics."""
    metrics = db.get_metrics(
        metric_type="trades", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        count = data.get('count', 0)
        result.append((timestamp, count))
    
    return result

def get_trades_pnl(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get trade PnL metrics."""
    metrics = db.get_metrics(
        metric_type="trades", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        pnl = data.get('pnl', 0)
        result.append((timestamp, pnl))
    
    return result

def get_trades_win_rate(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get trade win rate metrics."""
    metrics = db.get_metrics(
        metric_type="trades", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        wins = data.get('wins', 0)
        total = data.get('count', 0)
        win_rate = (wins / total) * 100 if total > 0 else 0
        result.append((timestamp, win_rate))
    
    return result

def get_positions_count(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get position count metrics."""
    metrics = db.get_metrics(
        metric_type="positions", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        count = data.get('count', 0)
        result.append((timestamp, count))
    
    return result

def get_positions_value(db: DatabaseManager, start_time: datetime, end_time: datetime):
    """Get position value metrics."""
    metrics = db.get_metrics(
        metric_type="positions", 
        from_time=start_time, 
        to_time=end_time
    )
    
    result = []
    for metric in metrics:
        timestamp = datetime.fromisoformat(metric['timestamp'])
        data = json.loads(metric['data'])
        value = data.get('value', 0)
        result.append((timestamp, value))
    
    return result

def get_symbol_price(db: DatabaseManager, symbol: str, start_time: datetime, end_time: datetime):
    """Get symbol price metrics."""
    # Get market data for the symbol
    market_data = db.get_market_data(
        symbol=symbol,
        timeframe="1h",  # Use 1h timeframe for price charts
        from_time=start_time,
        to_time=end_time
    )
    
    result = []
    for data in market_data:
        timestamp = datetime.fromisoformat(data['timestamp'])
        close_price = data.get('close', 0)
        result.append((timestamp, close_price))
    
    return result

def get_symbol_volume(db: DatabaseManager, symbol: str, start_time: datetime, end_time: datetime):
    """Get symbol volume metrics."""
    # Get market data for the symbol
    market_data = db.get_market_data(
        symbol=symbol,
        timeframe="1h",  # Use 1h timeframe for volume charts
        from_time=start_time,
        to_time=end_time
    )
    
    result = []
    for data in market_data:
        timestamp = datetime.fromisoformat(data['timestamp'])
        volume = data.get('volume', 0)
        result.append((timestamp, volume))
    
    return result

def get_symbol_trades(db: DatabaseManager, symbol: str, start_time: datetime, end_time: datetime):
    """Get symbol trade count metrics."""
    # Get trades for the symbol
    trades = db.get_trades(
        symbol=symbol,
        from_time=start_time,
        to_time=end_time
    )
    
    # Group trades by hour
    trade_counts = {}
    for trade in trades:
        timestamp = datetime.fromisoformat(trade['timestamp'])
        hour_timestamp = timestamp.replace(minute=0, second=0, microsecond=0)
        if hour_timestamp not in trade_counts:
            trade_counts[hour_timestamp] = 0
        trade_counts[hour_timestamp] += 1
    
    result = [(timestamp, count) for timestamp, count in trade_counts.items()]
    result.sort(key=lambda x: x[0])
    
    return result

@app.get("/portfolio_value")
async def get_portfolio_value():
    """Get historical portfolio value for timeseries display."""
    try:
        # Simulated data for demo - in production this would query your database
        now = datetime.utcnow()
        datapoints = []
        
        # Generate last 30 days of data
        for i in range(30, 0, -1):
            timestamp = int((now - timedelta(days=i)).timestamp() * 1000)
            # Starting with $10,000 and adding some random growth plus trend
            base_value = 10000 * (1 + (30-i) * 0.01)  # 1% growth per day
            random_factor = random.uniform(0.99, 1.03)  # Random daily fluctuation
            value = base_value * random_factor
            datapoints.append([value, timestamp])
        
        return [
            {
                "target": "Portfolio Value",
                "datapoints": datapoints
            }
        ]
    except Exception as e:
        logger.error(f"Error getting portfolio value: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/win_rate")
async def get_win_rate():
    """Get win rate percentage for gauge display."""
    try:
        # Simulated data for demo - in production this would query your database
        win_rate = random.uniform(65, 85)  # Random win rate between 65% and 85%
        
        return [
            {
                "target": "Win Rate",
                "datapoints": [[win_rate, int(datetime.utcnow().timestamp() * 1000)]]
            }
        ]
    except Exception as e:
        logger.error(f"Error getting win rate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trades_by_symbol")
async def get_trades_by_symbol():
    """Get PnL grouped by trading symbol for bar chart display."""
    try:
        # Simulated data for demo - in production this would query your database
        symbols = ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD", "ARB-USD", "DOGE-USD"]
        datapoints = []
        
        # Generate random PnL values for each symbol
        now = int(datetime.utcnow().timestamp() * 1000)
        for symbol in symbols:
            # Random PnL between -500 and 1500
            pnl = random.uniform(-500, 1500)
            datapoints.append({"symbol": symbol, "pnl": pnl})
        
        return [
            {
                "target": "PnL by Symbol",
                "datapoints": [[d["pnl"], now] for d in datapoints],
                "metric": "pnl",
                "data": datapoints
            }
        ]
    except Exception as e:
        logger.error(f"Error getting trades by symbol: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/open_positions")
async def get_open_positions():
    """Get open trading positions for table display."""
    try:
        # Simulated data for demo - in production this would query your database
        symbols = ["BTC-USD", "ETH-USD", "SOL-USD", "ARB-USD"]
        positions = []
        
        # Generate random position data
        for symbol in symbols:
            # Random direction (long/short)
            direction = random.choice(["LONG", "SHORT"])
            
            # Random position size
            size = round(random.uniform(0.1, 5), 3)
            
            # Random entry price based on typical price ranges for the asset
            if symbol == "BTC-USD":
                entry_price = round(random.uniform(55000, 65000), 2)
                current_price = round(entry_price * random.uniform(0.97, 1.03), 2)
            elif symbol == "ETH-USD":
                entry_price = round(random.uniform(3000, 3500), 2)
                current_price = round(entry_price * random.uniform(0.97, 1.03), 2)
            elif symbol == "SOL-USD":
                entry_price = round(random.uniform(120, 150), 2)
                current_price = round(entry_price * random.uniform(0.97, 1.03), 2)
            else:
                entry_price = round(random.uniform(1, 100), 2)
                current_price = round(entry_price * random.uniform(0.97, 1.03), 2)
            
            # Calculate PnL based on direction
            if direction == "LONG":
                pnl = round((current_price - entry_price) * size, 2)
            else:
                pnl = round((entry_price - current_price) * size, 2)
                
            positions.append({
                "symbol": symbol,
                "direction": direction,
                "size": size,
                "entry_price": entry_price,
                "current_price": current_price,
                "pnl": pnl,
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            })
        
        # Format for Grafana table
        columns = [
            {"text": "symbol", "type": "string"},
            {"text": "direction", "type": "string"},
            {"text": "size", "type": "number"},
            {"text": "entry_price", "type": "number"},
            {"text": "current_price", "type": "number"},
            {"text": "pnl", "type": "number"},
            {"text": "timestamp", "type": "time"}
        ]
        
        rows = []
        for p in positions:
            rows.append([
                p["symbol"],
                p["direction"],
                p["size"],
                p["entry_price"],
                p["current_price"],
                p["pnl"],
                p["timestamp"]
            ])
        
        return [
            {
                "columns": columns,
                "rows": rows,
                "type": "table"
            }
        ]
    except Exception as e:
        logger.error(f"Error getting open positions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/signal_distribution")
async def get_signal_distribution():
    """Get distribution of trading signals for pie chart display."""
    try:
        # Simulated data for demo - in production this would query your database
        signal_types = ["Momentum", "Trend Reversal", "Breakout", "Mean Reversion", "Volatility"]
        datapoints = []
        
        # Generate random signal distribution
        total = 100
        remaining = 100
        
        for i, signal_type in enumerate(signal_types):
            if i == len(signal_types) - 1:
                value = remaining
            else:
                value = random.randint(5, remaining - (len(signal_types) - i - 1) * 5)
                remaining -= value
            
            datapoints.append({
                "name": signal_type,
                "value": value
            })
        
        return datapoints
    except Exception as e:
        logger.error(f"Error getting signal distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent_list")
async def get_agent_list():
    """Get list of trading agents for table display."""
    try:
        # Simulated data for demo - in production this would query your database
        agent_names = ["ArbitrumAgent01", "MomentumTrader", "BreakoutScanner", 
                       "TrendFollower", "MeanReversionBot", "MachineLearningAgent"]
        agents = []
        
        # Generate agent data
        for name in agent_names:
            status = random.choice(["ACTIVE", "INACTIVE"])
            strategy = random.choice(["Momentum", "Trend Following", "Mean Reversion", 
                                     "Breakout", "Machine Learning", "Statistical Arbitrage"])
            
            # Generate random performance metrics
            win_rate = round(random.uniform(50, 90), 1)
            daily_trades = random.randint(5, 50)
            monthly_pnl = round(random.uniform(-2000, 5000), 2)
            
            agents.append({
                "name": name,
                "status": status,
                "strategy": strategy,
                "win_rate": win_rate,
                "daily_trades": daily_trades,
                "monthly_pnl": monthly_pnl,
                "last_update": int(datetime.utcnow().timestamp() * 1000)
            })
        
        # Format for Grafana table
        columns = [
            {"text": "name", "type": "string"},
            {"text": "status", "type": "string"},
            {"text": "strategy", "type": "string"},
            {"text": "win_rate", "type": "number"},
            {"text": "daily_trades", "type": "number"},
            {"text": "monthly_pnl", "type": "number"},
            {"text": "last_update", "type": "time"}
        ]
        
        rows = []
        for agent in agents:
            rows.append([
                agent["name"],
                agent["status"],
                agent["strategy"],
                agent["win_rate"],
                agent["daily_trades"],
                agent["monthly_pnl"],
                agent["last_update"]
            ])
        
        return [
            {
                "columns": columns,
                "rows": rows,
                "type": "table"
            }
        ]
    except Exception as e:
        logger.error(f"Error getting agent list: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent_names")
async def get_agent_names():
    """Get list of agent names for Grafana variable template."""
    try:
        # Simulated data for demo - in production this would query your database
        agent_names = ["ArbitrumAgent01", "MomentumTrader", "BreakoutScanner", 
                       "TrendFollower", "MeanReversionBot", "MachineLearningAgent"]
        
        return agent_names
    except Exception as e:
        logger.error(f"Error getting agent names: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recent_signals")
async def get_recent_signals():
    """Get recent trading signals for table display."""
    try:
        # Simulated data for demo - in production this would query your database
        symbols = ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD", "ARB-USD", "DOGE-USD"]
        signals = []
        
        # Generate recent signal data (last 24 hours)
        now = datetime.utcnow()
        
        for _ in range(10):  # Generate 10 random signals
            symbol = random.choice(symbols)
            direction = random.choice(["LONG", "SHORT"])
            confidence = round(random.uniform(50, 99), 1)
            
            # Random price based on typical price ranges for the asset
            if symbol == "BTC-USD":
                price = round(random.uniform(55000, 65000), 2)
            elif symbol == "ETH-USD":
                price = round(random.uniform(3000, 3500), 2)
            elif symbol == "SOL-USD":
                price = round(random.uniform(120, 150), 2)
            else:
                price = round(random.uniform(1, 100), 2)
            
            # Random signal time in the last 24 hours
            time_offset = random.randint(0, 24 * 60)  # Random minutes in last 24 hours
            signal_time = now - timedelta(minutes=time_offset)
            timestamp = int(signal_time.timestamp() * 1000)
            
            # Random agent 
            agent = random.choice(["ArbitrumAgent01", "MomentumTrader", "BreakoutScanner", 
                                  "TrendFollower", "MeanReversionBot", "MachineLearningAgent"])
            
            signals.append({
                "timestamp": timestamp,
                "symbol": symbol,
                "direction": direction,
                "price": price,
                "confidence": confidence,
                "agent": agent
            })
        
        # Sort by timestamp (most recent first)
        signals.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Format for Grafana table
        columns = [
            {"text": "timestamp", "type": "time"},
            {"text": "symbol", "type": "string"},
            {"text": "direction", "type": "string"},
            {"text": "price", "type": "number"},
            {"text": "confidence", "type": "number"},
            {"text": "agent", "type": "string"}
        ]
        
        rows = []
        for signal in signals:
            rows.append([
                signal["timestamp"],
                signal["symbol"],
                signal["direction"],
                signal["price"],
                signal["confidence"],
                signal["agent"]
            ])
        
        return [
            {
                "columns": columns,
                "rows": rows,
                "type": "table"
            }
        ]
    except Exception as e:
        logger.error(f"Error getting recent signals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent_performance")
async def get_agent_performance():
    """Get agent performance metrics over time for timeseries display."""
    try:
        # Simulated data for demo - in production this would query your database
        agents = ["ArbitrumAgent01", "MomentumTrader", "BreakoutScanner"]
        now = datetime.utcnow()
        result = []
        
        # Generate performance data for each agent (last 30 days)
        for agent in agents:
            datapoints = []
            
            # Start with a base value and add some randomness
            base_value = random.uniform(8000, 12000)  # Different starting points
            
            for i in range(30, 0, -1):
                timestamp = int((now - timedelta(days=i)).timestamp() * 1000)
                
                # Add a trend component and daily noise
                trend = (30-i) * random.uniform(10, 50)  # Upward trend
                noise = random.uniform(-100, 100)  # Daily fluctuation
                
                value = base_value + trend + noise
                datapoints.append([value, timestamp])
            
            result.append({
                "target": agent,
                "datapoints": datapoints
            })
        
        return result
    except Exception as e:
        logger.error(f"Error getting agent performance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/daily_pnl")
async def get_daily_pnl():
    """Get today's PnL for stat display."""
    try:
        # Simulated data for demo - in production this would query your database
        daily_pnl = random.uniform(-1000, 2000)  # Random PnL between -$1000 and $2000
        
        return [
            {
                "target": "Today's PnL",
                "datapoints": [[daily_pnl, int(datetime.utcnow().timestamp() * 1000)]]
            }
        ]
    except Exception as e:
        logger.error(f"Error getting daily PnL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Agent control endpoints

@app.post("/start_all_agents")
async def start_all_agents():
    """Start all trading agents."""
    try:
        # In a real implementation, this would start all your trading agents
        # For demo purposes, we just return a success message
        
        logger.info("Starting all trading agents")
        
        return {"status": "success", "message": "All agents started successfully"}
    except Exception as e:
        logger.error(f"Error starting agents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop_all_agents")
async def stop_all_agents():
    """Stop all trading agents."""
    try:
        # In a real implementation, this would stop all your trading agents
        # For demo purposes, we just return a success message
        
        logger.info("Stopping all trading agents")
        
        return {"status": "success", "message": "All agents stopped successfully"}
    except Exception as e:
        logger.error(f"Error stopping agents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh_agents")
async def refresh_agents():
    """Refresh agent statuses."""
    try:
        # In a real implementation, this would refresh agent statuses
        # For demo purposes, we just return a success message
        
        logger.info("Refreshing agent status")
        
        return {"status": "success", "message": "Agent status refreshed successfully"}
    except Exception as e:
        logger.error(f"Error refreshing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/set_risk_level")
async def set_risk_level(risk_level: str):
    """Set risk level for all agents."""
    try:
        # Validate risk level
        if risk_level not in ["low", "medium", "high"]:
            raise ValueError("Risk level must be 'low', 'medium', or 'high'")
        
        # In a real implementation, this would set the risk level for your trading system
        # For demo purposes, we just return a success message
        
        logger.info(f"Setting risk level to {risk_level}")
        
        return {"status": "success", "message": f"Risk level set to {risk_level}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error setting risk level: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/set_asset_allocation")
async def set_asset_allocation(allocation: int):
    """Set maximum allocation percentage per asset."""
    try:
        # Validate allocation
        if allocation < 1 or allocation > 100:
            raise ValueError("Allocation must be between 1 and 100")
        
        # In a real implementation, this would set the asset allocation for your trading system
        # For demo purposes, we just return a success message
        
        logger.info(f"Setting max asset allocation to {allocation}%")
        
        return {"status": "success", "message": f"Max asset allocation set to {allocation}%"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error setting asset allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ElizaOS API endpoints
agent_manager = None

@app.on_event("startup")
async def startup_event():
    """Initialize resources when the API server starts."""
    global agent_manager
    
    try:
        # Initialize the Hyperliquid agent manager
        private_key = os.environ.get("ETH_PRIVATE_KEY")
        wallet_address = os.environ.get("ETH_WALLET_ADDRESS")
        
        agent_manager = HyperliquidAgentManager(
            private_key=private_key,
            wallet_address=wallet_address,
            db_path=DB_PATH
        )
        
        # Initialize the agent manager
        await agent_manager.initialize()
        logger.info("Agent manager initialized")
        
        # Initialize ElizaOS API
        eliza_router = initialize_eliza_api(agent_manager=agent_manager, db_path=DB_PATH)
        app.include_router(eliza_router)
        logger.info("ElizaOS API endpoints initialized")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources when the API server shuts down."""
    global agent_manager
    if agent_manager:
        # Stop all agents
        await agent_manager.stop_all_agents()
        logger.info("All agents stopped")

# ElizaOS Grafana integration endpoints

@app.get("/eliza_agents")
async def get_eliza_agents():
    """Get ElizaOS agents for Grafana table display."""
    try:
        if not agent_manager:
            return []
            
        # Get ElizaOS agents from the API
        agents = []
        for agent_id, agent_info in agent_manager.agents.items():
            if 'eliza_character' in agent_info.get('config', {}):
                status = "Running" if agent_info.get('active', False) else "Stopped"
                performance = random.uniform(-5.0, 15.0)  # Simulated performance
                
                agents.append({
                    "id": agent_id,
                    "name": agent_info.get('config', {}).get('name', f"Agent_{agent_id[:8]}"),
                    "status": status,
                    "type": "ElizaOS AI",
                    "symbols": ", ".join(agent_info.get('symbols', [])),
                    "timeframe": ", ".join(agent_info.get('timeframes', [])),
                    "performance": f"{performance:.2f}%",
                    "last_signal": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
                
        return {"columns": [
            {"text": "id", "type": "string"},
            {"text": "name", "type": "string"},
            {"text": "status", "type": "string"},
            {"text": "type", "type": "string"},
            {"text": "symbols", "type": "string"},
            {"text": "timeframe", "type": "string"},
            {"text": "performance", "type": "string"},
            {"text": "last_signal", "type": "string"}
        ], "rows": [[a["id"], a["name"], a["status"], a["type"], a["symbols"], a["timeframe"], a["performance"], a["last_signal"]] for a in agents], "type": "table"}
            
    except Exception as e:
        logger.error(f"Error getting ElizaOS agents: {str(e)}")
        return []

@app.get("/eliza_agent_performance")
async def get_eliza_agent_performance():
    """Get ElizaOS agent performance for Grafana timeseries display."""
    try:
        # Generate simulated performance data for ElizaOS agents
        now = datetime.now()
        end_time = int((now).timestamp() * 1000)
        start_time = int((now - timedelta(days=30)).timestamp() * 1000)
        
        # Create 30 days of data points
        timestamps = [start_time + (i * 86400000) for i in range(31)]  # 86400000 ms = 1 day
        
        # Generate 2-3 random agent time series
        result = []
        agent_names = ["ElizaOS BTC Trader", "ElizaOS ETH Trader", "ElizaOS ARB Trader"]
        
        for agent in agent_names:
            # Start with a base value and add some randomness
            base_value = 10000
            cumulative_return = 0
            datapoints = []
            
            for timestamp in timestamps:
                # Daily return between -2% and +3%
                daily_return = random.uniform(-0.02, 0.03)
                cumulative_return += daily_return
                value = base_value * (1 + cumulative_return)
                datapoints.append([value, timestamp])
            
            result.append({
                "target": agent,
                "datapoints": datapoints
            })
            
        return result
            
    except Exception as e:
        logger.error(f"Error getting ElizaOS agent performance: {str(e)}")
        return []

@app.get("/eliza_signal_count")
async def get_eliza_signal_count():
    """Get count of signals generated by ElizaOS agents for Grafana stat display."""
    try:
        # Simulated signal count
        return [{"target": "ElizaOS Signal Count", "datapoints": [[random.randint(25, 150), int(datetime.now().timestamp() * 1000)]]}]
    except Exception as e:
        logger.error(f"Error getting ElizaOS signal count: {str(e)}")
        return []

@app.get("/eliza_win_rate")
async def get_eliza_win_rate():
    """Get win rate for ElizaOS agents for Grafana gauge display."""
    try:
        # Simulated win rate (slightly better than regular agents)
        return [{"target": "ElizaOS Win Rate", "datapoints": [[random.uniform(68.5, 78.5), int(datetime.now().timestamp() * 1000)]]}]
    except Exception as e:
        logger.error(f"Error getting ElizaOS win rate: {str(e)}")
        return []

def run_api_server():
    """Run the FastAPI server."""
    uvicorn.run(
        "src.api.grafana_api:app",
        host="0.0.0.0",
        port=8051,
        reload=True
    )

if __name__ == "__main__":
    run_api_server()
