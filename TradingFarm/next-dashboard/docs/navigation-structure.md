# Trading Farm Dashboard Navigation Structure

This document outlines the navigation structure for the Trading Farm Dashboard, providing a reference for developers and stakeholders.

## Navigation Categories

The dashboard navigation is organized into several logical categories to improve usability and workflow:

### Main
- **Dashboard** - Home screen with overview and key metrics

### Core Trading
- **Farms** - Farm management and creation
- **Agents** - Trading agents configuration and monitoring
- **Goals** - Goal tracking and performance monitoring
- **Strategies** - Trading strategy creation and management

### Execution
- **Positions** - Current open positions across all exchanges
- **Order History** - Complete log of executed orders
- **Activity Logs** - System and trading activity events

### Analytics
- **Performance** - Trading performance metrics and ROI analysis
- **Risk Analysis** - Risk assessment and exposure monitoring
- **Market Insights** - Market trends and correlation analysis

### Funding
- **Accounts & Balances** - Exchange accounts and consolidated balances
- **Vault** - Secure asset storage and tracking
- **Transactions** - Deposit, withdrawal, and transfer records

### AI Center
- **Command & Control** - Natural language AI assistant for trading operations
- **Knowledge Base** - AI-powered insights and market intelligence
- **ElizaOS** - AI operating system for strategy development
- **AI Advisor** - Personalized trading recommendations

### Settings
- **Settings** - User preferences and system configuration
- **Connections** - Exchange API connections and third-party integrations

## Route Structure

All routes follow the pattern `/dashboard/[category]/[subcategory]` with the following structure:

```
/dashboard
├── /farms
├── /agents
├── /goals
├── /strategies
├── /execution
│   ├── /positions
│   ├── /orders
│   └── /logs
├── /analytics
│   ├── /performance
│   ├── /risk
│   └── /market
├── /funding
│   ├── /accounts
│   ├── /vault
│   └── /transactions
├── /ai-center
│   ├── /command
│   ├── /knowledge
│   ├── /eliza
│   └── /advisor
└── /settings
    └── /connections
```

## Navigation Implementation

The sidebar navigation is implemented in `src/components/dashboard/sidebar.tsx` with the following features:

- Grouped routes by category
- Visual separation between categories
- Active state highlighting
- Consistent icon usage

## Future Considerations

- Additional sub-navigation may be added as features expand
- Mobile navigation optimization
- User-customizable navigation preferences
