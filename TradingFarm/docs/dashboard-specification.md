# Trading Farm Dashboard Specification

## Overview

This document specifies the requirements for creating an intuitive, functional dashboard for the Trading Farm system. The dashboard will integrate with the Supabase backend, display real-time data, and provide an interface for managing farms, agents, strategies, and trades.

## Design Principles

- **Intuitive Navigation**: Clear hierarchy and consistent navigation patterns
- **Responsive Design**: Fully functional across all device sizes
- **Real-time Updates**: Display live data changes without page refreshes
- **Contextual Actions**: Present relevant actions based on current context
- **Visual Clarity**: Use data visualization to communicate complex information
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design

## Dashboard Structure

### Layout

- **App Shell**
  - Persistent sidebar navigation
  - Top header with global actions and notifications
  - Main content area with contextual breadcrumbs
  - Dark/light theme toggle
  - Status indicators for system health and connections
  
- **Responsive Behavior**
  - Collapsible sidebar on smaller screens
  - Stacked layouts for mobile viewing
  - Optimized data tables with horizontal scrolling on mobile

### Core Pages

1. **Dashboard Home**
   - System health overview
   - Key performance metrics
   - Recent trading activity
   - Active farms summary
   - Quick action buttons for common tasks
   - Notifications and alerts panel

2. **Farms Management**
   - Farms listing with status indicators
   - Farm creation/edit interface
   - Farm details view with tabs for:
     - Overview (performance metrics)
     - Agents
     - Strategies
     - Wallets
     - Orders/Trades
     - Settings

3. **Agent Management**
   - Agent listing with farm association
   - Agent creation/configuration interface
   - Agent details with:
     - Performance metrics
     - Active strategies
     - Trade history
     - Memory visualization
     - Settings and controls

4. **Market Data**
   - Real-time price charts
   - Market correlation visualization
   - Order book displays
   - Technical indicators
   - Pattern recognition insights
   - Market news integration

5. **Strategy Builder**
   - Strategy templates
   - Parameter configuration
   - Backtesting interface
   - Strategy assignment to farms/agents
   - Performance comparison
   - Optimization suggestions

6. **Order Management**
   - Active orders monitoring
   - Order creation interface
   - Trade history with filtering
   - Performance analytics
   - Fee analysis
   - Execution quality metrics

7. **ElizaOS Interface**
   - Natural language command console
   - Suggested commands
   - Response visualization
   - Command history
   - Context-aware help
   - Voice interaction (optional)

8. **Memory Systems**
   - Agent memory browsing
   - Knowledge graph visualization
   - Market relationship explorer
   - Memory search and filtering
   - Memory consolidation interface

## Component Specifications

### Farms Dashboard Components

#### Farm Card
- Visual status indicator (active/paused/error)
- Key metrics (total value, yield, trend)
- Progress towards goals
- Quick action buttons (view/edit/pause)
- Asset allocation visualization
- Agent count indicator
- Performance sparkline

#### Farm Creation Form
- Step-by-step wizard interface
- Field validation with helpful errors
- Template selection
- Risk profile configuration
- Strategy allocation interface
- Asset selection with search
- Wallet creation/assignment

#### Farm Detail View
- Header with farm name, status, and actions
- Performance metrics cards with comparison to benchmarks
- Time-range selector for historical data
- Asset allocation donut chart
- Strategy allocation visualization
- Agent performance comparison
- Recent activity timeline
- Related ElizaOS insights

### Agent Management Components

#### Agent List
- Sortable, filterable table
- Status indicators with color coding
- Farm association display
- Performance highlights
- Quick actions (start/pause/edit)
- Type indicators with icons
- Last activity timestamp

#### Agent Configuration
- Agent type selector with descriptions
- Parameter configuration interface
- Strategy assignment
- Risk parameter controls
- Market selection with filtering
- Timeframe configuration
- Performance targets
- Notification settings

#### Agent Detail Dashboard
- Real-time status and metrics
- Current positions and orders
- Performance visualization
- Strategy parameter display
- Memory insight cards
- Action buttons for common operations
- Log viewer with filtering

### Trading Interface Components

#### Order Form
- Market selector with search
- Order type selector with explanations
- Price and quantity inputs
- Risk preview (potential loss/gain)
- Fee calculation
- Confirmation dialog with summary
- Advanced options panel (expandable)

