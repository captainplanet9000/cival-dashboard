import os
import json
import logging
import datetime
import time
import asyncio
from typing import Dict, List, Optional, Tuple, Any

import pandas as pd
import numpy as np
from dash import Dash, html, dcc, callback, Input, Output, State, ALL, MATCH
import dash
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import dash_bootstrap_components as dbc
import dash_mantine_components as dmc

# Import available classes from base.py
from .base import (
    SignalMetricsCollector,
    OrderMetricsCollector,
    MetricsCollector
)

from .agent_manager import DashboardAgentManager
from ..database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

class TradingDashboard:
    """Dashboard for visualizing trading metrics and performance."""
    
    def __init__(
        self,
        metrics_path: str = 'metrics',
        signals_file: str = 'signals.json',
        trades_file: str = 'trades.json',
        update_interval_seconds: int = 60,
        app_title: str = "AI Trading Farm Dashboard",
        config_path: str = None,
        db_path: str = "data/trading_farm.db"
    ):
        """
        Initialize the trading dashboard.
        
        Args:
            metrics_path: Path to store and load metrics
            signals_file: Path to signals JSON file
            trades_file: Path to trades JSON file
            update_interval_seconds: How often to update metrics
            app_title: Title of the dashboard
            config_path: Path to the agent configuration file
            db_path: Path to the SQLite database file
        """
        self.metrics_path = metrics_path
        self.signals_file = signals_file
        self.trades_file = trades_file
        self.update_interval_seconds = update_interval_seconds
        self.app_title = app_title
        
        # Create metrics directory if it doesn't exist
        if not os.path.exists(metrics_path):
            os.makedirs(metrics_path)
        
        # Initialize database connection
        self.db = DatabaseManager(db_path=db_path)
        
        # Initialize metrics collectors
        self.signal_collector = SignalMetricsCollector(
            signals_path=signals_file,
            storage_path=os.path.join(metrics_path, 'signals')
        )
        
        self.trade_collector = OrderMetricsCollector(
            orders_path=trades_file,  # Using orders_path instead of trades_path
            storage_path=os.path.join(metrics_path, 'trades')
        )
        
        # Initialize agent manager
        self.agent_manager = DashboardAgentManager(db_path=db_path)
        
        # Initialize Dash app
        self.app = dash.Dash(
            __name__,
            meta_tags=[
                {"name": "viewport", "content": "width=device-width, initial-scale=1"}
            ],
            title=app_title,
            external_stylesheets=[
                dbc.themes.BOOTSTRAP,
                "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            ]
        )
        
        # Setup layout
        self._setup_layout()
        
        # Setup callbacks
        self._setup_callbacks()
    
    def _setup_layout(self):
        """Configure the dashboard layout."""
        
        # Create the main layout
        self.app.layout = html.Div(
            [
                # Custom CSS
                html.Link(
                    rel='stylesheet',
                    href='/assets/shadcn-accordion.css'
                ),
                
                # Header
                html.Div(
                    [
                        html.H1(self.app_title, className="header-title"),
                        html.P("Real-time trading metrics and agent management", className="header-description"),
                        html.Div(id="last-update-time", className="header-update")
                    ],
                    className="header"
                ),
                
                # Add interval component for automatic updates
                dcc.Interval(
                    id="interval-component",
                    interval=self.update_interval_seconds * 1000,  # Convert to milliseconds
                    n_intervals=0
                ),
                
                # Main content
                html.Div(
                    [
                        # Agent Management Section
                        html.Div(
                            [
                                html.H3("Agent Management"),
                                html.Div(
                                    [
                                        # Agent Control Panel
                                        html.Div(
                                            [
                                                html.Button(
                                                    "Add New Agent", 
                                                    id="add-agent-button",
                                                    className="action-button"
                                                ),
                                                html.Button(
                                                    "Refresh Agents", 
                                                    id="refresh-agents-button",
                                                    className="action-button"
                                                )
                                            ],
                                            className="agent-control-buttons"
                                        ),
                                        
                                        # Agent List
                                        html.Div(
                                            [
                                                html.H4("Configured Agents"),
                                                html.Div(id="agent-list-container")
                                            ],
                                            className="agent-list-section"
                                        )
                                    ],
                                    className="agent-management-container"
                                ),
                                
                                # Agent Configuration Modal
                                html.Div(
                                    [
                                        dbc.Modal(
                                            [
                                                html.Div(
                                                    [
                                                        html.H3("Configure Agent", id="agent-modal-title"),
                                                        html.Div(
                                                            [
                                                                # Agent Form
                                                                html.Div(
                                                                    [
                                                                        html.Div([
                                                                            html.Label("Agent Name"),
                                                                            dcc.Input(
                                                                                id="agent-name-input",
                                                                                type="text",
                                                                                placeholder="Enter agent name",
                                                                                className="form-input"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Agent Type"),
                                                                            dcc.Dropdown(
                                                                                id="agent-type-dropdown",
                                                                                options=[
                                                                                    {"label": "Hyperliquid", "value": "hyperliquid"},
                                                                                    {"label": "Arbitrum", "value": "arbitrum"}
                                                                                ],
                                                                                value="hyperliquid",
                                                                                className="form-dropdown"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Strategy"),
                                                                            dcc.Dropdown(
                                                                                id="agent-strategy-dropdown",
                                                                                options=[
                                                                                    {"label": "Simple Trend", "value": "simple_trend"},
                                                                                    {"label": "Alligator", "value": "alligator"},
                                                                                    {"label": "MACD", "value": "macd"}
                                                                                ],
                                                                                value="simple_trend",
                                                                                className="form-dropdown"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Symbols (comma separated)"),
                                                                            dcc.Input(
                                                                                id="agent-symbols-input",
                                                                                type="text",
                                                                                placeholder="BTC-USD, ETH-USD",
                                                                                className="form-input"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Timeframes (comma separated)"),
                                                                            dcc.Input(
                                                                                id="agent-timeframes-input",
                                                                                type="text",
                                                                                placeholder="5m, 15m, 1h",
                                                                                className="form-input"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Risk Per Trade (%)"),
                                                                            dcc.Input(
                                                                                id="agent-risk-input",
                                                                                type="number",
                                                                                min=0.1,
                                                                                max=10,
                                                                                step=0.1,
                                                                                value=1.0,
                                                                                className="form-input"
                                                                            )
                                                                        ], className="form-group"),
                                                                        
                                                                        html.Div([
                                                                            html.Label("Leverage"),
                                                                            dcc.Input(
                                                                                id="agent-leverage-input",
                                                                                type="number",
                                                                                min=1,
                                                                                max=20,
                                                                                step=1,
                                                                                value=1,
                                                                                className="form-input"
                                                                            )
                                                                        ], className="form-group"),
                                                                    ],
                                                                    className="form-container"
                                                                )
                                                            ],
                                                            className="modal-content"
                                                        ),
                                                        html.Div(
                                                            [
                                                                html.Button(
                                                                    "Cancel", 
                                                                    id="agent-modal-cancel", 
                                                                    className="cancel-button"
                                                                ),
                                                                html.Button(
                                                                    "Save", 
                                                                    id="agent-modal-save", 
                                                                    className="save-button"
                                                                )
                                                            ],
                                                            className="modal-buttons"
                                                        )
                                                    ],
                                                    className="agent-modal"
                                                )
                                            ],
                                            id="agent-config-modal",
                                            is_open=False,
                                            centered=True,
                                            backdrop="static"
                                        )
                                    ]
                                )
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Overview Section
                        html.Div(
                            [
                                html.H3("Performance Overview"),
                                html.Div(
                                    [
                                        html.Div(
                                            [
                                                html.H4("Total P&L"),
                                                html.P(id="total-pnl", className="metric-value")
                                            ],
                                            className="metric-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Win Rate"),
                                                html.P(id="win-rate", className="metric-value")
                                            ],
                                            className="metric-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Active Positions"),
                                                html.P(id="active-positions", className="metric-value")
                                            ],
                                            className="metric-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Unrealized P&L"),
                                                html.P(id="unrealized-pnl", className="metric-value")
                                            ],
                                            className="metric-card"
                                        )
                                    ],
                                    className="metrics-container"
                                )
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Agent Control Panel
                        html.Div(
                            [
                                html.H3("Agent Control Panel"),
                                
                                # Agent Control Actions
                                html.Div(
                                    [
                                        html.Button(
                                            "Add New Agent", 
                                            id="add-agent-button",
                                            className="shadcn-button primary",
                                            style={"marginRight": "8px"}
                                        ),
                                        html.Button(
                                            "Start All", 
                                            id="start-all-agents-button",
                                            className="shadcn-button outline",
                                            style={"marginRight": "8px"}
                                        ),
                                        html.Button(
                                            "Stop All", 
                                            id="stop-all-agents-button",
                                            className="shadcn-button destructive",
                                            style={"marginRight": "8px"}
                                        ),
                                        html.Button(
                                            "Refresh", 
                                            id="refresh-agents-button",
                                            className="shadcn-button outline"
                                        ),
                                    ],
                                    className="agent-control-actions",
                                    style={"display": "flex", "marginBottom": "16px"}
                                ),
                                
                                # Agent Status Summary
                                html.Div(
                                    [
                                        html.Div(
                                            [
                                                html.Span("Running:", className="status-label"),
                                                html.Span(id="running-agents-count", className="status-value shadcn-badge success"),
                                            ],
                                            style={"marginRight": "16px"}
                                        ),
                                        html.Div(
                                            [
                                                html.Span("Stopped:", className="status-label"),
                                                html.Span(id="stopped-agents-count", className="status-value shadcn-badge error"),
                                            ],
                                            style={"marginRight": "16px"}
                                        ),
                                        html.Div(
                                            [
                                                html.Span("Total:", className="status-label"),
                                                html.Span(id="total-agents-count", className="status-value"),
                                            ]
                                        ),
                                    ],
                                    style={"display": "flex", "alignItems": "center", "marginBottom": "16px"}
                                ),
                                
                                # Notification area for agent operations
                                html.Div(
                                    id="agent-management-status",
                                    className="notification-area",
                                    style={
                                        "padding": "12px", 
                                        "borderRadius": "var(--radius)", 
                                        "backgroundColor": "rgba(0,0,0,0.05)",
                                        "marginBottom": "16px",
                                        "minHeight": "46px",
                                        "display": "none"
                                    }
                                ),
                                
                                # Quick filters
                                html.Div(
                                    [
                                        html.Span("Filter by: ", style={"marginRight": "8px"}),
                                        html.Button("All", id="filter-all-button", className="shadcn-button outline", style={"marginRight": "4px"}),
                                        html.Button("Running", id="filter-running-button", className="shadcn-button outline", style={"marginRight": "4px"}),
                                        html.Button("Stopped", id="filter-stopped-button", className="shadcn-button outline", style={"marginRight": "4px"}),
                                    ],
                                    style={"display": "flex", "alignItems": "center", "marginBottom": "16px"}
                                ),
                                
                                # Agent list - uses the accordion component
                                html.Div(id="agent-list-container", className="accordion")
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Signal Analysis
                        html.Div(
                            [
                                html.H3("Signal Analysis"),
                                html.Div(
                                    [
                                        html.Div(
                                            [
                                                html.H4("Signal Distribution"),
                                                dcc.Graph(id="signal-distribution-chart")
                                            ],
                                            className="chart-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Signal Confidence"),
                                                dcc.Graph(id="signal-confidence-chart")
                                            ],
                                            className="chart-card"
                                        )
                                    ],
                                    className="charts-container"
                                )
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Trading Activity
                        html.Div(
                            [
                                html.H3("Trading Activity"),
                                html.Div(
                                    [
                                        html.Div(
                                            [
                                                html.H4("Trades by Exchange"),
                                                dcc.Graph(id="trades-by-exchange-chart")
                                            ],
                                            className="chart-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Trade Execution Rate"),
                                                dcc.Graph(id="trade-execution-chart")
                                            ],
                                            className="chart-card"
                                        )
                                    ],
                                    className="charts-container"
                                )
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Portfolio Allocation
                        html.Div(
                            [
                                html.H3("Portfolio Allocation"),
                                dcc.Graph(id="portfolio-allocation-chart")
                            ],
                            className="dashboard-card"
                        ),
                        
                        # Risk Metrics
                        html.Div(
                            [
                                html.H3("Risk Metrics"),
                                html.Div(
                                    [
                                        html.Div(
                                            [
                                                html.H4("Drawdown"),
                                                dcc.Graph(id="drawdown-chart")
                                            ],
                                            className="chart-card"
                                        ),
                                        html.Div(
                                            [
                                                html.H4("Position Concentration"),
                                                dcc.Graph(id="position-concentration-chart")
                                            ],
                                            className="chart-card"
                                        )
                                    ],
                                    className="charts-container"
                                )
                            ],
                            className="dashboard-card"
                        )
                    ],
                    className="dashboard-content"
                )
            ],
            className="app-container"
        )
    
    def _setup_callbacks(self):
        """Configure dashboard callbacks."""
        
        # Update timestamps periodically
        @self.app.callback(
            Output('last-update-time', 'children'),
            Input('interval-component', 'n_intervals')
        )
        def update_time(n):
            return f"Last updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        # Agent Status Counts
        @self.app.callback(
            [
                Output('running-agents-count', 'children'),
                Output('stopped-agents-count', 'children'),
                Output('total-agents-count', 'children')
            ],
            Input('interval-component', 'n_intervals')
        )
        def update_agent_counts(n):
            agents = self.db.get_all_agents()
            running_count = sum(1 for agent in agents if agent.get('status', '') == 'Running')
            stopped_count = len(agents) - running_count
            total_count = len(agents)
            
            return str(running_count), str(stopped_count), str(total_count)
        
        # Agent List with filtering support
        @self.app.callback(
            Output('agent-list-container', 'children'),
            [
                Input('interval-component', 'n_intervals'),
                Input('filter-all-button', 'n_clicks'),
                Input('filter-running-button', 'n_clicks'),
                Input('filter-stopped-button', 'n_clicks')
            ]
        )
        def update_agent_list(n_intervals, all_clicks, running_clicks, stopped_clicks):
            agents = self.db.get_all_agents()
            
            # Determine which filter button was clicked
            ctx = dash.callback_context
            if not ctx.triggered:
                button_id = 'filter-all-button'
            else:
                button_id = ctx.triggered[0]['prop_id'].split('.')[0]
            
            # Apply filter
            if button_id == 'filter-running-button':
                agents = [agent for agent in agents if agent.get('status', '') == 'Running']
            elif button_id == 'filter-stopped-button':
                agents = [agent for agent in agents if agent.get('status', '') != 'Running']
            
            if not agents:
                return html.Div("No agents matching the current filter.", 
                               className="text-muted text-center my-4")
            
            # Create accordion items for each agent
            accordion_items = []
            
            for agent in agents:
                agent_id = agent.get('id', '')
                agent_name = agent.get('name', 'Unnamed Agent')
                agent_type = agent.get('type', 'Unknown')
                status = agent.get('status', 'Stopped')
                strategy = agent.get('strategy', 'Unknown')
                symbols = agent.get('symbols', [])
                timeframes = agent.get('timeframes', [])
                risk = agent.get('risk_per_trade', 0)
                leverage = agent.get('leverage', 1)
                
                badge_class = "shadcn-badge success" if status == "Running" else "shadcn-badge error"
                
                accordion_item = html.Div([
                    html.Div([
                        html.Button([
                            html.Div([
                                html.Span(agent_name, style={"fontWeight": "500"}),
                                html.Span(f" ({agent_type})", style={"color": "var(--bs-secondary)", "fontSize": "14px"}),
                                html.Span(status, className=badge_class, style={"marginLeft": "10px"})
                            ], style={"display": "flex", "alignItems": "center", "gap": "8px"}),
                            html.Div([
                                html.Svg([
                                    html.Path(d="m6 9 6 6 6-6")
                                ], xmlns="http://www.w3.org/2000/svg", width="24", height="24", 
                                   fill="none", stroke="currentColor", strokeWidth="2", 
                                   strokeLinecap="round", strokeLinejoin="round",
                                   className="accordion-chevron")
                            ])
                        ], id=f"accordion-trigger-{agent_id}", className="accordion-trigger",
                           n_clicks=0, style={"width": "100%", "display": "flex", 
                                             "justifyContent": "space-between"})
                    ], className="accordion-header"),
                    
                    html.Div([
                        html.Div([
                            html.Div([
                                html.Div("Strategy", className="agent-info-label"),
                                html.Div(strategy, className="agent-info-value")
                            ], className="agent-info-item"),
                            html.Div([
                                html.Div("Symbols", className="agent-info-label"),
                                html.Div(", ".join(symbols), className="agent-info-value")
                            ], className="agent-info-item"),
                            html.Div([
                                html.Div("Timeframes", className="agent-info-label"),
                                html.Div(", ".join(timeframes), className="agent-info-value")
                            ], className="agent-info-item"),
                            html.Div([
                                html.Div("Risk per Trade", className="agent-info-label"),
                                html.Div(f"{risk}%", className="agent-info-value")
                            ], className="agent-info-item"),
                            html.Div([
                                html.Div("Leverage", className="agent-info-label"),
                                html.Div(f"{leverage}x", className="agent-info-value")
                            ], className="agent-info-item")
                        ], className="agent-info-grid"),
                        
                        html.Div([
                            html.Button("Edit", id=f"edit-agent-{agent_id}", 
                                       className="shadcn-button outline",
                                       style={"marginRight": "8px"}),
                            html.Button("Start" if status != "Running" else "Stop", 
                                       id=f"toggle-agent-{agent_id}",
                                       className="shadcn-button primary" if status != "Running" 
                                       else "shadcn-button destructive",
                                       style={"marginRight": "8px"}),
                            html.Button("Delete", id=f"delete-agent-{agent_id}", 
                                       className="shadcn-button destructive")
                        ], className="agent-actions", style={"display": "flex", "justifyContent": "flex-end", 
                                                           "marginTop": "16px"})
                    ], id=f"accordion-content-{agent_id}", className="accordion-content",
                       style={"display": "none"})
                ], className="accordion-item")
                
                accordion_items.append(accordion_item)
            
            # Register callbacks for accordion functionality
            for agent in agents:
                agent_id = agent.get('id', '')
                
                @self.app.callback(
                    Output(f"accordion-content-{agent_id}", "style"),
                    Output(f"accordion-trigger-{agent_id}", "className"),
                    Input(f"accordion-trigger-{agent_id}", "n_clicks"),
                    State(f"accordion-content-{agent_id}", "style"),
                    prevent_initial_call=True
                )
                def toggle_accordion(n_clicks, current_style):
                    if n_clicks is None or n_clicks % 2 == 0:
                        return {"display": "none"}, "accordion-trigger"
                    else:
                        return {"display": "block"}, "accordion-trigger expanded"
            
            return html.Div(accordion_items, className="accordion", style={"marginTop": "16px"})
        
        # Start All & Stop All Agents callbacks
        @self.app.callback(
            [
                Output('agent-management-status', 'children'),
                Output('agent-management-status', 'style')
            ],
            [
                Input('start-all-agents-button', 'n_clicks'),
                Input('stop-all-agents-button', 'n_clicks')
            ]
        )
        def manage_all_agents(start_clicks, stop_clicks):
            ctx = dash.callback_context
            if not ctx.triggered:
                return "", {"display": "none"}
            
            button_id = ctx.triggered[0]['prop_id'].split('.')[0]
            base_style = {
                "padding": "12px", 
                "borderRadius": "var(--radius)", 
                "marginBottom": "16px",
                "minHeight": "46px",
                "display": "block"
            }
            
            if button_id == 'start-all-agents-button' and start_clicks:
                # Start all agents
                success_count = 0
                for agent in self.db.get_all_agents():
                    if agent.get('status') != 'Running':
                        if self.db.update_agent_status(agent.get('id'), 'Running'):
                            success_count += 1
                
                message = f"Started {success_count} agents"
                style = {**base_style, "backgroundColor": "rgba(16, 185, 129, 0.1)"}
                return message, style
            
            elif button_id == 'stop-all-agents-button' and stop_clicks:
                # Stop all agents
                success_count = 0
                for agent in self.db.get_all_agents():
                    if agent.get('status') == 'Running':
                        if self.db.update_agent_status(agent.get('id'), 'Stopped'):
                            success_count += 1
                
                message = f"Stopped {success_count} agents"
                style = {**base_style, "backgroundColor": "rgba(239, 68, 68, 0.1)"}
                return message, style
            
            return "", {"display": "none"}
        
        # Overview metrics callback
        @self.app.callback(
            [
                Output("total-pnl", "children"),
                Output("win-rate", "children"),
                Output("active-positions", "children"),
                Output("unrealized-pnl", "children")
            ],
            Input("interval-component", "n_intervals")
        )
        def update_overview_metrics(n):
            # Load metrics data
            trade_metrics = self._load_trade_metrics()
            position_metrics = self._load_position_metrics()
            
            # Calculate metrics
            total_pnl = trade_metrics.get('total_pnl', 0.0)
            win_rate = trade_metrics.get('win_rate', 0.0) * 100
            active_positions = position_metrics.get('total_positions', 0)
            unrealized_pnl = position_metrics.get('unrealized_pnl', 0.0)
            
            # Format outputs
            return (
                f"${total_pnl:,.2f}",
                f"{win_rate:.1f}%",
                f"{active_positions}",
                f"${unrealized_pnl:,.2f}"
            )
        
        # Signal distribution chart callback
        @self.app.callback(
            Output("signal-distribution-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_signal_distribution(n):
            # Load latest signal metrics
            signal_metrics = self._load_signal_metrics()
            
            # Extract signal type distribution
            signal_types = signal_metrics.get('signal_types', {})
            types = list(signal_types.keys())
            counts = list(signal_types.values())
            
            # Create pie chart
            fig = px.pie(
                values=counts,
                names=types,
                title="Signal Type Distribution"
            )
            
            fig.update_layout(
                margin=dict(l=20, r=20, t=30, b=20),
                height=300
            )
            
            return fig
        
        # Signal confidence chart callback
        @self.app.callback(
            Output("signal-confidence-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_signal_confidence(n):
            # Load metrics history
            signal_metrics_list = self._load_signal_metrics(limit=100)
            
            # Extract confidence data
            dates = []
            avg_confidences = []
            
            for metrics in signal_metrics_list:
                timestamp = metrics.get('timestamp')
                if not timestamp:
                    continue
                
                dates.append(timestamp)
                avg_confidences.append(metrics.get('avg_confidence', 0.0))
            
            # Create line chart
            fig = px.line(
                x=dates,
                y=avg_confidences,
                title="Average Signal Confidence Over Time"
            )
            
            fig.update_layout(
                xaxis_title="Date",
                yaxis_title="Average Confidence",
                height=300,
                margin=dict(l=40, r=20, t=30, b=40)
            )
            
            return fig
        
        # Trades by exchange chart callback
        @self.app.callback(
            Output("trades-by-exchange-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_trades_by_exchange(n):
            # Load latest trade metrics
            trade_metrics = self._load_trade_metrics()
            
            # Extract trade data by exchange
            exchanges = []
            successful = []
            failed = []
            
            for exchange, data in trade_metrics.get('trades_by_exchange', {}).items():
                exchanges.append(exchange)
                successful.append(data.get('successful', 0))
                failed.append(data.get('failed', 0))
            
            # Create stacked bar chart
            fig = go.Figure()
            
            fig.add_trace(go.Bar(
                x=exchanges,
                y=successful,
                name='Successful',
                marker_color='green'
            ))
            
            fig.add_trace(go.Bar(
                x=exchanges,
                y=failed,
                name='Failed',
                marker_color='red'
            ))
            
            fig.update_layout(
                barmode='stack',
                title="Trades by Exchange",
                xaxis_title="Exchange",
                yaxis_title="Trade Count",
                height=300,
                margin=dict(l=40, r=20, t=30, b=40)
            )
            
            return fig
        
        # Trade execution rate chart callback
        @self.app.callback(
            Output("trade-execution-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_trade_execution_rate(n):
            # Load metrics history
            trade_metrics_list = self._load_trade_metrics(limit=100)
            
            # Extract execution rate data
            dates = []
            execution_rates = []
            
            for metrics in trade_metrics_list:
                timestamp = metrics.get('timestamp')
                if not timestamp:
                    continue
                
                dates.append(timestamp)
                execution_rates.append(metrics.get('execution_success_rate', 0.0) * 100)
            
            # Create line chart
            fig = px.line(
                x=dates,
                y=execution_rates,
                title="Trade Execution Success Rate Over Time"
            )
            
            fig.update_layout(
                xaxis_title="Date",
                yaxis_title="Success Rate (%)",
                height=300,
                margin=dict(l=40, r=20, t=30, b=40)
            )
            
            return fig
        
        # Portfolio allocation chart callback
        @self.app.callback(
            Output("portfolio-allocation-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_portfolio_allocation(n):
            # Load latest position metrics
            position_metrics = self._load_position_metrics()
            
            # Extract position data by symbol
            positions_by_symbol = position_metrics.get('positions_by_symbol', {})
            symbols = list(positions_by_symbol.keys())
            counts = list(positions_by_symbol.values())
            
            # Create pie chart
            fig = px.pie(
                values=counts,
                names=symbols,
                title="Portfolio Allocation by Symbol"
            )
            
            fig.update_layout(
                margin=dict(l=20, r=20, t=30, b=20),
                height=400
            )
            
            return fig
        
        # Drawdown chart callback
        @self.app.callback(
            Output("drawdown-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_drawdown_chart(n):
            # Load metrics history
            position_metrics_list = self._load_position_metrics(limit=100)
            
            # Extract drawdown data
            dates = []
            equity_values = []
            drawdowns = []
            
            for metrics in position_metrics_list:
                timestamp = metrics.get('timestamp')
                if not timestamp:
                    continue
                
                dates.append(timestamp)
                
                # We'll use unrealized P&L as a proxy for equity
                unrealized_pnl = metrics.get('unrealized_pnl', 0.0)
                equity = 10000 + unrealized_pnl  # Assuming starting balance of 10000
                equity_values.append(equity)
            
            # Calculate drawdown from equity curve
            if equity_values:
                max_equity = equity_values[0]
                for i, equity in enumerate(equity_values):
                    if equity > max_equity:
                        max_equity = equity
                    
                    drawdown_pct = (max_equity - equity) / max_equity * 100 if max_equity > 0 else 0
                    drawdowns.append(drawdown_pct)
            
            # Create dual y-axis figure
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=equity_values,
                    name="Equity",
                    line=dict(color="blue")
                ),
                secondary_y=False
            )
            
            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=drawdowns,
                    name="Drawdown %",
                    line=dict(color="red")
                ),
                secondary_y=True
            )
            
            fig.update_layout(
                title="Equity Curve and Drawdown",
                height=300,
                margin=dict(l=40, r=40, t=30, b=40)
            )
            
            fig.update_yaxes(title_text="Equity Value", secondary_y=False)
            fig.update_yaxes(title_text="Drawdown %", secondary_y=True)
            
            return fig
        
        # Position concentration chart callback
        @self.app.callback(
            Output("position-concentration-chart", "figure"),
            Input("interval-component", "n_intervals")
        )
        def update_position_concentration(n):
            # Load latest risk metrics
            position_metrics = self._load_position_metrics()
            
            # Extract position concentration data
            position_concentration = position_metrics.get('position_concentration', {})
            symbols = list(position_concentration.keys())
            concentrations = list(position_concentration.values())
            
            # Create bar chart
            fig = px.bar(
                x=symbols,
                y=concentrations,
                title="Position Concentration by Symbol"
            )
            
            fig.update_layout(
                xaxis_title="Symbol",
                yaxis_title="Concentration (%)",
                height=300,
                margin=dict(l=40, r=20, t=30, b=40)
            )
            
            return fig
        
        # Agent management status callback
        @self.app.callback(
            Output("agent-management-status", "children"),
            Input("add-agent-button", "n_clicks"),
            Input("refresh-agents-button", "n_clicks"),
            prevent_initial_call=True
        )
        def update_agent_management_status(add_clicks, refresh_clicks):
            ctx = dash.callback_context
            
            if ctx.triggered:
                prop_id = ctx.triggered[0]['prop_id'].split('.')[0]
                
                if prop_id == 'add-agent-button':
                    return "Adding new agent..."
                elif prop_id == 'refresh-agents-button':
                    return "Refreshing agents..."
            
            return ""
        
        # Agent config modal callback
        @self.app.callback(
            Output("agent-config-modal", "is_open"),
            [Input("add-agent-button", "n_clicks"),
             Input("agent-modal-cancel", "n_clicks"),
             Input("agent-modal-save", "n_clicks")],
            [State("agent-config-modal", "is_open")],
            prevent_initial_call=True
        )
        def toggle_agent_config_modal(add_clicks, cancel_clicks, save_clicks, is_open):
            ctx = dash.callback_context
            
            if ctx.triggered:
                prop_id = ctx.triggered[0]['prop_id'].split('.')[0]
                
                if prop_id == 'add-agent-button':
                    return not is_open
                elif prop_id == 'agent-modal-cancel' or prop_id == 'agent-modal-save':
                    return not is_open
            
            return is_open
        
        # Agent form submission callback
        @self.app.callback(
            Output("agent-management-status", "children"),
            [Input("agent-modal-save", "n_clicks")],
            [State("agent-name-input", "value"),
             State("agent-type-dropdown", "value"),
             State("agent-strategy-dropdown", "value"),
             State("agent-symbols-input", "value"),
             State("agent-timeframes-input", "value"),
             State("agent-risk-input", "value"),
             State("agent-leverage-input", "value")],
            prevent_initial_call=True
        )
        def submit_agent_form(n_clicks, name, type, strategy, symbols, timeframes, risk, leverage):
            if n_clicks:
                # Create new agent
                agent_config = {
                    "name": name,
                    "type": type,
                    "strategy": strategy,
                    "symbols": symbols.split(","),
                    "timeframes": timeframes.split(","),
                    "risk_per_trade": risk,
                    "leverage": leverage
                }
                
                self.db.save_agent(agent_config)
                
                return "Agent saved successfully!"
            
            return ""
    
    def _load_signal_metrics(self, agent_id=None, limit=100):
        """Load signal metrics from the database."""
        try:
            if agent_id:
                # Get metrics for a specific agent
                metrics_list = []
                db_metrics = self.db.get_metrics("signals", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data and agent_id in data["agents"]:
                        agent_data = data["agents"][agent_id]
                        for signal in agent_data.get("signals", []):
                            signal["timestamp"] = metrics["timestamp"]
                            metrics_list.append(signal)
                
                return metrics_list
            else:
                # Get metrics for all agents
                metrics_list = []
                db_metrics = self.db.get_metrics("signals", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data:
                        for agent_id, agent_data in data["agents"].items():
                            for signal in agent_data.get("signals", []):
                                signal["agent_id"] = agent_id
                                signal["timestamp"] = metrics["timestamp"]
                                metrics_list.append(signal)
                
                return metrics_list
        except Exception as e:
            logger.error(f"Error loading signal metrics: {e}")
            return []
            
    def _load_trade_metrics(self, agent_id=None, limit=100):
        """Load trade metrics from the database."""
        try:
            if agent_id:
                # Get metrics for a specific agent
                metrics_list = []
                db_metrics = self.db.get_metrics("orders", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data and agent_id in data["agents"]:
                        agent_data = data["agents"][agent_id]
                        for order in agent_data.get("orders", []):
                            order["timestamp"] = metrics["timestamp"]
                            metrics_list.append(order)
                
                return metrics_list
            else:
                # Get metrics for all agents
                metrics_list = []
                db_metrics = self.db.get_metrics("orders", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data:
                        for agent_id, agent_data in data["agents"].items():
                            for order in agent_data.get("orders", []):
                                order["agent_id"] = agent_id
                                order["timestamp"] = metrics["timestamp"]
                                metrics_list.append(order)
                
                return metrics_list
        except Exception as e:
            logger.error(f"Error loading trade metrics: {e}")
            return []
            
    def _load_position_metrics(self, agent_id=None, limit=100):
        """Load position metrics from the database."""
        try:
            if agent_id:
                # Get metrics for a specific agent
                metrics_list = []
                db_metrics = self.db.get_metrics("positions", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data and agent_id in data["agents"]:
                        agent_data = data["agents"][agent_id]
                        for position in agent_data.get("positions", []):
                            position["timestamp"] = metrics["timestamp"]
                            metrics_list.append(position)
                
                return metrics_list
            else:
                # Get metrics for all agents
                metrics_list = []
                db_metrics = self.db.get_metrics("positions", limit=limit)
                
                for metrics in db_metrics:
                    data = metrics["data"]
                    if "agents" in data:
                        for agent_id, agent_data in data["agents"].items():
                            for position in agent_data.get("positions", []):
                                position["agent_id"] = agent_id
                                position["timestamp"] = metrics["timestamp"]
                                metrics_list.append(position)
                
                return metrics_list
        except Exception as e:
            logger.error(f"Error loading position metrics: {e}")
            return []
    
    async def collect_metrics(self):
        """Collect and save all metrics."""
        # Collect signal metrics
        signal_metrics = await self.signal_collector.collect_metrics()
        self.db.save_metrics('signals', signal_metrics)
        
        # Collect trade metrics
        trade_metrics = await self.trade_collector.collect_metrics()
        self.db.save_metrics('trades', trade_metrics)
        
        logger.info("Collected and saved all metrics")
    
    async def metrics_collection_task(self):
        """Background task to periodically collect metrics."""
        while True:
            try:
                await self.collect_metrics()
                await asyncio.sleep(self.update_interval_seconds)
            except Exception as e:
                logger.error(f"Error in metrics collection task: {str(e)}", exc_info=True)
                await asyncio.sleep(10)  # Short sleep on error
    
    def start_metrics_collection(self):
        """Start the background metrics collection task."""
        loop = asyncio.get_event_loop()
        loop.create_task(self.metrics_collection_task())
    
    def run_server(self, host: str = '0.0.0.0', port: int = 8050, debug: bool = False):
        """Run the dashboard server."""
        # Start metrics collection
        self.start_metrics_collection()
        
        # Run the Dash app
        self.app.run_server(host=host, port=port, debug=debug)


def create_dashboard(config: Dict[str, Any] = None) -> TradingDashboard:
    """
    Create and configure a trading dashboard.
    
    Args:
        config: Dashboard configuration options
        
    Returns:
        Configured TradingDashboard instance
    """
    config = config or {}
    
    # Set default paths based on config
    metrics_path = config.get('metrics_path', 'metrics')
    signals_file = config.get('signals_file', 'signals.json')
    trades_file = config.get('trades_file', 'trades.json')
    
    # Create dashboard
    dashboard = TradingDashboard(
        metrics_path=metrics_path,
        signals_file=signals_file,
        trades_file=trades_file,
        update_interval_seconds=config.get('update_interval_seconds', 60),
        app_title=config.get('app_title', "AI Trading Farm Dashboard"),
        config_path=config.get('config_path'),
        db_path=config.get('db_path', "data/trading_farm.db")
    )
    
    # Add Hyperliquid integration if enabled
    if os.environ.get("INTEGRATE_HYPERLIQUID", "false").lower() == "true":
        try:
            from hyperliquid_integration import setup_hyperliquid_integration
            # Add Hyperliquid components to the dashboard
            # This doesn't require Flask directly, but works with the dashboard's Dash app
            setup_hyperliquid_integration(dashboard.app)
            logger.info("Hyperliquid integration added to dashboard")
        except Exception as e:
            logger.error(f"Failed to integrate Hyperliquid with dashboard: {e}")
    
    return dashboard


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and run dashboard
    dashboard = create_dashboard()
    dashboard.run_server(debug=True)
