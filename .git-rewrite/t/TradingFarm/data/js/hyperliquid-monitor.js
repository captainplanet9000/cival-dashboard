/**
 * Hyperliquid Monitoring Dashboard
 * Provides real-time monitoring of Hyperliquid connection and risk management
 */

class HyperliquidMonitor {
    constructor() {
        this.latencyHistory = Array(20).fill(null);
        this.errorHistory = Array(30).fill(0);
        this.lastCheckTime = null;
        this.latencyChart = null;
        this.orderHistory = [];
    }
    
    /**
     * Initialize the monitoring dashboard
     */
    async initialize() {
        this.setupEventListeners();
        this.initializeLatencyChart();
        this.logEvent('Initializing Hyperliquid monitor...');
        
        // Attempt to connect to the Hyperliquid agent
        await this.testConnection();
        
        // Start periodic updates
        setInterval(() => this.updateMetrics(), 10000);
    }
    
    /**
     * Set up event listeners for the dashboard
     */
    setupEventListeners() {
        document.getElementById('refresh-hyperliquid').addEventListener('click', () => this.updateMetrics());
        document.getElementById('test-connection').addEventListener('click', () => this.testConnection());
        document.getElementById('retry-connect').addEventListener('click', () => this.reconnect());
        
        // Listen for health updates from the agent
        document.addEventListener('hyperliquid-health-update', (event) => {
            this.updateUIWithHealthData(event.detail);
        });
    }
    
    /**
     * Initialize the latency chart
     */
    initializeLatencyChart() {
        const chartOptions = {
            series: [{
                name: 'API Latency',
                data: this.latencyHistory
            }],
            chart: {
                height: 100,
                type: 'line',
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                },
                animations: {
                    enabled: true,
                    easing: 'linear',
                    dynamicAnimation: {
                        speed: 1000
                    }
                },
                background: 'transparent'
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            colors: ['#10b981'],
            grid: {
                borderColor: '#2d3748',
                strokeDashArray: 4,
                yaxis: {
                    lines: {
                        show: true
                    }
                },
                padding: {
                    left: 10,
                    right: 10
                }
            },
            xaxis: {
                labels: {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
                tooltip: {
                    enabled: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#94a3b8',
                        fontSize: '10px'
                    },
                    formatter: (value) => {
                        return value ? `${value}ms` : '';
                    }
                }
            },
            tooltip: {
                theme: 'dark',
                x: {
                    show: false
                },
                y: {
                    formatter: (value) => {
                        return value ? `${value}ms` : 'No data';
                    }
                }
            },
            legend: {
                show: false
            }
        };
        
        try {
            this.latencyChart = new ApexCharts(document.getElementById('latency-chart-container'), chartOptions);
            this.latencyChart.render();
        } catch (error) {
            console.error('Error initializing latency chart:', error);
        }
    }
    
    /**
     * Update the monitoring metrics
     */
    async updateMetrics() {
        try {
            const response = await fetch('/api/hyperliquid/health');
            const data = await response.json();
            
            this.updateUIWithHealthData(data);
            this.lastCheckTime = new Date();
            
            // Update latency history
            this.latencyHistory.push(data.latency);
            if (this.latencyHistory.length > 20) {
                this.latencyHistory.shift();
            }
            
            // Update error history
            const newErrorPoint = data.errorRate * 100; // Convert to percentage
            this.errorHistory.push(newErrorPoint);
            if (this.errorHistory.length > 30) {
                this.errorHistory.shift();
            }
            
            // Update charts
            if (this.latencyChart) {
                this.latencyChart.updateSeries([{
                    data: this.latencyHistory
                }]);
            }
            
            // Log the update
            this.logEvent(`Health check: Latency ${data.latency}ms, Error rate ${data.errorRate * 100}%`);
            
        } catch (error) {
            console.error('Error updating metrics:', error);
            this.logEvent(`Error updating metrics: ${error.message}`, 'error');
            
            // Update UI to show error
            document.getElementById('hyperliquid-status').className = 'status-indicator status-error';
            document.getElementById('hyperliquid-status').setAttribute('title', 'Connection error');
        }
    }
    
