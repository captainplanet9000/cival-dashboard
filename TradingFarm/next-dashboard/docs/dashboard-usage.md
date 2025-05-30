# Trading Farm Unified Dashboard Usage Guide

## Overview
The Trading Farm Dashboard provides a unified, modular interface for managing all aspects of your AI-powered trading farm, including:
- Wallet integration (MetaMask, multi-chain)
- Farm configuration and funding
- Strategy management
- Goal-based trading
- Agent management
- ElizaOS AI command interface
- Real-time analytics and risk monitoring

---

## 1. Navigation Structure
- **Top bar:** Theme toggle, user account menu, notifications
- **Sidebar:** Quick access to dashboard sections (Overview, Trading, Risk, ElizaOS, etc.)
- **Tabs:** Switch between core dashboard panels

---

## 2. Dashboard Sections
### Overview
- Wallet status, performance, analytics, farm status
- Real-time updates on balances and system health

### Trading
- Strategy table, creation/import, edit/pause/resume
- Agent roster and configuration
- Farm management (fund allocation, assignment)
- Goal-based trading interface (goal creation, status)
- Active trades and trade history

### Risk
- Risk metrics cards (exposure, correlation, volatility, etc.)
- Risk alerts and system warnings

### ElizaOS
- Natural language command console for AI-powered actions
- Knowledge base and AI action history

---

## 3. Customization
- Drag and drop widgets to customize your dashboard layout
- Save/load layouts for different workflows
- Add/remove widgets as needed

---

## 4. Real-Time Updates
- Most analytics and status cards update in real time via WebSocket or polling
- Manual refresh available for all widgets

---

## 5. Mobile & Theme Support
- Fully responsive: works on desktop, tablet, and mobile
- Light and dark themes supported

---

## 6. Troubleshooting
- If data does not update, check your WebSocket connection and refresh the page
- For wallet issues, ensure MetaMask is connected and on the correct network
- For AI/ElizaOS issues, check API key configuration in `.env.local`

---

## 7. Extending the Dashboard
- New widgets can be added by extending the `WidgetType` and `WidgetContainer`
- Refer to the code in `src/components/dashboard/`

---

For further help, see the main README or contact the project maintainer.
