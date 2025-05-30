# Multi-Agent Trading Systems Guide

This guide provides detailed instructions for setting up and managing multi-agent trading systems within the ElizaOS Trading Agent framework.

## Introduction to Multi-Agent Trading

Multi-agent trading is an advanced approach that leverages multiple specialized AI agents working together to achieve superior trading outcomes. Rather than relying on a single agent to handle all aspects of trading, multi-agent systems distribute responsibilities among specialized agents that excel at specific tasks.

## Benefits of Multi-Agent Systems

- **Specialization**: Each agent can focus on what it does best
- **Parallel Processing**: Analyze different markets or timeframes simultaneously
- **Diverse Perspectives**: Approach markets from different angles
- **Resilience**: Continue functioning even if one agent encounters issues
- **Scalability**: Add new capabilities by creating specialized agents

## Types of Trading Agents

### Research Agents

Research agents focus on market analysis and signal generation:

- Analyze price data, order book dynamics, and market sentiment
- Identify potential trading opportunities
- Generate trade signals with conviction levels
- Provide rationale for recommendations

**Example Configuration**:
```json
{
  "agent_type": "research_agent",
  "name": "TrendAnalyzer",
  "capabilities": ["technical_analysis", "sentiment_analysis"],
  "models": ["gpt-4o", "claude-3-opus"],
  "data_sources": ["price_data", "news", "social_media"],
  "timeframes": ["1h", "4h", "1d"],
  "trading_pairs": ["BTC/USDT", "ETH/USDT"]
}
```

### Trading Agents

Trading agents execute trades based on signals:

- Implement specific trading strategies
- Manage entry, exit, and position sizing
- Execute orders with appropriate timing
- Adapt to changing market conditions

**Example Configuration**:
```json
{
  "agent_type": "trading_agent",
  "name": "MomentumTrader",
  "capabilities": ["order_execution", "position_management"],
  "strategy_id": "momentum_strategy",
  "risk_parameters": {
    "max_position_size": 0.1,
    "max_drawdown": 0.05,
    "take_profit": 0.03,
    "stop_loss": 0.02
  },
  "exchange_connection_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12"
}
```

### Risk Management Agents

Risk management agents monitor portfolio risk:

- Monitor exposure and correlation
- Adjust position sizes based on volatility
- Implement circuit breakers during extreme conditions
- Provide portfolio rebalancing recommendations

**Example Configuration**:
```json
{
  "agent_type": "risk_management_agent",
  "name": "RiskGuardian",
  "capabilities": ["risk_assessment", "drawdown_protection"],
  "parameters": {
    "max_portfolio_risk": 0.15,
    "volatility_adjustment": true,
    "correlation_threshold": 0.7,
    "max_exposure_per_asset": 0.2
  }
}
```

### Coordinator Agents

Coordinator agents orchestrate the activities of other agents:

- Assign tasks to specialized agents
- Aggregate and prioritize signals
- Resolve conflicts between recommendations
- Adjust strategy based on performance

**Example Configuration**:
```json
{
  "agent_type": "coordinator_agent",
  "name": "TradingDirector",
  "capabilities": ["task_assignment", "conflict_resolution"],
  "managed_agents": [
    "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12", // Research agent
    "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23", // Trading agent
    "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34"  // Risk agent
  ],
  "coordination_parameters": {
    "signal_threshold": 0.7,
    "consensus_required": false,
    "risk_override_enabled": true
  }
}
```

## Setting Up Your First Multi-Agent System

### Step 1: Plan Your Agent Architecture

Before creating agents, plan your architecture:

1. Determine the trading strategy you want to implement
2. Identify specialized agents needed
3. Decide how agents will communicate and coordinate
4. Select appropriate models for each agent

An effective starter architecture includes:
- 1-2 Research Agents (technical analysis, sentiment analysis)
- 1 Trading Agent (executing the strategy)
- 1 Risk Management Agent (optional but recommended)
- 1 Coordinator Agent (managing the workflow)

### Step 2: Create the Individual Agents

Create each specialized agent following the [Creating Your First Trading Agent](./first-agent.md) guide, with these specific considerations:

#### For Research Agents:
1. Navigate to Dashboard > Agents > Create Agent
2. Select "Research Agent" as the agent type
3. Configure data sources and analysis capabilities
4. Set up signal generation parameters

