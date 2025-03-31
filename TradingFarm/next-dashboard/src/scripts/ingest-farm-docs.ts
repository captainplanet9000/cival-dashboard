/**
 * FARMDOCS Ingestion Script
 * 
 * This script runs the database migration to create document_chunks table
 * and then ingests the FARMDOCS documents into the Trading Farm's memory system.
 */

import createDocumentChunksTable from '../data-access/migrations/013_create_document_chunks_table';
import { documentIngestionService } from '../data-access/services/document-ingestion-service';
import { API_CONFIG } from '../data-access/services/api-config';

// FARMDOCS content - copied from the user's message
const FARMDOCS = {
  'Project Requirements Document': `# 1. Project Requirements Document
1. Introduction

Purpose: To outline the functional and non-functional requirements for the "Trading Farm," an automated multi-agent, multi-asset trading system operating across centralized exchanges (CEX) and decentralized finance (DeFi) protocols.
Project Goal: To create a robust, scalable, and intelligent platform enabling automated trading strategies executed by coordinated agents, managed through a comprehensive UI and a natural language interface (ElizaOS), aiming for 100% functionality including live trading and agent collaboration.
Scope: Development includes backend infrastructure, data pipelines, exchange/DeFi integrations, agent systems, real-time components, goal management, AI integration (including NLP and strategy generation), banking/vault systems, UI/UX, testing, security, compliance, and performance optimization.
2. Functional Requirements

Connectivity & Integration:
Real-time, authenticated connections to major CEXs (Binance, Coinbase, FTX, Hyperliquid, etc.) and L1/L2 blockchains (Ethereum, Solana, Arbitrum, Sui).
Integration with DeFi protocols (Uniswap, Aave, Compound).
Integration with specialized protocols/services: Flashbots (MEV protection), Dune Analytics (on-chain data), GasHawk (gas optimization), CoinAPI/MarketStack (market data), OpenZeppelin Relayers (secure transactions), Alchemy (infra), DeBridge (cross-chain), API3 (oracles), Neon PostgreSQL (database/caching/vectors), Serp API (sentiment), OpenAI/OpenRouter (AI models), ElevenLabs (voice).
Data Management:
Real-time market data pipeline (prices, order books) from multiple sources.
Unified, normalized data format.
Efficient storage (TimescaleDB, Neon PostgreSQL) and caching (Redis, Neon).
Historical data access for backtesting and analytics.
On-chain data querying and analysis.
Trading Execution:
Unified API for order placement, cancellation, and management across venues.
Smart Order Routing (SOR) for best execution.
Support for various order types (Market, Limit, TWAP, VWAP, Iceberg).
Real-time order confirmation and position management.
Transaction Cost Analysis (TCA).
Gas optimization and MEV protection for on-chain transactions.
Agent System:
Framework for creating, deploying, managing (start, stop, pause), and monitoring trading agents.
Secure wallet isolation per agent.
Agent-to-agent communication protocol.
Multi-agent coordination for complex tasks and portfolio-level goals.
Agent specialization, hierarchy, and dynamic task allocation.
Strategy Development & Management:
Integration of ML models for market prediction and strategy generation.
Comprehensive backtesting framework using historical data.
Strategy parameter auto-optimization.
PineScript Code Editor for strategy creation/editing.
Strategy lifecycle management (versioning, deployment, monitoring).
Volatility-based position sizing.
Goal System:
Framework for defining, tracking, and managing trading goals (e.g., profit targets, risk limits).
Automatic strategy assignment based on goals.
Goal adaptation based on market conditions.
Goal progress visualization and reporting.
Conflict resolution between competing goals/strategies.
ElizaOS (Natural Language Interface):
Natural language command system for trading operations, queries, and system management.
Contextual understanding of financial terminology.
Knowledge Management System (RAG) using vector databases (Neon/Supabase+pgvector) for insights and information retrieval.
Chat interface integrated across the dashboard.
Voice interaction capabilities (commands, summaries, alerts).
Portfolio Management:
Real-time tracking of positions, P&L, and portfolio value across all connected venues (CEX/DeFi/Chains).
Automated portfolio rebalancing.
Comprehensive risk analytics (VaR, volatility, drawdowns, correlation).
Scenario analysis and stress testing.
Banking & Financial Operations:
Secure Vault system for fund storage and management.
Internal transaction system for deposits, withdrawals, and agent fund allocation.
Transaction fee management and optimization.
Multi-signature security for critical operations.
Secure key management and wallet recovery.
Tax reporting documentation support.
UI/UX:
Real-time, interactive dashboard displaying market data, positions, performance, agent status, goals, logs, etc.
Responsive design for desktop and mobile access.
Theme customization (dark/light modes).
Advanced charting and data visualization components.
Intuitive interfaces for managing agents, strategies, goals, and transactions.
Integrated ElizaOS command center/chat.
3. Non-Functional Requirements

Performance: High throughput, low latency for market data processing and trade execution. Scalable architecture to handle increasing load. Efficient database operations and caching.
Reliability: High availability (HA) with redundancy and failover mechanisms. Robust error handling and automated reconnection logic for external connections.
Security: Secure authentication, encrypted communication, secure API key/private key management (rotation, isolation, hardware/vault solutions), anomaly detection, access controls (2FA, IP restriction), regular security audits, penetration testing. MEV protection.
Scalability: Horizontally scalable architecture (microservices, distributed systems) using tools like Kafka, Redis, and auto-scaling infrastructure. Serverless database (Neon).
Maintainability: Modular codebase, clear documentation, comprehensive logging and monitoring (Prometheus), automated testing (unit, integration, performance, E2E).
Compliance: Audit trails for all actions, transaction monitoring, record-keeping, support for geographic restrictions if necessary.`,

  'Tech Stack & APIs Document': `# 2. Tech Stack & APIs Document
1. Backend

Language: Python (implied, common for trading systems & AI), potentially Node.js for specific services (e.g., WebSocket handling).
Frameworks: FastAPI / Flask (Python APIs), Express.js (Node.js, if used).
Real-time Communication: WebSockets.
Messaging/Queues: Kafka (for event streaming, inter-service communication), Redis (coordination, caching, potentially pub/sub).
Databases:
Time-Series: TimescaleDB (for market data, performance metrics).
Relational/Operational: Neon PostgreSQL (Serverless, primary data store, caching, vector store).
Vector: Neon PostgreSQL with pgvector extension, potentially Supabase with pgvector (for RAG/Knowledge Management).
Caching: Redis, integrated Neon caching.
Containerization/Orchestration: Docker, Kubernetes (implied for distributed architecture).
Monitoring: Prometheus, Grafana (implied).
Infrastructure: Cloud Provider (AWS/GCP/Azure), potentially Alchemy for enhanced blockchain node access.
2. Frontend

Language: TypeScript.
Framework/Library: React (implied by component names like Popover, Dialog).
State Management: Redux Toolkit / Zustand / Context API.
UI Components: Shadcn/ui (implied by Popover), potentially Material UI or custom components.
Charting: Chart.js, D3.js.
Build Tools: Vite / Webpack.
Styling: Tailwind CSS (common with Shadcn/ui) or CSS-in-JS.
3. Key APIs & Integrations

CEX APIs: Binance, Coinbase, FTX (use with caution/replace), Hyperliquid - REST & WebSocket APIs for market data and trading.
Blockchain Interaction:
Web3 Libraries (ethers.js/web3.py) for EVM chains (Ethereum, Arbitrum).
Specific SDKs for Solana, Sui.
Alchemy (Enhanced node access, transaction simulation, multi-chain support).
DeFi Protocols: Direct smart contract interactions or SDKs for Uniswap, Aave, Compound.
Data Providers:
CoinAPI (Unified CEX/DeFi market data, historical data).
MarketStack API (Stock market data, Forex, Indices).
Dune Analytics API (On-chain analytics).
API3 (Decentralized oracles/first-party price feeds).
Specialized Services:
Flashbots (MEV protection, private bundles).
GasHawk (Gas optimization).
OpenZeppelin Defender Relayers (Secure, automated transaction relaying).
DeBridge (Cross-chain transfers/liquidity).
Serp API (Programmatic search for sentiment analysis).
AI & NLP:
OpenAI API (GPT models for NLP, analysis, strategy generation).
OpenRouter API (Access to multiple AI models, routing).
ElevenLabs API (Text-to-speech for voice alerts/interaction).
Infrastructure/DevOps:
Neon PostgreSQL (Serverless DB).
TimescaleDB (Time-series DB).
Kafka (Message queue).
Redis (Caching, coordination).
Prometheus (Metrics).
Nginx (Proxy Manager, routing).
Supabase (Alternative/additional backend service, potentially auth/DB/vectors).`,

  'App Flow Document': `# 3. App Flow Document
1. High-Level Data Flow

External Data Sources (Exchanges, Blockchains, APIs) -> Data Pipeline (Normalization, Processing) -> Real-time Storage (TimescaleDB, Redis Cache) & Persistent Storage (Neon PostgreSQL)
Storage/Cache -> Backend Services (Trading Logic, Portfolio Mgmt, Agent Mgmt, Goal Mgmt) & Frontend Dashboard
Backend Services -> Execution Engine/API Wrappers -> External Venues (Exchanges, Blockchains)
User/ElizaOS <-> Frontend Dashboard <-> Backend APIs
2. Core Workflows

Market Data Ingestion:
WebSocket connections established with CEXs, DeFi sources, Blockchain nodes (via Alchemy/direct).
Data streams into the Data Pipeline service.
Data is normalized, potentially enriched, and validated.
Processed data is published via Kafka/Redis PubSub.
Subscribers (RealtimeMonitor, Storage services, Agents) consume the data.
Data stored in TimescaleDB (raw/aggregated) and cached in Redis.
Trade Execution (Agent Initiated):
Agent's strategy logic determines a trade signal.
Agent requests trade execution via the Agent Management service or directly interacts with the Execution Engine API.
Execution Engine receives the request (e.g., buy 1 ETH on best available venue).
Smart Order Router (SOR) queries real-time data, determines optimal venue(s) and execution strategy (e.g., split order).
For CEX: Order sent via unified Exchange API wrapper.
For DeFi: Transaction built, potentially optimized (GasHawk), protected (Flashbots), and relayed (OpenZeppelin).
Confirmation received from venue/blockchain.
Execution status updated in Portfolio Management service and database (Neon).
Agent notified of execution status.
Frontend updated via WebSocket push.
User Initiated Trade (via ElizaOS/UI):
User issues command ("Buy 0.5 BTC on Coinbase") via Chat or UI form.
Frontend sends request to Backend API (potentially ElizaOS endpoint).
ElizaOS parses intent, extracts parameters, performs risk checks/confirmation.
Backend API triggers Execution Engine workflow (similar to steps 3-10 above).
Agent Coordination:
Supervisor agent identifies a portfolio-level goal or complex task.
Supervisor communicates task requirements to relevant worker agents via the Agent Communication Protocol (potentially over Kafka/Redis).
Worker agents accept/coordinate actions.
Conflict Resolution Framework mediates if agents have competing objectives based on priorities/resource allocation.
Agents execute their parts of the task (e.g., one hedges on CEX, another enters DeFi position).
Status reported back to Supervisor and logged.
Goal Management:
User defines a goal (e.g., "Achieve 5% portfolio growth this month with max 10% drawdown") via UI or ElizaOS.
Goal System service stores the goal (Neon).
Strategy Assignment logic selects appropriate agent(s) and strategies.
Agents execute trades contributing to the goal.
Portfolio Management service tracks progress against goal metrics.
Goal Reporting service updates dashboard visualization.
Goal Adaptation logic monitors market conditions and adjusts goal parameters or assigned strategies if needed.
Notifications sent on milestone achievement or if goal is at risk.
3. System Interactions

Frontend <-> Backend: REST/GraphQL APIs for data fetching, command execution. WebSockets for real-time updates (market data, P&L, order status, agent logs, notifications).
Backend Services <-> Databases: CRUD operations, data streaming queries.
Backend Services <-> Message Queues (Kafka/Redis): Publishing events (trades, price updates), consuming tasks, inter-service communication.
Backend Services <-> External APIs: Authenticated requests for data and execution via unified wrappers.`,

  'Backend Structure Document': `# 4. Backend Structure Document
1. Architecture Style

Microservices / Distributed System: Based on the checklist items like "Distributed Architecture Implementation," "Load Balancer Service," "Task Processor," and integration with Kafka/Redis/Prometheus. Key services likely include:
Data Pipeline Service(s)
Exchange/DeFi Connector Service(s)
Execution Engine / SOR Service
Portfolio Management Service
Agent Management Service
Goal Management Service
ElizaOS / NLP Service
Knowledge Management / RAG Service
Authentication / User Service
Banking / Vault Service
Reporting / Analytics Service
Notification Service
Web API Gateway
2. Database Schema (Conceptual - Neon PostgreSQL / TimescaleDB)

users: user_id, username, hashed_password, email, two_factor_secret, preferences, created_at, last_login
api_keys: key_id, user_id, exchange_name / service_name, encrypted_key, encrypted_secret, permissions, ip_restrictions, created_at, last_used, is_active
wallets / vaults: wallet_id, user_id, blockchain_type (e.g., ETH, SOL), address, encrypted_private_key / kms_reference, balance_info (JSONB), is_multisig, created_at
agents: agent_id, user_id, farm_id (if multi-farm), name, strategy_id, status (running, paused, stopped), allocated_capital (JSONB per asset/wallet), performance_metrics (JSONB), config (JSONB), wallet_id (isolated), created_at, updated_at
strategies: strategy_id, user_id, name, description, code / script (e.g., PineScript), version, parameters (JSONB), backtest_results (JSONB), created_at, updated_at
agent_deployments: deployment_id, agent_id, strategy_id, strategy_version, farm_id, status, start_time, end_time, config_snapshot (JSONB)
goals: goal_id, user_id, name, description, type (e.g., profit, risk), target_metric, target_value, timeframe_start, timeframe_end, status (active, achieved, failed), current_progress (JSONB), assigned_agents (Array of agent_id), priority, created_at
trades: trade_id, agent_id (nullable), user_id (if manual), goal_id (nullable), exchange_order_id, internal_order_id, exchange / protocol, asset_pair, side (buy/sell), order_type, status (pending, filled, partial, cancelled, failed), quantity, filled_quantity, avg_fill_price, limit_price, commission, commission_asset, timestamp, execution_details (JSONB - e.g., SOR path, gas used)
positions: position_id, user_id, agent_id (nullable), exchange / protocol / wallet_id, asset, quantity, average_entry_price, unrealized_pnl, realized_pnl, last_updated
market_data (TimescaleDB Hypertable): timestamp, exchange / source, pair, price, volume, bid, ask, order_book_snapshot (JSONB, optional), trade_id (optional)
transactions (Financial): tx_id, user_id, wallet_id, type (deposit, withdrawal, internal_transfer), asset, amount, status, external_tx_hash (nullable), fee, fee_asset, timestamp
knowledge_vectors (Neon/pgvector): vector_id, content_chunk, source_document, embedding (vector type), metadata (JSONB)
logs: log_id, timestamp, service_name, level (info, warn, error), message, context (JSONB - e.g., agent_id, trade_id)
alerts: alert_id, user_id, trigger_condition, metric, threshold, status (active, triggered, resolved), last_triggered_at, notification_channels (JSONB)
3. Data Models

Defined using Pydantic (Python) or interfaces/classes (TypeScript) mirroring the database schemas for API requests/responses and internal service communication.
4. Backend Communication

Synchronous: REST/GraphQL APIs (likely FastAPI) for request/response interactions (e.g., user commands, fetching data for UI).
Asynchronous: Kafka / Redis PubSub for event-driven communication (e.g., market data updates, trade fills, agent status changes). Redis might also be used for distributed locking or coordination.`,

  'Frontend Guidelines': `# 5. Frontend Guidelines
1. UI/UX Principles

Real-time: Data displayed should update live without requiring manual refreshes (WebSockets).
Information Density: Display complex information clearly and concisely. Use dashboards effectively.
Intuitiveness: Easy navigation, clear actions, consistent design language.
Responsiveness: Adapt layouts gracefully from large desktop monitors to mobile devices.
Customization: Allow users to personalize dashboards, themes (dark/light), and notifications.
Clarity: Use appropriate visualizations (charts, tables, indicators) for different data types. Provide tooltips and help text.
Feedback: Provide immediate feedback for user actions (e.g., command execution status, saving settings).
2. Key Components & Views

Main Dashboard: Overview of portfolio P&L, key metrics, market status, active agent summary, recent activity, open orders, goal progress. Customizable widgets.
Trading Terminal: Charting (advanced, with indicators), order entry forms, order book visualization, recent trades feed.
Agent Management: Table/list of agents, status indicators, performance metrics (P&L, Sharpe, etc.), controls (start/stop/pause), configuration editor, log viewer.
Strategy Editor: PineScript editor (syntax highlighting, completion), backtesting interface (configuration, results visualization), deployment manager.
Portfolio View: Detailed breakdown of positions by asset, exchange/protocol, agent. Performance history, risk metrics (VaR, drawdown charts).
Goal Management: List/board of goals, progress tracking visualization, creation/editing interface, strategy assignment controls.
Banking/Transactions: Deposit/withdrawal interface, transaction history (filterable, searchable), vault/wallet overview.
ElizaOS Chat Interface: Persistent chat window/panel for natural language commands and system responses/insights.
Settings: User profile, API key management, security settings (2FA), notification preferences, theme selection.
Analytics/Reporting: Dedicated views for deeper analysis, TCA reports, historical performance, goal reports.
RealtimeMonitor/SocketEventStream/DataPipelineMonitor: Specific components (as mentioned in checklist) to visualize system health and data flow.
Notification Center: Dropdown/panel showing recent alerts and system messages.
3. Technology & Implementation

Framework: React with TypeScript.
Data Fetching: React Query / SWR for managing server state, API requests.
Real-time Updates: Native WebSocket API or libraries like socket.io-client.
Charting: Chart.js, D3.js.
Component Library: Shadcn/ui or similar for pre-built, accessible components.
Styling: Tailwind CSS.
State Management: Appropriate library (Redux Toolkit, Zustand) for complex global state.
4. Responsiveness & Mobile

Use responsive design techniques (CSS Grid, Flexbox, media queries).
Prioritize key information and actions for smaller screens.
Develop simplified views and touch-optimized controls for the dedicated Mobile Trading Interface.
5. Integration

Connect to backend APIs via a structured client (e.g., generated from OpenAPI spec or using Axios/fetch).
Handle WebSocket connections for real-time data feeds.
Integrate ElizaOS chat component, sending user input to the backend and displaying responses.
Display visualizations using data fetched from analytics endpoints or processed from real-time streams.`
};

/**
 * Main function to run the migration and ingest FARMDOCS
 */
async function ingestFarmDocs() {
  try {
    console.log('=== Starting FARMDOCS Ingestion Process ===');
    
    // Step 1: Run the database migration
    console.log('\n== Running Database Migration ==');
    await createDocumentChunksTable();
    
    // Step 2: Initialize the document ingestion service
    console.log('\n== Initializing Document Ingestion Service ==');
    documentIngestionService.initialize(API_CONFIG.OPENAI_API_KEY);
    
    // Step 3: Ingest FARMDOCS
    console.log('\n== Ingesting FARMDOCS ==');
    const documentIds = await documentIngestionService.ingestFarmDocs(FARMDOCS);
    
    console.log('\n== FARMDOCS Ingestion Summary ==');
    Object.entries(documentIds).forEach(([title, id]) => {
      console.log(`- ${title}: ${id}`);
    });
    
    console.log('\n=== FARMDOCS Ingestion Completed Successfully ===');
    console.log('Documents are now available in the Trading Farm memory system for agents to reference.');
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('Failed to ingest FARMDOCS:', error);
    process.exit(1);
  }
}

// Run the main function
ingestFarmDocs(); 