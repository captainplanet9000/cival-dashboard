# Trading Farm Dashboard Live Data Implementation Plan (ElizaOS Centric)

## Overview
This checklist outlines the implementation plan to replace mock data with live elements in the Trading Farm dashboard. This version prioritizes a user interface designed around a central, fully functional ElizaOS terminal, with other live data widgets (assets, notifications, market data) arranged peripherally.

## Phase 1: Core Infrastructure & Authentication (Weeks 1-2)

*   **Goal:** Establish the secure backend foundation and user authentication.
*   **Tasks:** (Same as the previous plan - focuses on Supabase setup, RLS, and the authentication provider)

### Supabase Backend Setup
- [ ] Apply all migrations and verify database schema
  ```bash
  npx supabase migration up
  npx supabase gen types typescript --local > src/types/database.types.ts
  ```
- [ ] Configure Row Level Security (RLS) policies for all tables
- [ ] Set up proper indexes for performance optimization
- [ ] Create database triggers for real-time updates (if needed)

### Authentication Flow
- [ ] Implement robust authentication provider (`AuthProvider`)
- [ ] Set up session management with Supabase Auth
- [ ] Add token handling for API requests (including ElizaOS client)
- [ ] Configure auth state change listeners
- [ ] Implement automatic token refresh mechanism
- [ ] Set up protected routes and access control

## Phase 2: ElizaOS Terminal Integration (Weeks 2-4)

*   **Goal:** Integrate the core ElizaOS terminal functionality and prepare it for central placement.
*   **Tasks:** (Mostly the same backend logic, adds focus on component styling for the new layout)

### ElizaOS Client Library
- [ ] Create `ElizaOSClient` class for API communication
- [ ] Implement token management and authorization
- [ ] Add `executeCommand` method for command processing
- [ ] Set up WebSocket connection logic within the client for real-time responses
- [ ] Implement command history and context management
- [ ] Add error handling and retry mechanisms

### Central Command Console Component
- [ ] Update `CommandConsole` component to use the real `ElizaOSClient`
- [ ] Implement streaming responses from language models
- [ ] Add Markdown rendering for formatted responses
- [ ] Style the `CommandConsole` for central prominence (consider sizing, borders, theme integration)
- [ ] Ensure the terminal component is resizable or adapts well to different screen sizes
- [ ] Add command suggestions and auto-completion
- [ ] Implement context-aware command processing
- [ ] Create command history navigation (up/down arrows)

## Phase 3: Exchange Integration & Asset Data (Weeks 3-5)

*   **Goal:** Connect to exchanges and fetch real asset/wallet data.
*   **Tasks:** (Backend logic remains the same, UI components need to be designed as widgets)

### Exchange Connectors
- [ ] Create base `ExchangeConnector` interface
- [ ] Implement `BinanceConnector` with real API calls
- [ ] Implement `BybitConnector` with real API calls
- [ ] Implement `HyperliquidConnector` with real API calls
- [ ] Implement `CoinbaseConnector` with real API calls
- [ ] Add secure credential management (using vault service or encrypted storage)
- [ ] Implement rate limiting and request optimization
- [ ] Create error handling and retry mechanisms

### Wallet & Asset Services
- [ ] Create `AssetService` for aggregated balance information
- [ ] Implement exchange connector initialization based on user credentials
- [ ] Add `getAggregatedBalances` method for portfolio overview
- [ ] Create methods for fetching individual exchange balances
- [ ] Implement real-time price data fetching for valuation
- [ ] Add USD value calculation for all assets
- [ ] Create caching layer for performance optimization

## Phase 4: Notification System (Weeks 4-6)

*   **Goal:** Implement the real-time notification system.
*   **Tasks:** (Backend logic remains the same, UI component needs placement in the new layout)

### Notification Service
- [ ] Create `NotificationService` for managing user notifications
- [ ] Implement database schema for notifications in Supabase
- [ ] Add methods for fetching notifications (`getNotifications`)
- [ ] Create real-time subscription via Supabase Realtime for new notifications
- [ ] Implement read/unread status management (`markAsRead`, `markAllAsRead`)
- [ ] Add notification categorization (alerts, trades, system, agent, security)
- [ ] Create server-side method (`createNotification`) for generating notifications