#### For Trading Agents:
1. Follow the standard trading agent setup
2. In the "Agent Coordination" section, enable "Accept External Signals"
3. Configure how the agent processes incoming signals

#### For Risk Management Agents:
1. Select "Risk Management Agent" type
2. Configure risk thresholds and circuit breakers
3. Enable override capabilities for emergency situations

### Step 3: Create the Coordinator Agent

1. Navigate to Dashboard > Agents > Create Agent
2. Select "Coordinator Agent" as the agent type
3. Link to your previously created agents
4. Configure coordination parameters and decision rules

### Step 4: Configure Agent Coordination

Once all agents are created, set up the coordination workflows:

1. Navigate to Dashboard > Agents > [Coordinator Agent] > Coordination
2. Click "Create Workflow"
3. Define the coordination flow:

**Example: Research-to-Trading Workflow**

```json
{
  "workflow_name": "Research-Driven Trading",
  "trigger": {
    "agent_id": "<research_agent_id>",
    "event": "signal_generated",
    "conditions": [
      {"field": "confidence", "operator": ">=", "value": 0.7}
    ]
  },
  "actions": [
    {
      "action_type": "send_signal",
      "target_agent_id": "<trading_agent_id>",
      "data_mapping": {
        "signal_type": "signal_type",
        "direction": "direction",
        "symbol": "trading_pair",
        "timeframe": "timeframe",
        "entry_price": "suggested_entry"
      }
    }
  ],
  "feedback": {
    "target_agent_id": "<research_agent_id>",
    "events": ["order_executed", "order_failed"]
  }
}
```

### Step 5: Test the Multi-Agent System

Before deploying to live trading:

1. Initialize all agents in paper trading mode
2. Monitor the communication between agents
3. Verify signal generation, transmission, and execution
4. Check that risk parameters are properly enforced
5. Test override mechanisms

## Common Multi-Agent Patterns

### Research-Driven Trading

![Research-Driven Trading](../assets/research-driven-trading.png)

This pattern focuses on high-quality signal generation:

1. Research agents analyze markets and generate signals
2. Coordinator filters and prioritizes signals
3. Trading agent executes based on vetted signals
4. Risk agent monitors overall exposure

**Best used for**: Complex market analysis requiring deep research

### Market Regime Adaptation

This pattern dynamically switches strategies based on market conditions:

1. Regime detection agent identifies current market type
2. Coordinator activates appropriate specialist agents
3. Active agents operate during their optimal conditions
4. Performance feedback updates regime detection

**Best used for**: Trading across different market conditions

### Hierarchical Decision Making

This pattern uses multiple levels of decision making:

1. Strategic layer determines asset allocation
2. Tactical layer identifies specific opportunities
3. Execution layer optimizes trade timing
4. Risk layer monitors and constrains all activities

**Best used for**: Portfolio management across multiple markets

## Advanced Multi-Agent Features

### Agent Communication Protocols

Configure how agents communicate:

1. Navigate to Dashboard > Settings > Agent Communication
2. Set message formatting and validation rules
3. Configure throttling and priority settings
4. Set up encryption for sensitive communications

### Conflict Resolution

Handle conflicts between agent recommendations:

1. Navigate to Dashboard > Agents > [Coordinator Agent] > Settings
2. Configure conflict resolution strategies:
   - Priority-based (certain agents take precedence)
   - Consensus-based (majority rules)
   - Confidence-weighted (higher confidence wins)
   - Risk-adjusted (safer options preferred)

### Performance-Based Resource Allocation

Implement a performance-based capital allocation system:

1. Navigate to Dashboard > Settings > Resource Allocation
2. Enable "Performance-Based Allocation"
3. Configure evaluation metrics and rebalancing frequency
4. Set minimum and maximum allocation limits

## Monitoring Multi-Agent Systems

### Agent Communication Dashboard

Monitor inter-agent communications:

1. Navigate to Dashboard > Monitoring > Agent Communications
2. View message flow between agents
3. Filter by message type, agent, or time period
4. Identify communication bottlenecks or failures

### Coordination Analytics

Analyze coordination effectiveness:

1. Navigate to Dashboard > Analytics > Coordination
2. View key metrics:
   - Signal utilization rate
   - Decision time
   - Override frequency
   - Conflict resolution outcomes

### Agent Performance Comparison

Compare the performance of different agents:

1. Navigate to Dashboard > Analytics > Agent Comparison
2. Select agents to compare
3. Choose performance metrics
4. Analyze relative strengths and weaknesses

