/**
 * Protocols Dashboard UI - ElizaOS Trading Farm
 * UI update functions for the Protocols Dashboard
 */

// Update Agents UI
function updateAgentsUI() {
    const container = document.getElementById('agents-container');
    container.innerHTML = '';
    
    if (!state.agents || state.agents.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No agents found. Create a new agent to get started.
                </div>
            </div>
        `;
        return;
    }
    
    // Group agents by type
    const sonicAgents = state.agents.filter(a => a.agent_type === 'sonic');
    const vertexAgents = state.agents.filter(a => a.agent_type === 'vertex');
    
    // Add Sonic agents
    if (sonicAgents.length > 0) {
        container.innerHTML += `
            <div class="col-12 mb-3">
                <h6 class="text-sonic"><i class="bi bi-lightning-charge-fill me-2"></i>Sonic Protocol Agents</h6>
            </div>
        `;
        
        sonicAgents.forEach(agent => {
            container.innerHTML += createAgentCard(agent);
        });
    }
    
    // Add Vertex agents
    if (vertexAgents.length > 0) {
        container.innerHTML += `
            <div class="col-12 mb-3 mt-3">
                <h6 class="text-vertex"><i class="bi bi-triangle-fill me-2"></i>Vertex Protocol Agents</h6>
            </div>
        `;
        
        vertexAgents.forEach(agent => {
            container.innerHTML += createAgentCard(agent);
        });
    }
    
    // Add event listeners for agent actions
    document.querySelectorAll('.start-agent-btn').forEach(btn => {
        btn.addEventListener('click', () => startAgent(btn.dataset.agentId));
    });
    
    document.querySelectorAll('.stop-agent-btn').forEach(btn => {
        btn.addEventListener('click', () => stopAgent(btn.dataset.agentId));
    });
    
    document.querySelectorAll('.delete-agent-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAgent(btn.dataset.agentId));
    });
}

// Create an agent card
function createAgentCard(agent) {
    const statusBadgeClass = agent.status === 'running' ? 'bg-success' : 'bg-secondary';
    const isRunning = agent.status === 'running';
    const agentTypeClass = agent.agent_type === 'sonic' ? 'text-sonic' : 'text-vertex';
    const agentTypeIcon = agent.agent_type === 'sonic' ? 'bi-lightning-charge' : 'bi-triangle';
    
    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card agent-card h-100">
                <div class="card-body">
                    <span class="badge ${statusBadgeClass} status-badge">${agent.status}</span>
                    <h5 class="card-title mb-1">
                        <i class="bi ${agentTypeIcon} ${agentTypeClass} me-2"></i>
                        ${agent.name}
                    </h5>
                    <p class="text-muted small mb-3">ID: ${agent.agent_id}</p>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small">Performance (24h)</span>
                            <span class="small ${agent.performance_24h >= 0 ? 'text-success' : 'text-danger'}">
                                ${agent.performance_24h >= 0 ? '+' : ''}${(agent.performance_24h || 0).toFixed(2)}%
                            </span>
                        </div>
                        <div class="progress progress-sm">
                            <div class="progress-bar ${agent.performance_24h >= 0 ? 'bg-success' : 'bg-danger'}" 
                                 role="progressbar" 
                                 style="width: ${Math.min(Math.abs(agent.performance_24h || 0), 20)}%"></div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small">Assets Under Management</span>
                            <span class="small">$${(agent.aum || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small">Active Pairs/Markets</span>
                            <span class="small">${agent.active_pairs ? agent.active_pairs.length : 0}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small">Network</span>
                            <span class="small">${agent.use_testnet ? 'Testnet' : 'Mainnet'}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100">
                        ${isRunning 
                            ? `<button class="btn btn-sm btn-outline-danger stop-agent-btn" data-agent-id="${agent.agent_id}">
                                <i class="bi bi-stop-circle me-1"></i> Stop
                               </button>`
                            : `<button class="btn btn-sm btn-outline-success start-agent-btn" data-agent-id="${agent.agent_id}">
                                <i class="bi bi-play-circle me-1"></i> Start
                               </button>`
                        }
                        <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#configureAgentModal" data-agent-id="${agent.agent_id}">
                            <i class="bi bi-gear me-1"></i> Configure
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-agent-btn" data-agent-id="${agent.agent_id}">
                            <i class="bi bi-trash me-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Update dashboard stats
function updateStats() {
    const sonicAgentCount = state.agents.filter(a => a.agent_type === 'sonic').length;
    const vertexAgentCount = state.agents.filter(a => a.agent_type === 'vertex').length;
    
    document.getElementById('sonic-agent-count').textContent = sonicAgentCount;
    document.getElementById('vertex-agent-count').textContent = vertexAgentCount;
    
    // Calculate total value
    const totalValue = state.agents.reduce((sum, agent) => sum + (agent.aum || 0), 0);
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    
    // Calculate weighted performance
    if (totalValue > 0) {
        const weightedPerformance = state.agents.reduce((sum, agent) => {
            return sum + ((agent.performance_24h || 0) * (agent.aum || 0) / totalValue);
        }, 0);
        
        document.getElementById('performance-24h').textContent = `${weightedPerformance >= 0 ? '+' : ''}${weightedPerformance.toFixed(2)}%`;
        document.getElementById('performance-24h').className = `stat-value ${weightedPerformance >= 0 ? 'text-success' : 'text-danger'}`;
    } else {
        document.getElementById('performance-24h').textContent = '0.00%';
        document.getElementById('performance-24h').className = 'stat-value';
    }
}

// Update Sonic price chart
function updateSonicPriceChart(pairKey) {
    if (!state.sonicMarketData[pairKey] || !state.sonicMarketData[pairKey].price_history) {
        return;
    }
    
    const priceHistory = state.sonicMarketData[pairKey].price_history;
    
    // Convert to chart data format
    const chartData = priceHistory.map(item => ({
        x: new Date(item.timestamp).getTime(),
        y: parseFloat(item.price)
    }));
    
    sonicPriceChart.updateSeries([{
        name: pairKey,
        data: chartData
    }]);
}

// Update Vertex price chart
function updateVertexPriceChart(market) {
    if (!state.vertexMarketData[market] || !state.vertexMarketData[market].candles) {
        return;
    }
    
    const candles = state.vertexMarketData[market].candles;
    
    // Convert to candlestick format
    const chartData = candles.map(candle => ({
        x: new Date(candle.timestamp).getTime(),
        y: [
            parseFloat(candle.open),
            parseFloat(candle.high),
            parseFloat(candle.low),
            parseFloat(candle.close)
        ]
    }));
    
    vertexPriceChart.updateSeries([{
        name: market,
        data: chartData
    }]);
}

// Load Sonic transactions
async function loadSonicTransactions(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sonic/transactions?agent_id=${agentId}`);
        const data = await response.json();
        
        if (data.success) {
            state.sonicTransactions = data.transactions;
            updateSonicTransactionsUI();
        } else {
            console.error('Failed to fetch Sonic transactions:', data);
        }
    } catch (error) {
        console.error('Error fetching Sonic transactions:', error);
    }
}