    /**
     * Update UI with health data
     */
    updateUIWithHealthData(data) {
        // Update status indicator
        const statusEl = document.getElementById('hyperliquid-status');
        statusEl.className = 'status-indicator';
        statusEl.classList.add(`status-${data.status}`);
        statusEl.setAttribute('title', `Hyperliquid ${data.status}`);
        
        // Update metrics
        document.getElementById('hyperliquid-latency').innerText = data.latency ? `${data.latency}ms` : '--';
        document.getElementById('hyperliquid-error-rate').innerText = data.errorRate !== undefined ? `${(data.errorRate * 100).toFixed(1)}%` : '--';
        
        // Update classes based on values
        const latencyEl = document.getElementById('hyperliquid-latency');
        latencyEl.className = 'metric-value';
        if (data.latency) {
            if (data.latency < 200) {
                latencyEl.classList.add('metric-success');
            } else if (data.latency < 500) {
                latencyEl.classList.add('metric-warning');
            } else {
                latencyEl.classList.add('metric-danger');
            }
        }
        
        const errorRateEl = document.getElementById('hyperliquid-error-rate');
        errorRateEl.className = 'metric-value';
        if (data.errorRate !== undefined) {
            if (data.errorRate < 0.05) {
                errorRateEl.classList.add('metric-success');
            } else if (data.errorRate < 0.15) {
                errorRateEl.classList.add('metric-warning');
            } else {
                errorRateEl.classList.add('metric-danger');
            }
        }
    }
    
    /**
     * Test the connection to Hyperliquid
     */
    async testConnection() {
        this.logEvent('Testing Hyperliquid connection...');
        
        try {
            const agent = window.hyperliquidAgent;
            const result = await agent.initialize();
            
            if (result.success) {
                this.logEvent(`Connection successful: ${result.message}`);
                return true;
            } else {
                this.logEvent(`Connection failed: ${result.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            this.logEvent(`Connection error: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Attempt to reconnect to Hyperliquid
     */
    async reconnect() {
        this.logEvent('Attempting to reconnect to Hyperliquid...');
        
        try {
            const agent = window.hyperliquidAgent;
            const result = await agent.initialize();
            
            if (result.success) {
                this.logEvent(`Reconnection successful: ${result.message}`);
                await this.updateMetrics();
                return true;
            } else {
                this.logEvent(`Reconnection failed: ${result.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error reconnecting:', error);
            this.logEvent(`Reconnection error: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Log an event to the events log
     */
    logEvent(message, type = 'info') {
        const eventsLog = document.getElementById('hyperliquid-events');
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timeEl = document.createElement('span');
        timeEl.className = 'log-time';
        timeEl.innerText = timeString;
        
        const messageEl = document.createElement('span');
        messageEl.className = `log-message ${type}`;
        messageEl.innerText = message;
        
        logEntry.appendChild(timeEl);
        logEntry.appendChild(messageEl);
        
        eventsLog.appendChild(logEntry);
        
        // Scroll to bottom
        eventsLog.scrollTop = eventsLog.scrollHeight;
        
        // Limit log entries
        while (eventsLog.children.length > 100) {
            eventsLog.removeChild(eventsLog.firstChild);
        }
    }
    
    /**
     * Update the last order status display
     */
    updateLastOrderStatus(order) {
        if (!order) return;
        
        const orderStatusEl = document.getElementById('hyperliquid-last-order');
        orderStatusEl.className = 'metric-value';
        
        switch (order.status) {
            case 'filled':
                orderStatusEl.innerText = 'Filled';
                orderStatusEl.classList.add('metric-success');
                break;
            case 'partially_filled':
                orderStatusEl.innerText = 'Partially Filled';
                orderStatusEl.classList.add('metric-warning');
                break;
            case 'open':
                orderStatusEl.innerText = 'Open';
                orderStatusEl.classList.add('metric-warning');
                break;
            case 'cancelled':
                orderStatusEl.innerText = 'Cancelled';
                orderStatusEl.classList.add('metric-danger');
                break;
            case 'rejected':
                orderStatusEl.innerText = 'Rejected';
                orderStatusEl.classList.add('metric-danger');
                break;
            default:
                orderStatusEl.innerText = order.status;
        }
        
        // Add the order to the history and log it
        this.orderHistory.unshift(order);
        if (this.orderHistory.length > 20) {
            this.orderHistory.pop();
        }
        
        this.logEvent(`Order ${order.id} status: ${order.status}`);
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create the monitor instance
    window.hyperliquidMonitor = new HyperliquidMonitor();
    
    // Add the monitor component to the dashboard
    fetch('/data/components/hyperliquid-monitor.html')
        .then(response => response.text())
        .then(html => {
            // Append to exchange connections or create a new section
            const exchangeSection = document.querySelector('.border.rounded-lg.p-4 h4.font-semibold.mb-3:contains("Exchange Connections")');
            if (exchangeSection) {
                const parent = exchangeSection.closest('.border.rounded-lg.p-4');
                parent.insertAdjacentHTML('afterend', html);
            } else {
                // If exchange section not found, append to the ElizaOS section
                const elizaSection = document.querySelector('#elizaConsole');
                if (elizaSection) {
                    const parent = elizaSection.closest('.border.rounded-lg.p-4');
                    parent.insertAdjacentHTML('afterend', html);
                }
            }
            
            // Initialize after insertion
            window.hyperliquidMonitor.initialize();
        })
        .catch(error => {
            console.error('Error loading Hyperliquid monitor component:', error);
        });
});