#### Order Book Visualization
- Real-time order book display
- Price level visualization
- Own orders highlighting
- Depth chart integration
- Click-to-act functionality
- Market sentiment indicators

#### Trade History
- Filterable, sortable table
- Performance metrics
- Visual indicators for profitability
- Expandable rows for details
- Export functionality
- Timeline visualization option
- Trade clustering by strategy

### Strategy Components

#### Strategy Builder Interface
- Visual strategy composer
- Parameter input with validation
- Historical performance chart
- Risk metrics calculation
- Market selection
- Timeframe controls
- Optimization suggestions
- Template saving

#### Strategy Backtest Results
- Performance metrics cards
- Equity curve chart
- Drawdown visualization
- Trade distribution chart
- Risk-adjusted return metrics
- Comparison to benchmarks
- Monte Carlo simulation results
- Optimization recommendations

### Memory System Components

#### Agent Memory Explorer
- Chronological memory timeline
- Importance filtering
- Content search
- Memory type filtering
- Relationship visualization
- Memory consolidation interface
- Impact scoring

#### Knowledge Graph Visualization
- Interactive graph display
- Node filtering by type
- Relationship highlighting
- Path exploration
- Pattern identification
- Search functionality
- Export options

### ElizaOS Integration

#### Command Console
- Natural language input field
- Command history access
- Context-aware suggestions
- Response visualization area
- Error handling with suggestions
- Voice input toggle (optional)
- Help button with examples

#### Response Visualization
- Rich text formatting
- Data table display
- Chart generation
- Action button generation
- Code snippets (when applicable)
- Follow-up suggestion chips
- Copy/export functionality

## Technical Implementation

### Data Integration

- **Supabase Realtime**
  - Subscribe to table changes for real-time updates
  - Implement optimistic UI updates
  - Handle synchronization conflicts
  - Implement reconnection logic

- **Data Loading Patterns**
  - Implement skeleton loaders for all components
  - Use virtualization for long lists
  - Implement pagination for large datasets
  - Cache frequently accessed data
  - Prefetch likely-to-be-needed data

- **State Management**
  - Centralize application state
  - Implement entity caching
  - Normalize relationship data
  - Handle optimistic updates
  - Sync with local storage for persistence

### User Experience Details

- **Loading States**
  - Skeleton loaders for initial data fetching
  - Progress indicators for actions
  - Optimistic UI updates where appropriate
  - Clear failure states with recovery options

- **Error Handling**
  - Contextual error messages
  - Suggested actions for recovery
  - Automatic retry for transient failures
  - Detailed logging for support
  - Offline mode capabilities

- **Animations**
  - Subtle transitions between states
  - Data change highlighting
  - Attention-focusing animations for critical elements
  - Performance-optimized animations
  - Disable option for reduced motion preference

- **Notifications**
  - Toast notifications for background actions
  - Alert dialogs for blocking issues
  - Status indicators for ongoing processes
  - Badge indicators for new information
  - Notification center for history

## Specific UI Requirements

### Farm Dashboard Home