// Update Sonic transactions UI
function updateSonicTransactionsUI() {
    const container = document.getElementById('sonic-transactions');
    container.innerHTML = '';
    
    if (!state.sonicTransactions || state.sonicTransactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No recent transactions</td>
            </tr>
        `;
        return;
    }
    
    state.sonicTransactions.forEach(tx => {
        const statusClass = tx.status === 'completed' ? 'text-success' : (tx.status === 'failed' ? 'text-danger' : 'text-warning');
        
        container.innerHTML += `
            <tr>
                <td>${formatDateTime(tx.timestamp)}</td>
                <td>${tx.agent_name}</td>
                <td>${tx.type}</td>
                <td>${tx.from_token} (${formatAmount(tx.from_amount)})</td>
                <td>${tx.to_token} (${formatAmount(tx.to_amount)})</td>
                <td>$${formatAmount(tx.usd_value)}</td>
                <td><span class="${statusClass}">${tx.status}</span></td>
            </tr>
        `;
    });
}

// Load Vertex positions
async function loadVertexPositions(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vertex/positions?agent_id=${agentId}`);
        const data = await response.json();
        
        if (data.success) {
            state.vertexPositions = data.positions;
            updateVertexPositionsUI();
        } else {
            console.error('Failed to fetch Vertex positions:', data);
        }
    } catch (error) {
        console.error('Error fetching Vertex positions:', error);
    }
}

