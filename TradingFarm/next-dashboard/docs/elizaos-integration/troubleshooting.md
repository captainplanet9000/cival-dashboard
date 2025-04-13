# ElizaOS Trading Agent System - Troubleshooting Guide

This comprehensive troubleshooting guide will help you diagnose and resolve common issues with the ElizaOS Trading Agent System. Whether you're experiencing problems with agent initialization, exchange connectivity, or performance optimization, this guide provides step-by-step solutions.

## Table of Contents

- [Agent Initialization Issues](#agent-initialization-issues)
- [Exchange Connection Problems](#exchange-connection-problems)
- [Strategy Execution Issues](#strategy-execution-issues)
- [Performance and Optimization Issues](#performance-and-optimization-issues)
- [Multi-Agent Coordination Problems](#multi-agent-coordination-problems)
- [Data and Market Feed Issues](#data-and-market-feed-issues)
- [System Resource and Performance Issues](#system-resource-and-performance-issues)
- [Database and Storage Problems](#database-and-storage-problems)
- [UI and Dashboard Issues](#ui-and-dashboard-issues)
- [Security and Authentication Issues](#security-and-authentication-issues)
- [Common Error Codes](#common-error-codes)

## Agent Initialization Issues

### Agent Creation Fails

**Symptoms:**
- Error message during agent creation
- Agent appears in list but status shows "Error"

**Possible Causes:**
- Invalid configuration parameters
- Database connectivity issues
- Insufficient permissions

**Solutions:**
1. Check the error logs: Dashboard > System > Logs
2. Verify all required fields are completed correctly
3. Ensure strategy parameters are within valid ranges
4. Check database connectivity in System Health dashboard
5. Verify user permissions for agent creation

### Agent Fails to Start

**Symptoms:**
- Agent status remains "Initializing" for extended period
- Error message when clicking "Start Agent"

**Possible Causes:**
- Model loading issues
- Memory allocation problems
- Configuration validation failures

**Solutions:**
1. Check agent logs: Dashboard > Agents > [Agent Name] > Logs
2. Verify selected AI models are available
3. Check system resources and memory availability
4. Try restarting the agent with reduced capabilities
5. Verify ElizaOS API key is valid and has sufficient quota

**Example Error:**
```
Error: Failed to initialize agent 'BTC Momentum Trader'
Cause: Unable to load GPT-4o model - API key has insufficient quota
```

**Resolution:**
```
1. Navigate to Dashboard > Settings > Integrations
2. Update ElizaOS API key or select a different model
3. Restart agent initialization
```

### Agent Shows "No Strategy" Error

**Symptoms:**
- Agent creation succeeds but cannot be started
- Error message indicating missing strategy

**Possible Causes:**
- Strategy not properly linked to agent
- Strategy deleted after agent creation
- Invalid strategy parameters

**Solutions:**
1. Navigate to Dashboard > Agents > [Agent Name] > Settings
2. Check strategy selection and linkage
3. If the strategy is missing, select or create a new one
4. Verify strategy parameters are appropriate for agent type

## Exchange Connection Problems

### Failed Exchange Authentication

**Symptoms:**
- "Authentication Failed" error when testing exchange connection
- Agent cannot execute trades with error "Unauthorized"

**Possible Causes:**
- Invalid API key or secret
- Expired credentials
- Insufficient API permissions

**Solutions:**
1. Navigate to Dashboard > Settings > Exchanges
2. Check API key and secret for errors
3. Verify required permissions are enabled on exchange
4. Test connection using the "Test" button
5. For some exchanges, regenerate API keys if necessary

**Verification Steps:**
```
1. Navigate to your exchange account settings
2. Verify API key permissions include:
   - Read account information
   - Read market data
   - Create and manage orders (for trading)
3. Check IP restrictions if configured
4. Verify key has not expired
```

### Rate Limiting Issues

**Symptoms:**
- "Rate limit exceeded" errors
- Intermittent trading failures
- Increasing delays in order execution

**Possible Causes:**
- Too many requests to exchange API
- Multiple agents sharing same API key
- Inefficient polling or repeated requests

**Solutions:**
1. Navigate to Dashboard > Monitoring > Exchange Connections
2. Check rate limit usage metrics
3. Reduce request frequency in agent configuration
4. Implement request batching where possible
5. Consider using multiple API keys if allowed by exchange

**Rate Limit Optimization:**
```
1. Navigate to Dashboard > Settings > Exchanges > [Exchange Name]
2. Adjust "Request Throttling" settings:
   - Increase minimum delay between requests
   - Enable request batching
   - Set appropriate cache duration for market data
```

### Connection Timeout Issues

**Symptoms:**
- "Connection timeout" errors
- Agent unable to retrieve market data
- Orders stuck in "Submitting" state

**Possible Causes:**
- Network connectivity issues
- Exchange API downtime
- Firewall or proxy interference

**Solutions:**
1. Check network connectivity
2. Verify exchange status on their status page
3. Increase timeout settings in exchange configuration
4. Check proxy settings if applicable
5. Test connection from different network if possible

## Strategy Execution Issues

### No Trading Signals Generated

**Symptoms:**
- Agent is running but not generating any signals
- No trades being executed
- "No signals generated" message in logs

**Possible Causes:**
- Strategy parameters too restrictive
- Market conditions not meeting criteria
- Data feed issues
- Strategy logic errors

**Solutions:**
1. Navigate to Dashboard > Agents > [Agent Name] > Strategy
2. Review strategy parameters and adjust thresholds
3. Check market data availability and quality
4. Verify strategy logic and conditions
5. Test with more lenient parameters temporarily

**Parameter Adjustment Example:**
```
If using RSI strategy with 30/70 thresholds:
1. Navigate to Dashboard > Agents > [Agent Name] > Strategy
2. Adjust thresholds to 35/65 temporarily
3. Monitor for signal generation
4. Gradually return to original parameters once signals occur
```

### Strategy Performing Poorly

**Symptoms:**
- Consistent losing trades
- Performance significantly below backtest results
- Unusual trade timing or sizing

**Possible Causes:**
- Market regime change
- Overfitting during optimization
- Slippage and execution issues
- Parameter drift

**Solutions:**
1. Navigate to Dashboard > Agents > [Agent Name] > Performance
2. Compare real performance to backtest expectations
3. Consider re-optimizing with recent market data
4. Check for execution issues or slippage
5. Verify strategy assumptions still valid in current market

**Optimization Steps:**
```
1. Navigate to Dashboard > Agents > [Agent Name] > Optimization
2. Run a new optimization using recent market data
3. Include slippage modeling in optimization
4. Compare new parameters with original
5. Apply changes if significantly different
```

### Unexpected Trading Behavior

**Symptoms:**
- Agent trading at unexpected times
- Unusual position sizing
- Trades opposite to strategy intention

**Possible Causes:**
- Configuration misalignment
- Strategy logic interpretation errors
- Data feed issues
- Time zone or scheduling problems

**Solutions:**
1. Review agent logs for decision rationale
2. Check strategy parameters and logic
3. Verify market data accuracy
4. Check time zone settings and trading schedule
5. Temporarily enable "Explain Decisions" option for detailed logs

## Performance and Optimization Issues

### Optimization Jobs Failing

**Symptoms:**
- Optimization jobs show "Failed" status
- Error message when starting optimization
- Jobs run but produce invalid results

**Possible Causes:**
- Insufficient historical data
- Invalid parameter ranges
- System resource limitations
- Database connectivity issues

**Solutions:**
1. Navigate to Dashboard > Agents > [Agent Name] > Optimization
2. Check error details in the failed job
3. Verify historical data availability for selected period
4. Adjust parameter ranges to be more reasonable
5. Reduce optimization complexity (fewer parameters or iterations)

**Common Optimization Errors:**
| Error | Solution |
|-------|----------|
| "Insufficient data" | Reduce date range or ensure data is available |
| "Invalid parameter range" | Ensure min values are less than max values |
| "Resource limitation" | Reduce population size or max iterations |
| "Database timeout" | Check database connectivity or optimize queries |

### Slow Backtesting Performance

**Symptoms:**
- Backtests taking unusually long time
- System becomes unresponsive during backtesting
- Timeout errors during backtest

**Possible Causes:**
- Excessive date range
- Too many instruments or timeframes
- Complex strategy logic
- System resource limitations

**Solutions:**
1. Reduce backtest date range
2. Limit number of instruments in backtest
3. Simplify strategy or reduce parameter combinations
4. Check system resource usage during backtest
5. Consider running smaller backtests sequentially

**Backtest Optimization:**
```
1. Navigate to Dashboard > Agents > [Agent Name] > Backtesting
2. Adjust "Performance Settings":
   - Enable data caching
   - Reduce candle resolution where appropriate
   - Limit max instruments per backtest
   - Use parallel processing if available
```

## Multi-Agent Coordination Problems

### Agents Not Communicating

**Symptoms:**
- Research signals not reaching trading agents
- "No upstream signals" message in trading agent logs
- Coordinator agent showing "No agent responses"

**Possible Causes:**
- Coordination workflow not properly configured
- Agents not properly linked
- Signal format or threshold issues
- Permission or access control problems

**Solutions:**
1. Navigate to Dashboard > Agents > [Coordinator Agent] > Coordination
2. Verify workflow configuration and linkages
3. Check agent IDs are correctly referenced
4. Verify signal format and thresholds
5. Test with simplified workflow temporarily

**Coordination Troubleshooting Steps:**
```
1. Navigate to Dashboard > Monitoring > Agent Communications
2. Filter logs to show messages between specific agents
3. Check for any errors or rejected messages
4. Verify message format matches expected schema
5. Test with direct message using "Send Test Signal" feature
```

### Conflicting Agent Decisions

**Symptoms:**
- Agents making contradictory recommendations
- Coordinator unable to resolve conflicts
- "Decision conflict" errors in logs

**Possible Causes:**
- Insufficient conflict resolution rules
- Agents using different data or timeframes
- Priority or weighting issues in coordination
- Logic errors in decision aggregation

**Solutions:**
1. Navigate to Dashboard > Agents > [Coordinator Agent] > Settings
2. Review conflict resolution strategy
3. Adjust agent priorities or weights
4. Implement more specific resolution rules
5. Consider using voting mechanism for decisions

**Example Conflict Resolution Configuration:**
```json
{
  "conflict_resolution": {
    "strategy": "weighted_vote",
    "agent_weights": {
      "<technical_agent_id>": 0.6,
      "<sentiment_agent_id>": 0.4
    },
    "minimum_consensus": 0.6,
    "tiebreaker": "most_conservative"
  }
}
```

## Data and Market Feed Issues

### Missing or Delayed Market Data

**Symptoms:**
- Gaps in price charts
- Strategy using stale data
- "Data not available" errors

**Possible Causes:**
- Exchange API issues
- Network connectivity problems
- Rate limiting
- Feed provider outage

**Solutions:**
1. Navigate to Dashboard > Monitoring > Market Data
2. Check data feed status and latency
3. Verify exchange connectivity
4. Consider using alternative data sources temporarily
5. Adjust data polling frequency

**Data Source Verification:**
```
1. Navigate to Dashboard > Settings > Market Data
2. Check status of primary and fallback data sources
3. Test data retrieval for specific symbols
4. Compare timestamps with actual market time
5. Enable redundant data sources if available
```

### Incorrect Price Data

**Symptoms:**
- Unusual price spikes in charts
- Trades executed at unexpected prices
- Strategy making decisions on incorrect data

**Possible Causes:**
- Exchange API returning incorrect data
- Data normalization issues
- Ticker symbol confusion
- Quote currency mismatches

**Solutions:**
1. Verify data with external sources
2. Check for symbol mapping issues
3. Review data normalization process
4. Enable data validation and spike filtering
5. Consider using consolidated data from multiple sources

## System Resource and Performance Issues

### High CPU/Memory Usage

**Symptoms:**
- System becoming slow or unresponsive
- Agent processes terminated unexpectedly
- Error messages about resource limitations

**Possible Causes:**
- Too many concurrent agents
- Inefficient strategy calculations
- Memory leaks in custom code
- Excessive logging or data processing

**Solutions:**
1. Navigate to Dashboard > Monitoring > System Health
2. Identify processes using excessive resources
3. Reduce number of active agents
4. Optimize strategy code for efficiency
5. Adjust logging levels to reduce overhead

**Resource Optimization:**
```
1. Navigate to Dashboard > Settings > System
2. Configure resource limits:
   - Max concurrent agents
   - Memory limits per agent
   - CPU allocation prioritization
   - Background job scheduling
```

### Slow UI Response

**Symptoms:**
- Dashboard pages loading slowly
- Charts and data tables taking long to update
- Timeout errors when accessing certain views

**Possible Causes:**
- Excessive data loading
- Inefficient database queries
- Browser limitations
- Network bandwidth issues

**Solutions:**
1. Reduce date ranges for displayed data
2. Limit number of displayed charts and widgets
3. Use data aggregation for historical views
4. Clear browser cache
5. Check network connectivity and bandwidth

## Database and Storage Problems

### Database Connection Errors

**Symptoms:**
- "Database connection failed" errors
- Intermittent data saving issues
- Slow query responses

**Possible Causes:**
- Database server issues
- Connection pool exhaustion
- Network connectivity problems
- Authentication issues

**Solutions:**
1. Check database server status
2. Verify connection string and credentials
3. Adjust connection pool settings
4. Optimize queries causing excessive load
5. Consider database scaling if consistently at capacity

**Database Troubleshooting:**
```
1. Navigate to Dashboard > System > Database
2. Check connection status and metrics
3. Review query performance statistics
4. Identify and optimize slow queries
5. Adjust connection pool settings if needed
```

### Storage Capacity Issues

**Symptoms:**
- "Disk space low" warnings
- Errors saving trading logs or historical data
- Performance degradation with larger datasets

**Possible Causes:**
- Excessive logging
- Historical data accumulation
- Temporary file cleanup issues
- Database growth

**Solutions:**
1. Check disk usage and available space
2. Implement log rotation and cleanup policies
3. Archive older historical data
4. Optimize database storage with compression
5. Increase storage capacity if necessary

## UI and Dashboard Issues

### Charts Not Loading

**Symptoms:**
- Empty chart containers
- "Chart data not available" errors
- Spinning loading indicators that never complete

**Possible Causes:**
- Data retrieval issues
- JavaScript errors
- Browser compatibility problems
- Large datasets causing timeout

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify data is available for selected time range
3. Try different browser or clear cache
4. Reduce date range to load less data
5. Check network connectivity

**Chart Troubleshooting:**
```
1. Open browser developer tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed data requests
4. Try reducing time range or data points
5. Disable browser extensions that might interfere
```

### Missing UI Elements

**Symptoms:**
- Dashboard sections not appearing
- Missing buttons or controls
- Layout appears broken

**Possible Causes:**
- JavaScript errors
- CSS loading issues
- Browser compatibility problems
- Feature flag or permission issues

**Solutions:**
1. Check browser console for errors
2. Verify user permissions for missing features
3. Try different browser or clear cache
4. Disable browser extensions
5. Check feature flags in configuration

## Security and Authentication Issues

### Authentication Failures

**Symptoms:**
- Unable to log in
- Session expired messages
- Unauthorized access errors

**Possible Causes:**
- Expired credentials
- Invalid API keys
- Token expiration
- Permission changes

**Solutions:**
1. Verify login credentials
2. Check API key validity and permissions
3. Ensure proper role assignments
4. Clear browser cookies and cache
5. Verify authentication service status

### Permission Denied Errors

**Symptoms:**
- "Permission denied" when accessing features
- Missing functionality compared to documentation
- Actions failing with authorization errors

**Possible Causes:**
- Insufficient user role
- Missing feature licenses
- Configuration restrictions
- Access control policy issues

**Solutions:**
1. Check user role and permissions
2. Verify feature licensing status
3. Review access control policies
4. Check for organization-level restrictions

## Common Error Codes

| Error Code | Description | Possible Solution |
|------------|-------------|-------------------|
| AGT-001 | Agent initialization failed | Check configuration and system resources |
| AGT-002 | Agent model loading error | Verify API key and model availability |
| AGT-003 | Agent runtime error | Check agent logs for specific error details |
| EXC-001 | Exchange authentication failed | Verify API credentials and permissions |
| EXC-002 | Exchange rate limit exceeded | Reduce request frequency or implement queuing |
| EXC-003 | Exchange order validation failed | Check order parameters against exchange requirements |
| STR-001 | Strategy parameter validation error | Adjust parameters to valid ranges |
| STR-002 | Strategy execution error | Check strategy logic and data availability |
| STR-003 | Strategy optimization failed | Verify parameter ranges and historical data |
| DAT-001 | Market data not available | Check data source connectivity |
| DAT-002 | Historical data incomplete | Verify data for required time range |
| DAT-003 | Real-time data feed error | Check exchange connectivity and subscription |
| SYS-001 | System resource limitation | Reduce system load or increase resources |
| SYS-002 | Database connection error | Check database status and connection |
| SYS-003 | Disk space warning | Clear logs or increase storage |

## Getting Additional Help

If you're unable to resolve an issue using this guide:

1. Check the [Community Forum](https://community.elizaos.com) for similar issues
2. Review detailed logs: Dashboard > System > Logs
3. Generate a system report: Dashboard > Support > Generate Report
4. Contact support with your system report and detailed issue description

### Creating a Support Ticket

For fastest resolution, include:

1. Detailed description of the issue
2. Steps to reproduce the problem
3. Error messages and relevant logs
4. System report ID
5. Screenshots of the issue if applicable

## Preventative Maintenance

To prevent common issues:

1. **Regular Updates**: Keep the system updated with the latest releases
2. **Backup Configuration**: Export and backup agent configurations regularly
3. **Resource Monitoring**: Set up alerts for resource usage thresholds
4. **Log Rotation**: Configure automatic log cleanup and rotation
5. **Performance Testing**: Periodically test system under load conditions
6. **Security Audits**: Regularly review API keys and access controls

By following these troubleshooting steps and preventative measures, you can maintain a healthy and effective ElizaOS Trading Agent System.
