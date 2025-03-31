/**
 * Protocols Dashboard Core - ElizaOS Trading Farm
 * Core functionality for the Protocols Dashboard
 */

// API Base URL
const API_BASE_URL = '/api/v1/protocols';

// State management
const state = {
    agents: [],
    sonicMarketData: {},
    vertexMarketData: {},
    sonicTransactions: [],
    vertexPositions: [],
    vertexOrders: [],
    strategies: {
        sonic: [],
        vertex: []
    },
    analytics: {
        performance: [],
        allocation: {},
        tradeStats: {}
    }
};

// Chart instances
let sonicPriceChart = null;
let vertexPriceChart = null;
let performanceChart = null;
let allocationChart = null;

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    initPageElements();
    initCharts();
    loadData();
    setupEventListeners();
});

// Initialize page elements
function initPageElements() {
    console.log('Initializing page elements...');
    
    // Set up protocol pair selections
    document.getElementById('sonic-pair-selector').addEventListener('change', (e) => {
        loadSonicMarketData(e.target.value);
    });
    
    document.getElementById('vertex-market-selector').addEventListener('change', (e) => {
        loadVertexMarketData(e.target.value);
    });
    
    // Set up agent type selection behavior
    document.getElementById('agent-type').addEventListener('change', updateTradingPairsOptions);
}

