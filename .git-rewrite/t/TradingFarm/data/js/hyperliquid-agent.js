/**
 * ElizaHyperliquidAgent JavaScript Integration
 * Connects the ElizaOS AI Command Console to the Hyperliquid Python agent
 */

class HyperliquidAgent {
    constructor() {
        this.baseUrl = '/api/hyperliquid';
        this.connectionStatus = 'disconnected';
        this.lastChecked = null;
        this.healthCheckInterval = null;
        this.riskParameters = {
            maxOrderSize: 0.1, // ETH
            maxDailyDrawdown: 5, // percent
            stopLossPercent: 2,
            retryAttempts: 3
        };
    }

    /**
     * Initialize the connection to the Hyperliquid agent
     */
    async initialize() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            const data = await response.json();
            
            if (data.status === 'connected') {
                this.connectionStatus = 'connected';
                this.startHealthCheck();
                return { success: true, message: 'Connected to Hyperliquid agent', data };
            } else {
                this.connectionStatus = 'error';
                return { success: false, message: 'Failed to connect to Hyperliquid agent', error: data.error };
            }
        } catch (error) {
            this.connectionStatus = 'error';
            console.error('Error initializing Hyperliquid agent:', error);
            return { success: false, message: 'Error connecting to Hyperliquid agent', error };
        }
    }

    /**
     * Start periodic health checks for the Hyperliquid connection
     */
    startHealthCheck() {
        // Clear any existing interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // Check health every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.baseUrl}/health`);
                const data = await response.json();
                
                this.lastChecked = new Date();
                this.connectionStatus = data.status;
                
                // Send health data to any subscribers
                const event = new CustomEvent('hyperliquid-health-update', { 
                    detail: { 
                        status: data.status,
                        latency: data.latency,
                        errorRate: data.errorRate,
                        lastChecked: this.lastChecked
                    } 
                });
                document.dispatchEvent(event);
                
                // Update the UI
                this.updateStatusIndicator(data.status);
                
            } catch (error) {
                console.error('Hyperliquid health check failed:', error);
                this.connectionStatus = 'error';
                this.updateStatusIndicator('error');
            }
        }, 30000);
    }
    
    /**
     * Update the status indicator in the UI
     */
    updateStatusIndicator(status) {
        const statusElement = document.getElementById('hyperliquid-status');
        if (!statusElement) return;
        
        statusElement.className = '';
        statusElement.classList.add('status-indicator');
        
        switch (status) {
            case 'connected':
                statusElement.classList.add('status-connected');
                statusElement.setAttribute('title', 'Hyperliquid connection active');
                break;
            case 'degraded':
                statusElement.classList.add('status-warning');
                statusElement.setAttribute('title', 'Hyperliquid connection degraded');
                break;
            case 'error':
                statusElement.classList.add('status-error');
                statusElement.setAttribute('title', 'Hyperliquid connection error');
                break;
            default:
                statusElement.classList.add('status-disconnected');
                statusElement.setAttribute('title', 'Hyperliquid disconnected');
        }
    }
    
    /**
     * Execute a trade on Hyperliquid
     */
    async executeTrade(symbol, side, size) {
        // Apply risk parameters
        const adjustedSize = this.applyRiskParameters(size);
        
        try {
            const response = await fetch(`${this.baseUrl}/trade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbol,
                    side,
                    size: adjustedSize,
                    retryAttempts: this.riskParameters.retryAttempts
                }),
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error executing Hyperliquid trade:', error);
            return { success: false, message: 'Error executing trade', error };
        }
    }
    
    /**
     * Apply risk parameters to trade size
     */
    applyRiskParameters(requestedSize) {
        // Ensure the order size doesn't exceed configured max
        return Math.min(requestedSize, this.riskParameters.maxOrderSize);
    }
    
    /**
     * Update risk parameters
     */
    updateRiskParameters(parameters) {
        this.riskParameters = {
            ...this.riskParameters,
            ...parameters
        };
        return this.riskParameters;
    }
    
    /**
     * Get the status of an order
     */
    async getOrderStatus(orderId) {
        try {
            const response = await fetch(`${this.baseUrl}/order-status/${orderId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting Hyperliquid order status:', error);
            return { success: false, message: 'Error retrieving order status', error };
        }
    }
    
    /**
     * Get the order book for a symbol
     */
    async getOrderBook(symbol) {
        try {
            const response = await fetch(`${this.baseUrl}/orderbook?symbol=${symbol}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting Hyperliquid orderbook:', error);
            return { success: false, message: 'Error retrieving orderbook', error };
        }
    }
    
    /**
     * Get available assets
     */
    async getAvailableAssets() {
        try {
            const response = await fetch(`${this.baseUrl}/assets`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting Hyperliquid assets:', error);
            return { success: false, message: 'Error retrieving assets', error };
        }
    }
}

// Export the singleton instance
window.hyperliquidAgent = new HyperliquidAgent();