// Update Vertex positions UI
function updateVertexPositionsUI() {
    const container = document.getElementById('vertex-positions');
    container.innerHTML = '';
    
    if (!state.vertexPositions || state.vertexPositions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No open positions</td>
            </tr>
        `;
        return;
    }
    
    state.vertexPositions.forEach(position => {
        const pnlClass = position.unrealized_pnl >= 0 ? 'text-success' : 'text-danger';
        const pnlValue = `${position.unrealized_pnl >= 0 ? '+' : ''}$${Math.abs(position.unrealized_pnl).toFixed(2)} (${position.unrealized_pnl_pct.toFixed(2)}%)`;
        
        container.innerHTML += `
            <tr>
                <td>${position.market}</td>
                <td><span class="${position.side.toLowerCase() === 'long' ? 'text-success' : 'text-danger'}">${position.side}</span></td>
                <td>${position.size}</td>
                <td>$${position.entry_price.toFixed(2)}</td>
                <td>$${position.mark_price.toFixed(2)}</td>
                <td><span class="${pnlClass}">${pnlValue}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="closePosition('${agentId}', '${position.position_id}')">Close</button>
                </td>
            </tr>
        `;
    });
}

// Load Vertex orders
async function loadVertexOrders(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vertex/orders?agent_id=${agentId}`);
        const data = await response.json();
        
        if (data.success) {
            state.vertexOrders = data.orders;
            updateVertexOrdersUI(agentId);
        } else {
            console.error('Failed to fetch Vertex orders:', data);
        }
    } catch (error) {
        console.error('Error fetching Vertex orders:', error);
    }
}