## Troubleshooting Multi-Agent Systems

### Common Issues and Solutions

#### Signal Not Being Processed
- Verify the signal meets the configured threshold
- Check that the target agent is active
- Confirm the coordination workflow is enabled
- Inspect the signal format for errors

#### Agents Working Against Each Other
- Review coordination rules
- Check for conflicting objectives
- Implement stronger prioritization
- Consider adding a voting mechanism

#### Poor Overall Performance
- Analyze individual agent performance
- Check coordination metrics
- Review decision latency
- Verify market data consistency across agents

## Example: Multi-Agent Crypto Trading System

Here's a complete example of a multi-agent system for cryptocurrency trading:

### Technical Analysis Agent
```json
{
  "agent_type": "research_agent",
  "name": "TechnicalAnalyst",
  "capabilities": ["technical_analysis", "pattern_recognition"],
  "models": ["gpt-4o"],
  "data_sources": ["price_data", "volume_data", "order_book"],
  "timeframes": ["1h", "4h"],
  "trading_pairs": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  "analysis_parameters": {
    "indicators": ["moving_averages", "rsi", "macd", "bollinger_bands"],
    "patterns": ["support_resistance", "chart_patterns"],
    "signal_threshold": 0.7
  }
}
```

### Sentiment Analysis Agent
```json
{
  "agent_type": "research_agent",
  "name": "SentimentAnalyst",
  "capabilities": ["sentiment_analysis", "news_processing"],
  "models": ["claude-3-opus"],
  "data_sources": ["news", "social_media", "on-chain_data"],
  "timeframes": ["4h", "1d"],
  "trading_pairs": ["BTC/USDT", "ETH/USDT"],
  "analysis_parameters": {
    "sentiment_sources": ["twitter", "reddit", "crypto_news"],
    "sentiment_threshold": 0.6,
    "significant_event_detection": true
  }
}
```

### Trading Execution Agent
```json
{
  "agent_type": "trading_agent",
  "name": "CryptoTrader",
  "capabilities": ["order_execution", "position_management"],
  "models": ["gpt-4o"],
  "strategy_id": "multi_factor_strategy",
  "trading_pairs": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  "risk_parameters": {
    "position_size_percent": 2,
    "stop_loss_percent": 3,
    "take_profit_percent": 6,
    "max_drawdown_percent": 15
  },
  "execution_parameters": {
    "entry_triggers": ["technical_signal", "sentiment_confirmation"],
    "exit_triggers": ["technical_signal", "stop_loss", "take_profit"],
    "order_types": ["limit", "market", "stop_limit"]
  }
}
```

### Risk Management Agent
```json
{
  "agent_type": "risk_management_agent",
  "name": "RiskController",
  "capabilities": ["risk_assessment", "exposure_management"],
  "models": ["claude-3-sonnet"],
  "risk_parameters": {
    "max_total_exposure": 25,
    "max_per_asset_exposure": 10,
    "volatility_adjustment": true,
    "correlation_limits": true,
    "drawdown_circuit_breaker": 20
  },
  "monitoring_parameters": {
    "check_frequency_minutes": 15,
    "alert_thresholds": {
      "exposure": 20,
      "drawdown": 15,
      "volatility": 2.5
    }
  }
}
```

### Coordinator Agent
```json
{
  "agent_type": "coordinator_agent",
  "name": "TradingDirector",
  "capabilities": ["coordination", "task_assignment", "conflict_resolution"],
  "models": ["gpt-4o"],
  "managed_agents": [
    "<technical_analysis_agent_id>",
    "<sentiment_analysis_agent_id>",
    "<trading_execution_agent_id>",
    "<risk_management_agent_id>"
  ],
  "coordination_parameters": {
    "signal_threshold": 0.7,
    "consensus_required": true,
    "risk_override_enabled": true,
    "decision_rules": {
      "entry": "technical AND (sentiment OR momentum)",
      "sizing": "base_size * volatility_adjustment * sentiment_multiplier",
      "exit": "technical OR risk_trigger OR take_profit"
    }
  }
}
```

## Next Steps

After setting up your multi-agent trading system:

1. [Paper Trading](./paper-trading.md) to validate the system
2. [Monitoring & Alerts](./monitoring.md) for tracking performance
3. [Strategy Optimization](./strategy-optimization.md) for improving agent parameters