// Initialize charts
function initCharts() {
    console.log('Initializing charts...');
    
    // Sonic price chart
    sonicPriceChart = new ApexCharts(document.getElementById('sonic-price-chart'), {
        chart: {
            type: 'area',
            height: 350,
            toolbar: {
                show: true
            },
            animations: {
                enabled: true
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        series: [{
            name: 'Price',
            data: []
        }],
        xaxis: {
            type: 'datetime'
        },
        yaxis: {
            labels: {
                formatter: function(val) {
                    return '$' + val.toFixed(2);
                }
            }
        },
        tooltip: {
            x: {
                format: 'dd MMM yyyy HH:mm'
            }
        },
        theme: {
            mode: 'light',
            palette: 'palette1'
        }
    });
    sonicPriceChart.render();
    
    // Vertex price chart
    vertexPriceChart = new ApexCharts(document.getElementById('vertex-price-chart'), {
        chart: {
            type: 'candlestick',
            height: 350,
            toolbar: {
                show: true
            }
        },
        series: [{
            data: []
        }],
        xaxis: {
            type: 'datetime'
        },
        yaxis: {
            tooltip: {
                enabled: true
            },
            labels: {
                formatter: function(val) {
                    return '$' + val.toFixed(2);
                }
            }
        },
        tooltip: {
            x: {
                format: 'dd MMM yyyy HH:mm'
            }
        }
    });
    vertexPriceChart.render();
    
    // Performance chart
    performanceChart = new ApexCharts(document.getElementById('performance-chart'), {
        chart: {
            type: 'line',
            height: 350,
            toolbar: {
                show: true
            }
        },
        stroke: {
            width: [3, 3],
            curve: 'smooth'
        },
        series: [
            {
                name: 'Sonic',
                data: []
            },
            {
                name: 'Vertex',
                data: []
            }
        ],
        colors: ['#7e57c2', '#26a69a'],
        xaxis: {
            type: 'datetime'
        },
        yaxis: {
            labels: {
                formatter: function(val) {
                    return val.toFixed(2) + '%';
                }
            }
        },
        legend: {
            position: 'top'
        }
    });
    performanceChart.render();
    
    // Allocation chart
    allocationChart = new ApexCharts(document.getElementById('allocation-chart'), {
        chart: {
            type: 'pie',
            height: 350
        },
        series: [],
        labels: [],
        legend: {
            position: 'bottom'
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 300
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    });
    allocationChart.render();
}

// Load all data
function loadData() {
    console.log('Loading data...');
    
    fetchAgents();
    loadSonicMarketData('SUI-USDC');
    loadVertexMarketData('ETH-PERP');
    loadStrategies();
    loadAnalytics();
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Create new agent
    document.getElementById('create-agent-btn').addEventListener('click', createNewAgent);
    
    // Vertex cancel orders button
    document.getElementById('vertex-cancel-orders').addEventListener('click', function() {
        // Get the selected agent for Vertex
        const vertexAgents = state.agents.filter(a => a.agent_type === 'vertex');
        if (vertexAgents.length > 0) {
            cancelVertexOrders(vertexAgents[0].agent_id);
        } else {
            alert('No Vertex agents available');
        }
    });
}

// Update trading pairs options based on agent type
function updateTradingPairsOptions() {
    const agentType = document.getElementById('agent-type').value;
    const container = document.getElementById('trading-pairs-container');
    
    // Clear existing options
    container.innerHTML = '';
    
    if (agentType === 'sonic') {
        const pairs = [
            { id: 'SUI-USDC', label: 'SUI-USDC' },
            { id: 'SUI-USDT', label: 'SUI-USDT' },
            { id: 'WETH-USDC', label: 'WETH-USDC' }
        ];
        
        pairs.forEach(pair => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${pair.id}" id="pair-${pair.id}" checked>
                <label class="form-check-label" for="pair-${pair.id}">${pair.label}</label>
            `;
            container.appendChild(div);
        });
    } else if (agentType === 'vertex') {
        const markets = [
            { id: 'ETH-PERP', label: 'ETH-PERP' },
            { id: 'BTC-PERP', label: 'BTC-PERP' },
            { id: 'SOL-PERP', label: 'SOL-PERP' },
            { id: 'SUI-PERP', label: 'SUI-PERP' }
        ];
        
        markets.forEach(market => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${market.id}" id="market-${market.id}" checked>
                <label class="form-check-label" for="market-${market.id}">${market.label}</label>
            `;
            container.appendChild(div);
        });
    }
}

// API Functions

// Fetch agents
async function fetchAgents() {
    try {
        const response = await fetch(`${API_BASE_URL}/agents`);
        const data = await response.json();
        
        if (data.success) {
            state.agents = data.agents;
            updateAgentsUI();
            updateStats();
        } else {
            console.error('Failed to fetch agents:', data);
        }
    } catch (error) {
        console.error('Error fetching agents:', error);
    }
}

// Create new agent
async function createNewAgent() {
    const name = document.getElementById('agent-name').value;
    const agentType = document.getElementById('agent-type').value;
    const privateKey = document.getElementById('private-key').value;
    const useTestnet = document.getElementById('use-testnet').checked;
    
    // Get selected trading pairs/markets
    let activePairs = [];
    if (agentType === 'sonic') {
        document.querySelectorAll('#trading-pairs-container input:checked').forEach(el => {
            activePairs.push(el.value);
        });
    } else if (agentType === 'vertex') {
        document.querySelectorAll('#trading-pairs-container input:checked').forEach(el => {
            activePairs.push(el.value);
        });
    }
    
    if (!name || !agentType) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                agent_type: agentType,
                private_key: privateKey || undefined,
                use_testnet: useTestnet,
                config: {
                    active_pairs: activePairs.map(pair => pair.split('-'))
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Agent "${name}" created successfully!`);
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('newAgentModal')).hide();
            // Refresh agents
            fetchAgents();
        } else {
            alert(`Failed to create agent: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error creating agent:', error);
        alert(`Error creating agent: ${error.message}`);
    }
}

// Start agent
async function startAgent(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/agents/${agentId}/start`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Agent started successfully!`);
            fetchAgents();
        } else {
            alert(`Failed to start agent: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error starting agent:', error);
        alert(`Error starting agent: ${error.message}`);
    }
}

// Stop agent
async function stopAgent(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/agents/${agentId}/stop`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Agent stopped successfully!`);
            fetchAgents();
        } else {
            alert(`Failed to stop agent: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error stopping agent:', error);
        alert(`Error stopping agent: ${error.message}`);
    }
}

// Delete agent
async function deleteAgent(agentId) {
    if (!confirm('Are you sure you want to delete this agent?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Agent deleted successfully!`);
            fetchAgents();
        } else {
            alert(`Failed to delete agent: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting agent:', error);
        alert(`Error deleting agent: ${error.message}`);
    }
}

// Load Sonic market data
async function loadSonicMarketData(pairKey) {
    try {
        // Update currently selected pair
        document.getElementById('sonic-current-pool').textContent = pairKey;
        
        // Find Sonic agent
        const sonicAgents = state.agents.filter(a => a.agent_type === 'sonic');
        if (sonicAgents.length === 0) {
            console.warn('No Sonic agents available');
            return;
        }
        
        const agentId = sonicAgents[0].agent_id;
        
        // Fetch pool data
        const response = await fetch(`${API_BASE_URL}/sonic/pools?agent_id=${agentId}`);
        const data = await response.json();
        
        if (data.success) {
            // Find the selected pool
            const pool = data.pools[pairKey];
            
            if (pool) {
                state.sonicMarketData[pairKey] = pool;
                
                // Update UI
                document.getElementById('sonic-pool-tvl').textContent = `$${parseFloat(pool.tvl || 0).toFixed(2)}`;
                document.getElementById('sonic-pool-apr').textContent = `${(parseFloat(pool.apr || 0) * 100).toFixed(2)}%`;
                document.getElementById('sonic-pool-volume').textContent = `$${parseFloat(pool.volume_24h || 0).toFixed(2)}`;
                document.getElementById('sonic-pool-fees').textContent = `$${parseFloat(pool.fees_24h || 0).toFixed(2)}`;
                
                // Update chart data
                updateSonicPriceChart(pairKey);
            }
        } else {
            console.error('Failed to fetch Sonic pools:', data);
        }
        
        // Fetch recent transactions
        loadSonicTransactions(agentId);
        
    } catch (error) {
        console.error('Error loading Sonic market data:', error);
    }
}

// Load Vertex market data
async function loadVertexMarketData(market) {
    try {
        // Update currently selected market
        document.getElementById('vertex-current-market').textContent = market;
        
        // Find Vertex agent
        const vertexAgents = state.agents.filter(a => a.agent_type === 'vertex');
        if (vertexAgents.length === 0) {
            console.warn('No Vertex agents available');
            return;
        }
        
        const agentId = vertexAgents[0].agent_id;
        
        // Fetch market data
        const response = await fetch(`${API_BASE_URL}/vertex/market-data?agent_id=${agentId}&symbol=${market}`);
        const data = await response.json();
        
        if (data.success) {
            state.vertexMarketData[market] = data.market_data;
            
            const marketData = data.market_data;
            
            // Update UI
            document.getElementById('vertex-market-price').textContent = `$${parseFloat(marketData.price || 0).toFixed(2)}`;
            document.getElementById('vertex-market-change').textContent = `${(parseFloat(marketData.change_24h || 0) * 100).toFixed(2)}%`;
            document.getElementById('vertex-market-volume').textContent = `$${parseFloat(marketData.volume_24h || 0).toFixed(2)}`;
            document.getElementById('vertex-market-oi').textContent = `$${parseFloat(marketData.open_interest || 0).toFixed(2)}`;
            
            // Update chart data
            updateVertexPriceChart(market);
        } else {
            console.error('Failed to fetch Vertex market data:', data);
        }
        
        // Fetch positions and orders
        loadVertexPositions(agentId);
        loadVertexOrders(agentId);
        
    } catch (error) {
        console.error('Error loading Vertex market data:', error);
    }
}

// Cancel Vertex orders
async function cancelVertexOrders(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vertex/cancel-orders?agent_id=${agentId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Cancelled ${data.cancellations} orders successfully!`);
            loadVertexOrders(agentId);
        } else {
            alert(`Failed to cancel orders: ${data.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error cancelling orders:', error);
        alert(`Error cancelling orders: ${error.message}`);
    }
}