### Notification UI Element
- [ ] Design notification UI (e.g., dropdown, sidebar panel, toast)
- [ ] Update `NotificationCenter` component (or create a new one) to use `NotificationService`
- [ ] Implement unread count badge
- [ ] Add real-time updates for new notifications in the UI
- [ ] Integrate toast notifications for important alerts
- [ ] Ensure placement fits the ElizaOS-centric layout

## Phase 5: Dashboard Layout Redesign (Weeks 5-6)

*   **Goal:** Implement the new dashboard layout with the ElizaOS terminal at the center.
*   **Tasks:** (Focuses entirely on the UI structure)

### Layout Implementation
- [ ] Design the core dashboard layout structure (e.g., using CSS Grid, Flexbox)
- [ ] Create a main `DashboardLayout` component
- [ ] Define regions/containers for the central terminal and surrounding widgets
- [ ] Ensure the layout is responsive and works on different screen sizes
- [ ] Implement theme integration (light/dark modes) for the layout
- [ ] Consider using a widget library or system for draggable/resizable panels (optional but recommended for flexibility)

### Adapt Core Components
- [ ] Adapt the `CommandConsole` component to fit snugly in the central area
- [ ] Design reusable `Widget` or `Panel` components for surrounding content
- [ ] Modify existing components (`StatCard`, `PortfolioChart`, `AgentStatusList`, `RecentTradesList`, etc.) to render within these `Widget` components

## Phase 6: Integrating Live Data into New Layout (Weeks 6-8)

*   **Goal:** Populate the newly designed layout widgets with live data from backend services.
*   **Tasks:** (Connects backend services to the redesigned UI widgets)

### Dashboard Metrics Integration
- [ ] Create `MetricsService` (if not already done) to fetch aggregated dashboard stats
- [ ] Implement `StatCard` widgets displaying live Portfolio Value, PnL, Win Rate, Risk Exposure using `MetricsService`
- [ ] Create `PortfolioChart` widget displaying live portfolio history using `MetricsService`
- [ ] Add real-time updates to metric widgets via WebSocket or polling

### Asset Data Integration
- [ ] Create `AssetList` widget displaying aggregated balances from `AssetService`
- [ ] Create `ExchangeBalance` widgets displaying balances per exchange from `AssetService`
- [ ] Add real-time updates to asset widgets

### Trading Activity Integration
- [ ] Create `RecentTrades` widget displaying live trades from `MetricsService` or a dedicated `TradeService`
- [ ] Create `OpenOrders` widget displaying live orders from `ExchangeConnector`s
- [ ] Create `Positions` widget displaying live positions from `ExchangeConnector`s
- [ ] Add real-time updates for trading activity

### Agent Status Integration
- [ ] Create `AgentStatus` widget displaying live status of ElizaOS and standard agents from `AgentService`
- [ ] Add real-time agent status updates

## Phase 7: Websocket Infrastructure & Real-time Updates (Weeks 7-9)

*   **Goal:** Ensure a robust real-time communication layer.
*   **Tasks:** (Same as the previous plan - focuses on the underlying WebSocket service and provider)

### Websocket Service
- [ ] Create `WebsocketService` for managing the WebSocket connection
- [ ] Implement connection management and authentication
- [ ] Add automatic reconnection with exponential backoff
- [ ] Create channel subscription management (`subscribe`, `unsubscribe`)
- [ ] Implement message handling and routing
- [ ] Add error handling and logging
- [ ] Create connection status monitoring

### Socket Provider
- [ ] Create `SocketProvider` context for React components
- [ ] Implement `isConnected` state management
- [ ] Add `subscribe` method hook for component subscriptions
- [ ] Create `send` method hook for outgoing messages
- [ ] Implement message buffering during disconnects (optional)
- [ ] Create `useSocket` hook for easy access

## Phase 8: Market Data Integration (Weeks 8-10)

*   **Goal:** Integrate live market prices, order books, and charts.
*   **Tasks:** (Backend logic same, UI components are widgets in the new layout)

