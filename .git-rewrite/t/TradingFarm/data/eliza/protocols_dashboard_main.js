/**
 * Protocols Dashboard - Main JS
 * Combines core functionality and UI updates for ElizaOS Trading Farm Protocols Dashboard
 */

// Link the core and UI modules
document.addEventListener('DOMContentLoaded', function() {
    // Load the required scripts
    loadScript('protocols_dashboard_core.js', function() {
        loadScript('protocols_dashboard_ui.js', function() {
            console.log('All dashboard modules loaded successfully');
            // Initialize real-time data updates
            startDataPolling();
        });
    });
});

// Helper function to load scripts dynamically
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Start periodic data polling for real-time updates
function startDataPolling() {
    // Initial data load
    fetchAgents();
    loadSonicMarketData(document.getElementById('sonic-pair-selector').value);
    loadVertexMarketData(document.getElementById('vertex-market-selector').value);
    
    // Load strategies and analytics (less frequent updates)
    loadStrategies();
    loadAnalytics();
    
    // Set up polling intervals
    const AGENT_POLL_INTERVAL = 10000; // 10 seconds
    const MARKET_POLL_INTERVAL = 5000; // 5 seconds
    const ANALYTICS_POLL_INTERVAL = 60000; // 1 minute
    
    // Start polling
    setInterval(fetchAgents, AGENT_POLL_INTERVAL);
    
    setInterval(function() {
        loadSonicMarketData(document.getElementById('sonic-pair-selector').value);
    }, MARKET_POLL_INTERVAL);
    
    setInterval(function() {
        loadVertexMarketData(document.getElementById('vertex-market-selector').value);
    }, MARKET_POLL_INTERVAL);
    
    setInterval(loadStrategies, ANALYTICS_POLL_INTERVAL);
    setInterval(loadAnalytics, ANALYTICS_POLL_INTERVAL);
}

// Additional utility functions
function showNotification(message, type = 'info') {
    // Create a toast notification
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : (type === 'success' ? 'success' : 'primary')}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Add to page if toast container doesn't exist
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    // Add toast to container
    const container = document.getElementById('toast-container');
    container.innerHTML += toastHTML;
    
    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove toast after hiding
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Error handling wrapper for API calls
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (!data.success) {
            showNotification(`API Error: ${data.detail || 'Unknown error'}`, 'error');
            console.error('API Error:', data);
        }
        
        return data;
    } catch (error) {
        showNotification(`Network Error: ${error.message}`, 'error');
        console.error('Network Error:', error);
        return { success: false, detail: error.message };
    }
}

// Initialize the modal forms
function setupModalForms() {
    // New Agent Form
    document.getElementById('create-agent-btn').addEventListener('click', function(e) {
        e.preventDefault();
        const form = document.getElementById('new-agent-form');
        if (form.checkValidity()) {
            createNewAgent();
        } else {
            form.reportValidity();
        }
    });
    
    // Sonic Swap Modal
    document.getElementById('sonicSwapModal').addEventListener('show.bs.modal', function() {
        // Populate token dropdowns
        const tokenPairs = state.agents
            .filter(a => a.agent_type === 'sonic')
            .flatMap(a => a.active_pairs || []);
        
        const uniqueTokens = [...new Set(tokenPairs.flat())];
        
        const fromTokenSelect = document.getElementById('swap-from-token');
        const toTokenSelect = document.getElementById('swap-to-token');
        
        fromTokenSelect.innerHTML = '';
        toTokenSelect.innerHTML = '';
        
        uniqueTokens.forEach(token => {
            fromTokenSelect.innerHTML += `<option value="${token}">${token}</option>`;
            toTokenSelect.innerHTML += `<option value="${token}">${token}</option>`;
        });
        
        // Set different default values
        if (uniqueTokens.includes('SUI') && uniqueTokens.includes('USDC')) {
            fromTokenSelect.value = 'SUI';
            toTokenSelect.value = 'USDC';
        }
    });
    
    // Execute swap button
    document.getElementById('execute-swap-btn').addEventListener('click', function() {
        const fromToken = document.getElementById('swap-from-token').value;
        const toToken = document.getElementById('swap-to-token').value;
        const amount = parseFloat(document.getElementById('swap-amount').value);
        const agentSelect = document.getElementById('swap-agent');
        const agentId = agentSelect.value;
        
        if (!fromToken || !toToken || isNaN(amount) || amount <= 0 || !agentId) {
            showNotification('Please fill in all fields correctly', 'error');
            return;
        }
        
        executeSonicSwap(agentId, fromToken, toToken, amount);
    });
    
    // Vertex Order Modal
    document.getElementById('vertexOrderModal').addEventListener('show.bs.modal', function() {
        const marketSelect = document.getElementById('order-market');
        const markets = state.agents
            .filter(a => a.agent_type === 'vertex')
            .flatMap(a => a.active_markets || []);
        
        const uniqueMarkets = [...new Set(markets)];
        
        marketSelect.innerHTML = '';
        uniqueMarkets.forEach(market => {
            marketSelect.innerHTML += `<option value="${market}">${market}</option>`;
        });
        
        // Default to current selected market
        const currentMarket = document.getElementById('vertex-market-selector').value;
        if (uniqueMarkets.includes(currentMarket)) {
            marketSelect.value = currentMarket;
        }
    });
    
    // Execute order button
    document.getElementById('execute-order-btn').addEventListener('click', function() {
        const market = document.getElementById('order-market').value;
        const side = document.getElementById('order-side').value;
        const type = document.getElementById('order-type').value;
        const size = parseFloat(document.getElementById('order-size').value);
        const price = parseFloat(document.getElementById('order-price').value);
        const agentSelect = document.getElementById('order-agent');
        const agentId = agentSelect.value;
        
        if (!market || !side || !type || isNaN(size) || size <= 0 || !agentId) {
            showNotification('Please fill in all fields correctly', 'error');
            return;
        }
        
        if (type === 'LIMIT' && (isNaN(price) || price <= 0)) {
            showNotification('Please enter a valid price for limit orders', 'error');
            return;
        }
        
        executeVertexOrder(agentId, market, side, type, size, price);
    });
}

// Execute Sonic swap
async function executeSonicSwap(agentId, fromToken, toToken, amount) {
    const result = await apiCall(`${API_BASE_URL}/sonic/swap`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            agent_id: agentId,
            from_token: fromToken,
            to_token: toToken,
            amount: amount
        })
    });
    
    if (result.success) {
        showNotification(`Swap executed successfully! Received ${result.to_amount} ${toToken}`, 'success');
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('sonicSwapModal')).hide();
        // Refresh data
        loadSonicMarketData(document.getElementById('sonic-pair-selector').value);
    }
}

// Execute Vertex order
async function executeVertexOrder(agentId, market, side, type, size, price) {
    const result = await apiCall(`${API_BASE_URL}/vertex/place-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            agent_id: agentId,
            market: market,
            side: side,
            type: type,
            size: size,
            price: type === 'LIMIT' ? price : undefined
        })
    });
    
    if (result.success) {
        showNotification(`Order placed successfully! Order ID: ${result.order_id}`, 'success');
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('vertexOrderModal')).hide();
        // Refresh data
        loadVertexMarketData(document.getElementById('vertex-market-selector').value);
    }
}

// Set up global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification(`JavaScript Error: ${e.message}`, 'error');
});

// Initialize all components on load
document.addEventListener('DOMContentLoaded', function() {
    setupModalForms();
});