// Update Vertex orders UI
function updateVertexOrdersUI(agentId) {
    const container = document.getElementById('vertex-orders');
    container.innerHTML = '';
    
    if (!state.vertexOrders || state.vertexOrders.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No open orders</td>
            </tr>
        `;
        return;
    }
    
    state.vertexOrders.forEach(order => {
        container.innerHTML += `
            <tr>
                <td>${order.market}</td>
                <td><span class="${order.side.toLowerCase() === 'buy' ? 'text-success' : 'text-danger'}">${order.side}</span></td>
                <td>${order.type}</td>
                <td>${order.size}</td>
                <td>$${order.price.toFixed(2)}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelOrder('${agentId}', '${order.order_id}')">Cancel</button>
                </td>
            </tr>
        `;
    });
}

// Load strategies
async function loadStrategies() {
    try {
        const response = await fetch(`${API_BASE_URL}/strategies`);
        const data = await response.json();
        
        if (data.success) {
            state.strategies = data.strategies;
            updateStrategiesUI();
        } else {
            console.error('Failed to fetch strategies:', data);
        }
    } catch (error) {
        console.error('Error fetching strategies:', error);
    }
}

// Update strategies UI
function updateStrategiesUI() {
    // Update Sonic strategies
    const sonicContainer = document.getElementById('sonic-strategies');
    sonicContainer.innerHTML = '';
    
    if (!state.strategies.sonic || state.strategies.sonic.length === 0) {
        sonicContainer.innerHTML = `
            <div class="alert alert-info">
                No Sonic strategies available. Create a new strategy to get started.
            </div>
        `;
    } else {
        state.strategies.sonic.forEach(strategy => {
            sonicContainer.innerHTML += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${strategy.name}</h6>
                        <p class="mb-1 small text-muted">${strategy.description}</p>
                        <small>Parameters: ${Object.keys(strategy.parameters).length}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="modal" data-bs-target="#configureStrategyModal" data-strategy-id="${strategy.id}" data-protocol="sonic">
                            <i class="bi bi-gear-fill"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Update Vertex strategies
    const vertexContainer = document.getElementById('vertex-strategies');
    vertexContainer.innerHTML = '';
    
    if (!state.strategies.vertex || state.strategies.vertex.length === 0) {
        vertexContainer.innerHTML = `
            <div class="alert alert-info">
                No Vertex strategies available. Create a new strategy to get started.
            </div>
        `;
    } else {
        state.strategies.vertex.forEach(strategy => {
            vertexContainer.innerHTML += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${strategy.name}</h6>
                        <p class="mb-1 small text-muted">${strategy.description}</p>
                        <small>Parameters: ${Object.keys(strategy.parameters).length}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="modal" data-bs-target="#configureStrategyModal" data-strategy-id="${strategy.id}" data-protocol="vertex">
                            <i class="bi bi-gear-fill"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        const data = await response.json();
        
        if (data.success) {
            state.analytics = data.analytics;
            updateAnalyticsUI();
        } else {
            console.error('Failed to fetch analytics:', data);
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

// Update analytics UI
function updateAnalyticsUI() {
    // Update performance chart
    if (state.analytics.performance) {
        const sonicPerformance = state.analytics.performance.sonic.map(item => ({
            x: new Date(item.date).getTime(),
            y: parseFloat((item.value * 100).toFixed(2))
        }));
        
        const vertexPerformance = state.analytics.performance.vertex.map(item => ({
            x: new Date(item.date).getTime(),
            y: parseFloat((item.value * 100).toFixed(2))
        }));
        
        performanceChart.updateSeries([
            {
                name: 'Sonic',
                data: sonicPerformance
            },
            {
                name: 'Vertex',
                data: vertexPerformance
            }
        ]);
    }
    
    // Update allocation chart
    if (state.analytics.allocation) {
        const allocData = [];
        const allocLabels = [];
        
        Object.entries(state.analytics.allocation).forEach(([asset, value]) => {
            allocData.push(parseFloat(value));
            allocLabels.push(asset);
        });
        
        allocationChart.updateSeries(allocData);
        allocationChart.updateOptions({
            labels: allocLabels
        });
    }
    
    // Update trade statistics
    if (state.analytics.tradeStats) {
        document.getElementById('total-trades').textContent = state.analytics.tradeStats.total_trades || 0;
        document.getElementById('win-rate').textContent = `${((state.analytics.tradeStats.win_rate || 0) * 100).toFixed(2)}%`;
        document.getElementById('avg-profit').textContent = `$${(state.analytics.tradeStats.avg_profit || 0).toFixed(2)}`;
        document.getElementById('avg-loss').textContent = `$${(state.analytics.tradeStats.avg_loss || 0).toFixed(2)}`;
        
        // Update risk metrics
        document.getElementById('sharpe-ratio').textContent = (state.analytics.tradeStats.sharpe_ratio || 0).toFixed(2);
        document.getElementById('max-drawdown').textContent = `${((state.analytics.tradeStats.max_drawdown || 0) * 100).toFixed(2)}%`;
        document.getElementById('profit-factor').textContent = (state.analytics.tradeStats.profit_factor || 0).toFixed(2);
        document.getElementById('exposure').textContent = `${((state.analytics.tradeStats.exposure || 0) * 100).toFixed(2)}%`;
    }
}

// Helper functions
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function formatAmount(amount) {
    return parseFloat(amount).toFixed(6);
}

// Close position
async function closePosition(agentId, positionId) {
    if (!confirm('Are you sure you want to close this position?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/vertex/close-position`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId,
                position_id: positionId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Position closed successfully!');
            loadVertexPositions(agentId);
        } else {
            alert(`Failed to close position: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error closing position:', error);
        alert(`Error closing position: ${error.message}`);
    }
}

// Cancel order
async function cancelOrder(agentId, orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vertex/cancel-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId,
                order_id: orderId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order cancelled successfully!');
            loadVertexOrders(agentId);
        } else {
            alert(`Failed to cancel order: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert(`Error cancelling order: ${error.message}`);
    }
}