### Market Data Service
- [ ] Create `MarketDataService` for price and orderbook data
- [ ] Implement REST API methods for initial data fetching
- [ ] Add WebSocket subscriptions for real-time market data updates
- [ ] Create methods for historical data retrieval (candlesticks)
- [ ] Implement order book depth management
- [ ] Add aggregated market statistics (e.g., top movers)

### Market Data Widgets
- [ ] Create `PriceTicker` widgets (perhaps in a header or sidebar) using `MarketDataService`
- [ ] Create `OrderBook` widget using `MarketDataService`
- [ ] Create `CandlestickChart` widget using `MarketDataService`
- [ ] Implement Market Depth visualization widget
- [ ] Add price alert functionality integrated with the `NotificationService`

## Phase 9: Final ElizaOS Integration & Language Support (Weeks 9-11)

*   **Goal:** Fully enable advanced ElizaOS capabilities within the central terminal.
*   **Tasks:** (Focuses on leveraging the backend services built earlier within the terminal)

### ElizaOS Language Models Service
- [ ] Create `LanguageModelsService` for interacting with LLMs via ElizaOS API
- [ ] Implement model selection and configuration
- [ ] Integrate streaming completion into the central `CommandConsole`
- [ ] Implement context management (passing relevant portfolio/market data to LLM)
- [ ] Implement function calling for executing actions based on LLM responses
- [ ] Add conversation history management within the terminal session

### ElizaOS Command Processor
- [ ] Create `CommandProcessor` to handle complex commands
- [ ] Implement natural language parsing for trading commands (e.g., "buy 0.1 BTC at market")
- [ ] Integrate `CommandProcessor` with `ExchangeConnector`s to execute trades
- [ ] Add context-aware responses using data from `AssetService`, `MarketDataService`, etc.
- [ ] Implement specialized commands for portfolio analysis, risk assessment, etc.
- [ ] Ensure seamless interaction between user input, LLM processing, and backend actions

## Phase 10: Testing & Deployment (Ongoing)

*   **Goal:** Ensure quality, reliability, and smooth rollout.
*   **Tasks:** (Same core tasks as the previous plan, applied to the new layout and integrations)

### Testing Strategy
- [ ] Implement unit tests for all services and UI widgets
- [ ] Create integration tests for service interactions (API, DB, WebSockets)
- [ ] Add end-to-end tests focusing on the ElizaOS-centric workflow
- [ ] Implement performance testing, especially for the real-time terminal and widgets
- [ ] Create automated test suites for CI/CD pipeline
- [ ] Add visual regression testing for the new layout

### Deployment Strategy
- [ ] Set up development environment with local/mocked services
- [ ] Create staging environment mirroring production infrastructure with test data
- [ ] Implement production environment with robust security and scaling
- [ ] Add monitoring and alerting specific to the new layout and live data feeds
- [ ] Create automated deployment pipeline (CI/CD)
- [ ] Implement database migration automation
- [ ] Add feature flags for gradual rollout of live features

## Phase 11: Monitoring & Maintenance (Ongoing)

*   **Goal:** Maintain stability and performance post-launch.
*   **Tasks:** (Same core tasks as the previous plan)

### Monitoring
- [ ] Set up real-time monitoring for WebSocket connections and message rates
- [ ] Implement API response time tracking for all backend services
- [ ] Add database query performance monitoring (Supabase observability)
- [ ] Track frontend performance metrics (widget load times, interaction latency)
- [ ] Implement comprehensive error tracking (Sentry, etc.)
- [ ] Create automated health checks for all critical components

### Performance Optimization
- [ ] Regularly review and optimize database queries
- [ ] Add caching strategies (Redis, in-memory) for frequently accessed data
- [ ] Optimize WebSocket message formats and frequency
- [ ] Analyze and reduce frontend bundle size
- [ ] Implement lazy loading for widgets outside the initial view
- [ ] Optimize React component rendering performance

---

## Resource Requirements

*   (Same as the previous plan: Frontend Devs, Backend Dev, DevOps, Supabase, Redis, ElizaOS API, Exchange APIs, Market Data APIs, LLM APIs)