```
┌─────────────────────────────────────────────────────┐
│ [Farm Name]       [Status: ACTIVE]     [Actions ▼] │
├─────────────────┬─────────────────┬─────────────────┤
│ TOTAL VALUE     │ 24H CHANGE      │ STRATEGIES      │
│ $123,456.78     │ +2.34% ▲        │ 5 Active        │
├─────────────────┼─────────────────┼─────────────────┤
│ ACTIVE AGENTS   │ TOTAL TRADES    │ WIN RATE        │
│ 8 / 12          │ 234 (24h)       │ 67.5%           │
├─────────────────┴─────────────────┴─────────────────┤
│ ┌───────────────────────────────────────────────┐   │
│ │ ASSET ALLOCATION                           [▼]│   │
│ │ [Donut Chart with Asset Distribution]         │   │
│ └───────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────┐   │
│ │ PERFORMANCE HISTORY                        [▼]│   │
│ │ [Line Chart with Performance Over Time]       │   │
│ └───────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────┐   │
│ │ RECENT ACTIVITY                            [▼]│   │
│ │ - Trade: BTC/USD Buy @ $60,120.00             │   │
│ │ - Agent: TrendFollower001 activated           │   │
│ │ - Strategy: Updated DCA parameters            │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Agent Management Interface

```
┌─────────────────────────────────────────────────────┐
│ AGENTS                                   [+ CREATE] │
├─────────────┬───────────┬─────────┬────────┬────────┤
│ NAME        │ FARM      │ STATUS  │ PROFIT │ ACTIONS│
├─────────────┼───────────┼─────────┼────────┼────────┤
│ MomentumBot │ BTC Farm  │ ● ACTIVE│ +5.2%  │ ⋮      │
├─────────────┼───────────┼─────────┼────────┼────────┤
│ Arbitrageur │ ETH Farm  │ ● ACTIVE│ +1.8%  │ ⋮      │
├─────────────┼───────────┼─────────┼────────┼────────┤
│ Scalper     │ DeFi Farm │ ○ PAUSED│ -0.3%  │ ⋮      │
├─────────────┼───────────┼─────────┼────────┼────────┤
│ VolatilityT │ BTC Farm  │ ✕ ERROR │ 0.0%   │ ⋮      │
└─────────────┴───────────┴─────────┴────────┴────────┘
```

### ElizaOS Command Interface

```
┌─────────────────────────────────────────────────────┐
│ ELIZAOS COMMAND CONSOLE                             │
├─────────────────────────────────────────────────────┤
│ > Create a new farm for Bitcoin trading             │
│                                                     │
│ I'll help you create a new Bitcoin trading farm.    │
│ Please provide the following information:           │
│                                                     │
│ Farm Name: [____________]                           │
│ Risk Profile: ○ Conservative  ● Moderate  ○ Aggr.   │
│ Initial Capital: [$_________]                       │
│ Strategy Templates: [✓] Trend [ ] RSI [ ] DCA       │
│                                                     │
│ [CREATE FARM] [CANCEL]                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [Type a command...]               [🎤] [?] [SEND]   │
└─────────────────────────────────────────────────────┘
```

### Knowledge Graph Visualization

```
┌─────────────────────────────────────────────────────┐
│ MARKET KNOWLEDGE GRAPH                     [FILTER] │
├─────────────────────────────────────────────────────┤
│                                                     │
│      ○ SPY                     ○ Gold               │
│      ┃\                       /┃                    │
│      ┃ \                     / ┃                    │
│      ┃  \                   /  ┃                    │
│      ┃   \                 /   ┃                    │
│      ┃    ▼               ▼    ┃                    │
│      ┃    ○─────────────○     ┃                    │
│      ┃   Bitcoin      ETH     ┃                    │
│      ┃    ○─────────────○     ┃                    │
│      ┃    │               │    ┃                    │
│      ┃    │               │    ┃                    │
│      ┃    ▼               ▼    ┃                    │
│      ○ DeFi Index        ○ BNB                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│ SELECTED: Bitcoin                                   │
│ - Strong correlation with ETH (0.89)                │
│ - Inverse correlation with Gold (-0.42)             │
│ - Leading indicator for DeFi Index                  │
└─────────────────────────────────────────────────────┘
```

## Technical Requirements

- **Frontend Stack**
  - Next.js framework
  - TypeScript with strong typing
  - Tailwind CSS for styling
  - shadcn/ui component library
  - Recharts for data visualization
  - React Query for data fetching
  - Supabase Realtime for live updates

- **Performance Targets**
  - Initial load time under 2 seconds
  - Time to interactive under 3 seconds
  - Smooth 60fps animations
  - Real-time updates with under 500ms latency
  - Responsive to window size changes without layout breaks

- **Browser Support**
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)
  - Mobile browsers (iOS Safari, Android Chrome)

## Implementation Priority

1. Core dashboard structure and navigation
2. Farms listing and detail view
3. Agent management interface
4. Trading interface and order management
5. Real-time data integration
6. Strategy management
7. ElizaOS command interface
8. Knowledge graph visualization

## Success Criteria

- Users can create and manage farms without training
- Real-time updates are visible across all components
- Dashboard remains responsive under heavy data load
- Users can navigate efficiently between related entities
- Complex data is presented in a visually intuitive way
- ElizaOS commands are discoverable and useful
- Users can understand agent performance at a glance
- Dashboard provides actionable insights from memory systems 