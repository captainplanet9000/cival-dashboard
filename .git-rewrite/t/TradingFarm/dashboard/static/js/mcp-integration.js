/**
 * MCP Integration for Trading Farm Dashboard
 * Handles communication with various MCP servers for multi-chain trading
 */

class MCPIntegration {
    constructor() {
        // MCP server endpoints
        this.mcpServers = {
            neon: {
                endpoint: 'http://localhost:3003',
                enabled: true
            },
            hyperliquid: {
                endpoint: 'http://localhost:3001',
                enabled: true
            },
            arbitrum: {
                endpoint: 'http://localhost:3002',
                enabled: false
            },
            sonic: {
                endpoint: 'http://localhost:3003',
                enabled: false
            },
            solana: {
                endpoint: 'http://localhost:3004',
                enabled: false
            },
            browserbase: {
                endpoint: 'http://localhost:3005',
                enabled: true
            },
            elizaos: {
                endpoint: 'http://localhost:3000',
                enabled: true
            }
        };

        // ElizaOS API endpoint
        this.elizaOSEndpoint = 'http://localhost:3000/api';
        this.defaultAgentId = 'eliza_trading_agent_1';
        
        // ElizaOS Multi-Agent System settings
        this.elizaMultiAgentEnabled = true;
        this.simulationMode = true;

        // Initialize console output
        this.consoleElement = document.getElementById('elizaos-console');
        
        // Command history
        this.commandHistory = [];
        this.commandIndex = -1;
    }

    /**
     * Initialize the MCP integration
     */
    async initialize() {
        // Check health of all MCP servers
        const healthStatus = await this.checkAllServerHealth();
        console.log('MCP server health status:', healthStatus);

        // Load strategies from Neon database
        this.loadStrategies();

        // Initialize ElizaOS command handlers
        this.initializeCommandHandlers();

        // Initialize UI event listeners
        this.initializeEventListeners();

        // Update UI with initial data
        this.updateDashboardData();

        // Get ElizaOS system status
        try {
            const elizaStatus = await this.getElizaSystemStatus();
            if (elizaStatus) {
                console.log('ElizaOS System Status:', elizaStatus);
                this.elizaMultiAgentEnabled = elizaStatus.multi_agent_system?.active || false;
                this.simulationMode = elizaStatus.configuration?.simulation_mode || true;
                
                // Update UI with ElizaOS status
                this.updateElizaOSStatus(elizaStatus);
            }
        } catch (error) {
            console.error('Error getting ElizaOS status:', error);
        }

        // Log initialization
        this.log('> MCPIntegration initialized');
        this.log(`> Connected to ElizaOS ${this.elizaMultiAgentEnabled ? 'Multi-Agent System' : 'Standard Mode'}. Ready for commands.`);
        if (this.simulationMode) {
            this.log('> Running in SIMULATION MODE. No real trades will be executed.');
        }
    }

    /**
     * Check health of all MCP servers
     * @returns {Object} Health status of all servers
     */
    async checkAllServerHealth() {
        const status = {};
        
        for (const [server, config] of Object.entries(this.mcpServers)) {
            if (config.enabled) {
                try {
                    const response = await fetch(`${config.endpoint}/health`);
                    status[server] = response.ok;
                } catch (error) {
                    console.error(`Error checking ${server} health:`, error);
                    status[server] = false;
                }
            } else {
                status[server] = 'disabled';
            }
        }
        
        return status;
    }

    /**
     * Execute a tool on an MCP server
     * @param {string} server - MCP server name
     * @param {string} toolName - Tool name to execute
     * @param {Object} parameters - Tool parameters
     * @returns {Promise<Object>} Tool execution result
     */
    async executeTool(server, toolName, parameters = {}) {
        const serverConfig = this.mcpServers[server];
        
        if (!serverConfig || !serverConfig.enabled) {
            throw new Error(`MCP server ${server} not enabled or not found`);
        }
        
        const response = await fetch(`${serverConfig.endpoint}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: toolName,
                parameters
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP tool execution error: ${errorText}`);
        }
        
        return await response.json();
    }

    /**
     * Load strategies from Neon database
     */
    async loadStrategies() {
        try {
            // Use Neon MCP server to get strategies
            const result = await this.executeTool('neon', 'mcp4_run_sql', {
                databaseName: 'trading_farm',
                sql: 'SELECT * FROM strategies ORDER BY created_at DESC'
            });
            
            // Update UI with strategies
            this.updateStrategyList(result.rows || []);
            
            console.log('Loaded strategies:', result);
        } catch (error) {
            console.error('Error loading strategies:', error);
            this.log('> Error loading strategies from Neon database');
        }
    }

    /**
     * Send command to ElizaOS
     * @param {string} command - Command text
     * @param {Object} parameters - Command parameters
     * @param {string} agentId - Agent ID (optional)
     * @returns {Promise<Object>} Command result
     */
    async sendElizaCommand(command, parameters = {}, agentId = null) {
        try {
            // Use the new multi-agent endpoint
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command,
                    parameters: {
                        ...parameters,
                        agent_id: agentId || this.defaultAgentId
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending ElizaOS command:', error);
            this.log(`> Error sending command to ElizaOS: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get ElizaOS system status
     * @returns {Promise<Object>} System status
     */
    async getElizaSystemStatus() {
        try {
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/system/status`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting ElizaOS system status:', error);
            return null;
        }
    }
    
    /**
     * Get status of a specific agent
     * @param {string} agentId - Agent ID
     * @returns {Promise<Object>} Agent status
     */
    async getAgentStatus(agentId) {
        try {
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/agents/${agentId}/status`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error getting agent status for ${agentId}:`, error);
            return null;
        }
    }
    
    /**
     * Trigger a cross-chain opportunity scan
     * @returns {Promise<Object>} Scan result
     */
    async triggerCrossChainScan() {
        try {
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/cross-chain/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error triggering cross-chain scan:', error);
            return null;
        }
    }
    
    /**
     * Send a message to the agent coordination system
     * @param {string} senderId - Sender ID
     * @param {string} messageType - Message type
     * @param {Object} content - Message content
     * @param {string} recipientId - Recipient ID (optional)
     * @returns {Promise<Object>} Message result
     */
    async sendAgentMessage(senderId, messageType, content, recipientId = null) {
        try {
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/agents/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_id: senderId,
                    message_type: messageType,
                    content,
                    recipient_id: recipientId,
                    priority: 1
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending agent message:', error);
            return null;
        }
    }
    
    /**
     * Update the UI with ElizaOS status
     * @param {Object} status - ElizaOS system status
     */
    updateElizaOSStatus(status) {
        // Update system controls in Control Panel
        const elizaOSToggle = document.querySelector('input[type="checkbox"][data-control="elizaos_integration"]');
        if (elizaOSToggle) {
            elizaOSToggle.checked = true;
        }
        
        // Update agent count in UI if available
        const agentCountElement = document.querySelector('.agent-count');
        if (agentCountElement && status.multi_agent_system) {
            agentCountElement.textContent = status.multi_agent_system.total_agents || 0;
        }
        
        // Update simulation mode indicator
        const simulationModeElement = document.querySelector('.simulation-mode');
        if (simulationModeElement) {
            simulationModeElement.style.display = status.configuration?.simulation_mode ? 'inline-block' : 'none';
        }
    }
    
    /**
     * Initialize command handlers
     */
    initializeCommandHandlers() {
        // Add command input listeners
        const commandInput = document.getElementById('elizaos-command-input');
        const sendButton = document.getElementById('send-command-button');
        
        if (commandInput && sendButton) {
            // Handle send button click
            sendButton.addEventListener('click', () => {
                const command = commandInput.value.trim();
                if (command) {
                    this.processCommand(command);
                    commandInput.value = '';
                }
            });
            
            // Handle Enter key
            commandInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    const command = commandInput.value.trim();
                    if (command) {
                        this.processCommand(command);
                        commandInput.value = '';
                    }
                    event.preventDefault();
                } else if (event.key === 'ArrowUp') {
                    // Navigate command history up
                    if (this.commandHistory.length > 0 && this.commandIndex < this.commandHistory.length - 1) {
                        this.commandIndex++;
                        commandInput.value = this.commandHistory[this.commandHistory.length - 1 - this.commandIndex];
                    }
                    event.preventDefault();
                } else if (event.key === 'ArrowDown') {
                    // Navigate command history down
                    if (this.commandIndex > 0) {
                        this.commandIndex--;
                        commandInput.value = this.commandHistory[this.commandHistory.length - 1 - this.commandIndex];
                    } else if (this.commandIndex === 0) {
                        this.commandIndex = -1;
                        commandInput.value = '';
                    }
                    event.preventDefault();
                }
            });
        }
        
        // Quick action buttons
        const marketAnalysisBtn = document.getElementById('market-analysis-btn');
        const strategyOptimizationBtn = document.getElementById('strategy-optimization-btn');
        const riskAssessmentBtn = document.getElementById('risk-assessment-btn');
        const crossChainBtn = document.getElementById('cross-chain-btn');
        const systemStatusBtn = document.getElementById('system-status-btn');
        
        if (marketAnalysisBtn) {
            marketAnalysisBtn.addEventListener('click', () => {
                this.processCommand('analyze market ETH 4h');
            });
        }
        
        if (strategyOptimizationBtn) {
            strategyOptimizationBtn.addEventListener('click', () => {
                this.processCommand('optimize strategy "Mean Reversion ETH"');
            });
        }
        
        if (riskAssessmentBtn) {
            riskAssessmentBtn.addEventListener('click', () => {
                this.processCommand('assess portfolio risk');
            });
        }
        
        if (crossChainBtn) {
            crossChainBtn.addEventListener('click', () => {
                this.processCommand('find cross-chain opportunities');
            });
        }
        
        if (systemStatusBtn) {
            systemStatusBtn.addEventListener('click', () => {
                this.processCommand('system status');
            });
        }
    }
    
    /**
     * Initialize UI event listeners
     */
    initializeEventListeners() {
        // Trading form
        const buyButton = document.querySelector('.btn-buy');
        const sellButton = document.querySelector('.btn-sell');
        const assetSelect = document.querySelector('.form-input[placeholder="ETH"]');
        const sizeInput = document.querySelector('.form-input[placeholder="0.1"]');
        
        if (buyButton) {
            buyButton.addEventListener('click', () => {
                const asset = assetSelect?.value || 'ETH';
                const size = parseFloat(sizeInput?.value || '0.1');
                this.createOrder(asset, size, true);
            });
        }
        
        if (sellButton) {
            sellButton.addEventListener('click', () => {
                const asset = assetSelect?.value || 'ETH';
                const size = parseFloat(sizeInput?.value || '0.1');
                this.createOrder(asset, size, false);
            });
        }
        
        // System control toggles
        const autoTradingToggle = document.querySelector('input[type="checkbox"][data-control="auto_trading"]');
        if (autoTradingToggle) {
            autoTradingToggle.addEventListener('change', (event) => {
                const enabled = event.target.checked;
                this.setSystemControl('auto_trading', enabled);
            });
        }
        
        // Agent card buttons
        const agentCards = document.querySelectorAll('.agent-card:not(.empty)');
        agentCards.forEach(card => {
            const agentId = card.getAttribute('data-agent-id');
            const statusButton = card.querySelector('.btn-status');
            const messageButton = card.querySelector('.btn-message');
            
            if (statusButton) {
                statusButton.addEventListener('click', () => {
                    this.getAgentDetails(agentId);
                });
            }
            
            if (messageButton) {
                messageButton.addEventListener('click', () => {
                    this.openAgentMessageModal(agentId);
                });
            }
        });
        
        // Add agent button
        const addAgentButton = document.querySelector('.agent-card.empty');
        if (addAgentButton) {
            addAgentButton.addEventListener('click', () => {
                this.openAddAgentModal();
            });
        }
        
        // Toggle fullscreen button for ElizaOS panel
        const fullscreenButton = document.querySelector('#elizaos-command-panel .btn-icon[title="Toggle fullscreen"]');
        if (fullscreenButton) {
            fullscreenButton.addEventListener('click', () => {
                this.toggleElizaOSFullscreen();
            });
        }
    }

    /**
     * Process a command from the user
     * @param {string} command - Command text
     */
    async processCommand(command) {
        // Add to command history
        this.commandHistory.push(command);
        if (this.commandHistory.length > 50) {
            this.commandHistory.shift();
        }
        this.commandIndex = -1;
        
        // Log the command
        this.log(`> ${command}`);
        
        // Special handling for trade commands
        if (command.match(/buy|sell|long|short/i) && command.match(/eth|btc|sol|arb/i)) {
            this.handleTradeCommand(command);
            return;
        }
        
        // Special handling for strategy commands
        if (command.match(/create strategy|add strategy|new strategy/i)) {
            this.handleStrategyCommand(command);
            return;
        }
        
        // Special handling for cross-chain commands
        if (command.match(/cross[- ]chain|arbitrage|opportunities/i)) {
            this.handleCrossChainCommand(command);
            return;
        }
        
        // Special handling for system status commands
        if (command.match(/system status|health|agents/i)) {
            this.handleSystemStatusCommand(command);
            return;
        }
        
        // General command handling through ElizaOS
        try {
            const response = await this.sendElizaCommand(command);
            
            if (response) {
                // Format the response for display
                this.displayElizaResponse(response);
            } else {
                // Simulate a response for demo purposes
                this.simulateElizaResponse(command);
            }
        } catch (error) {
            console.error('Error processing command:', error);
            this.log(`> Error: ${error.message}`);
        }
    }
    
    /**
     * Display an ElizaOS response in the console
     * @param {Object} response - ElizaOS response object
     */
    displayElizaResponse(response) {
        if (!response) return;
        
        // Format and display based on response type
        if (response.status === 'error') {
            this.log(`> Error: ${response.message}`);
            return;
        }
        
        // Check for message and data
        if (response.message) {
            this.log(`> ${response.message}`);
        }
        
        // Format data based on message_type
        if (response.data) {
            const data = response.data;
            
            switch (response.message_type) {
                case 'market_analysis':
                    this.log(`> Market: ${data.market} (${data.timeframe}) - Trend: ${data.trend.toUpperCase()} (${(data.confidence * 100).toFixed(1)}% confidence)`);
                    this.log(`> Indicators: RSI ${data.indicators.rsi}, MACD ${data.indicators.macd}`);
                    this.log(`> Support: ${data.indicators.support}, Resistance: ${data.indicators.resistance}`);
                    this.log(`> Recommendation: ${data.recommendation.toUpperCase()}`);
                    
                    if (data.analysis) {
                        this.log(`> Analysis: ${data.analysis}`);
                    }
                    break;
                    
                case 'trade_execution':
                    this.log(`> ${data.status.toUpperCase()}: ${data.side} ${data.size} ${data.market} @ ${data.execution_price}`);
                    this.log(`> Total value: $${data.total_value.toFixed(2)}, Fees: $${data.fees.toFixed(2)}`);
                    if (data.risk_notes && data.risk_notes.length > 0) {
                        this.log(`> Risk notes: ${data.risk_notes.join(', ')}`);
                    }
                    break;
                    
                case 'risk_assessment':
                    if (data.portfolio_value) {
                        this.log(`> Portfolio value: ${data.portfolio_value}`);
                        this.log(`> Risk metrics: Max drawdown ${data.risk_metrics.max_drawdown}, VaR: ${data.risk_metrics.var_95}`);
                        
                        if (data.risk_flags) {
                            const flags = data.risk_flags.filter(f => f);
                            if (flags.length > 0) {
                                this.log(`> Risk flags: ${flags.join(', ')}`);
                            }
                        }
                        
                        if (data.recommendations) {
                            const recs = data.recommendations.filter(r => r);
                            if (recs.length > 0) {
                                this.log(`> Recommendations:`);
                                recs.forEach(rec => this.log(`>   - ${rec}`));
                            }
                        }
                    } else if (data.market) {
                        this.log(`> ${data.market} position: ${data.position_size} (${data.position_value})`);
                        this.log(`> Risk metrics: Position size ${data.risk_metrics.position_size_percent}, Liquidation price: ${data.risk_metrics.liquidation_price}`);
                        
                        if (data.recommendations) {
                            this.log(`> Recommendations:`);
                            data.recommendations.forEach(rec => this.log(`>   - ${rec}`));
                        }
                    }
                    break;
                    
                case 'strategy_optimization':
                    this.log(`> Strategy: ${data.strategy_name}`);
                    this.log(`> Current metrics: Sharpe ${data.current_metrics.sharpe_ratio}, Win rate ${data.current_metrics.win_rate}%`);
                    this.log(`> Optimized metrics: Sharpe ${data.optimized_metrics.sharpe_ratio} (${data.improvement.sharpe_ratio}), Win rate ${data.optimized_metrics.win_rate}% (${data.improvement.win_rate})`);
                    this.log(`> Optimized parameters:`);
                    for (const [param, value] of Object.entries(data.optimized_parameters)) {
                        this.log(`>   - ${param}: ${value}`);
                    }
                    break;
                    
                case 'system_status':
                    this.log(`> ElizaOS version: ${data.elizaos_version}`);
                    this.log(`> Agents: ${data.agent_system.total_agents} total`);
                    
                    this.log(`> Connected chains:`);
                    for (const [chain, info] of Object.entries(data.connected_chains)) {
                        this.log(`>   - ${chain}: ${info.status} (${info.latency_ms}ms)`);
                    }
                    
                    this.log(`> System load: ${data.system_load}, Uptime: ${data.uptime}`);
                    break;
                    
                case 'cross_chain_opportunities':
                    this.log(`> Found ${data.opportunities.length} cross-chain opportunities`);
                    
                    data.opportunities.forEach((opp, i) => {
                        this.log(`> Opportunity ${i+1}: ${opp.asset}`);
                        this.log(`>   - ${opp.source_chain} → ${opp.target_chain}`);
                        this.log(`>   - Price diff: ${opp.price_difference_percent}`);
                        this.log(`>   - Est. profit: ${opp.estimated_profit}, Risk: ${opp.risk_level}`);
                        this.log(`>   - Recommendation: ${opp.trade_size_recommendation}`);
                    });
                    break;
                    
                case 'general_response':
                    if (typeof data.response === 'string') {
                        this.log(`> ${data.response}`);
                    } else {
                        this.log(`> ${JSON.stringify(data.response)}`);
                    }
                    break;
                    
                default:
                    // Generic display of data
                    this.log(`> ${JSON.stringify(data)}`);
            }
        }
        
        // Show simulation mode reminder if applicable
        if (response.simulation_mode) {
            this.log('> (SIMULATION MODE - No real trades executed)');
        }
    }
    
    /**
     * Handle a trade-related command
     * @param {string} command - Trade command
     */
    async handleTradeCommand(command) {
        this.log('> Processing trade command...');
        
        // Parse the command
        const isBuy = command.match(/buy|long/i) !== null;
        
        // Extract coin
        let coin = 'ETH';  // Default
        const coinMatch = command.match(/eth|btc|sol|arb/i);
        if (coinMatch) {
            coin = coinMatch[0].toUpperCase();
        }
        
        // Extract size
        let size = 0.1;  // Default
        const sizeMatch = command.match(/(\d+(\.\d+)?)/);
        if (sizeMatch) {
            size = parseFloat(sizeMatch[0]);
        }
        
        // Create the order
        this.createOrder(coin, size, isBuy);
    }
    
    /**
     * Handle a cross-chain command
     * @param {string} command - Cross-chain command
     */
    async handleCrossChainCommand(command) {
        this.log('> Scanning for cross-chain opportunities...');
        
        try {
            // Trigger a cross-chain scan
            const scanResult = await this.triggerCrossChainScan();
            
            if (scanResult && scanResult.status === 'success') {
                this.log(`> ${scanResult.message}`);
                
                // Now get the opportunities from ElizaOS
                const response = await this.sendElizaCommand('find cross-chain opportunities');
                
                if (response) {
                    this.displayElizaResponse(response);
                } else {
                    this.log('> No cross-chain opportunities found at this time.');
                }
            } else {
                this.log('> Error triggering cross-chain scan.');
            }
        } catch (error) {
            console.error('Error handling cross-chain command:', error);
            this.log(`> Error: ${error.message}`);
        }
    }
    
    /**
     * Handle a system status command
     * @param {string} command - System status command
     */
    async handleSystemStatusCommand(command) {
        this.log('> Fetching ElizaOS system status...');
        
        try {
            const status = await this.getElizaSystemStatus();
            
            if (status && status.status === 'success') {
                const system = status.multi_agent_system;
                const config = status.configuration;
                
                this.log(`> ElizaOS version: ${status.elizaos_version}`);
                this.log(`> Multi-agent system: ${system.active ? 'ACTIVE' : 'INACTIVE'}`);
                this.log(`> Agents: ${system.total_agents} total`);
                
                // Show agents by chain
                this.log(`> Agents by chain:`);
                for (const [chain, count] of Object.entries(system.agents_by_chain)) {
                    this.log(`>   - ${chain}: ${count}`);
                }
                
                // Show agents by specialization
                this.log(`> Agents by specialization:`);
                for (const [spec, count] of Object.entries(system.agents_by_specialization)) {
                    this.log(`>   - ${spec}: ${count}`);
                }
                
                this.log(`> Active messages: ${system.active_messages}`);
                this.log(`> Configuration:`);
                this.log(`>   - Max agents per chain: ${config.max_agents_per_chain}`);
                this.log(`>   - Cross-chain enabled: ${config.cross_chain_enabled}`);
                this.log(`>   - Memory enabled: ${config.memory_enabled}`);
                this.log(`>   - Simulation mode: ${config.simulation_mode}`);
            } else {
                this.log('> Error fetching system status.');
            }
        } catch (error) {
            console.error('Error handling system status command:', error);
            this.log(`> Error: ${error.message}`);
        }
    }

    /**
     * Simulate an ElizaOS response for demo purposes
     * @param {string} command - Original command
     */
    simulateElizaResponse(command) {
        setTimeout(() => {
            let response = '';
            
            if (command.match(/analyze market|market analysis/i)) {
                response = '> Market analysis: ETH showing bullish trend on 4h timeframe. RSI: 62, MACD: positive crossover, Support: $3210, Resistance: $3320';
            } else if (command.match(/optimize strategy|strategy optimization/i)) {
                response = '> Strategy optimization in progress. Current Sharpe: 1.8, Win rate: 58%. Suggested parameters: entry threshold: 0.4, exit threshold: 0.7';
            } else if (command.match(/assess risk|risk assessment|portfolio risk/i)) {
                response = '> Portfolio analysis: Current drawdown: 2.3%, VaR: $425, Position concentration in ETH: 85%. Recommendation: Consider diversifying with BTC positions.';
            } else if (command.match(/forecast|prediction|trend/i)) {
                response = '> Market forecast: ETH likely to test $3320 resistance within 24h. 65% probability of breakout based on order flow analysis and technical indicators.';
            } else if (command.match(/help|commands|what can you do/i)) {
                response = '> Available commands: analyze market [coin] [timeframe], optimize strategy [name], assess portfolio risk, forecast [coin], create order [buy/sell] [coin] [amount]';
            } else {
                response = '> Processing command: ' + command + '...';
            }
            
            this.log(response);
        }, 800);
    }

    /**
     * Get agent details and display in console
     * @param {string} agentId - Agent ID
     */
    async getAgentDetails(agentId) {
        this.log(`> Fetching status for agent: ${agentId}...`);
        
        try {
            const status = await this.getAgentStatus(agentId);
            
            if (status) {
                this.log(`> Agent: ${status.name} (${agentId})`);
                this.log(`> Status: ${status.status} - Uptime: ${status.uptime}`);
                this.log(`> Specialization: ${status.specialization}`);
                this.log(`> Assigned chain: ${status.chain}`);
                
                if (status.metrics) {
                    this.log(`> Performance metrics:`);
                    this.log(`>   - Commands processed: ${status.metrics.commands_processed}`);
                    this.log(`>   - Messages sent: ${status.metrics.messages_sent}`);
                    this.log(`>   - Messages received: ${status.metrics.messages_received}`);
                    
                    if (status.metrics.trades) {
                        this.log(`>   - Trades executed: ${status.metrics.trades.total}`);
                        this.log(`>   - Win rate: ${status.metrics.trades.win_rate}%`);
                    }
                }
                
                if (status.current_task) {
                    this.log(`> Current task: ${status.current_task}`);
                }
            } else {
                this.log(`> Unable to fetch status for agent: ${agentId}`);
            }
        } catch (error) {
            console.error(`Error getting agent details for ${agentId}:`, error);
            this.log(`> Error: ${error.message}`);
        }
    }
    
    /**
     * Open a modal for sending messages to an agent
     * @param {string} agentId - Agent ID
     */
    openAgentMessageModal(agentId) {
        // Create modal element if it doesn't exist
        let modal = document.getElementById('agent-message-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'agent-message-modal';
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h4>Send Message to Agent</h4>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="agent-message-type">Message Type</label>
                            <select id="agent-message-type" class="form-select">
                                <option value="command">Command</option>
                                <option value="info">Information</option>
                                <option value="task">Task Assignment</option>
                                <option value="status_request">Status Request</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="agent-message-content">Message Content</label>
                            <textarea id="agent-message-content" class="form-textarea" rows="4" placeholder="Enter message content..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="agent-message-priority">Priority</label>
                            <select id="agent-message-priority" class="form-select">
                                <option value="1">Low</option>
                                <option value="2" selected>Normal</option>
                                <option value="3">High</option>
                                <option value="4">Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="send-agent-message-btn" class="btn btn-primary">Send Message</button>
                        <button class="btn btn-secondary close-modal">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            const closeButtons = modal.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            });
            
            // Close modal when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Send message button
            const sendButton = modal.querySelector('#send-agent-message-btn');
            sendButton.addEventListener('click', () => {
                const messageType = document.getElementById('agent-message-type').value;
                const content = document.getElementById('agent-message-content').value;
                const priority = parseInt(document.getElementById('agent-message-priority').value);
                
                if (content) {
                    this.sendMessageToAgent(agentId, messageType, content, priority);
                    modal.style.display = 'none';
                }
            });
        }
        
        // Update modal for this agent
        const agentCard = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
        const agentName = agentCard ? agentCard.querySelector('.agent-name').textContent : agentId;
        
        const modalHeader = modal.querySelector('.modal-header h4');
        modalHeader.textContent = `Send Message to ${agentName}`;
        
        // Show modal
        modal.style.display = 'block';
        
        // Focus textarea
        setTimeout(() => {
            modal.querySelector('#agent-message-content').focus();
        }, 100);
    }
    
    /**
     * Send a message to an agent
     * @param {string} agentId - Agent ID
     * @param {string} messageType - Message type
     * @param {string} content - Message content
     * @param {number} priority - Message priority
     */
    async sendMessageToAgent(agentId, messageType, content, priority = 2) {
        this.log(`> Sending ${messageType} message to ${agentId}...`);
        
        try {
            const result = await this.sendAgentMessage(
                'dashboard_user',  // Sender ID
                messageType,
                content,
                agentId,  // Recipient ID
                priority
            );
            
            if (result && result.status === 'success') {
                this.log(`> Message sent successfully to ${agentId}`);
                
                // If this is a command, process response
                if (messageType === 'command' && result.response) {
                    this.displayElizaResponse(result.response);
                }
            } else {
                this.log(`> Failed to send message to ${agentId}: ${result?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`Error sending message to ${agentId}:`, error);
            this.log(`> Error: ${error.message}`);
        }
    }
    
    /**
     * Open modal for adding a new agent
     */
    openAddAgentModal() {
        // Create modal element if it doesn't exist
        let modal = document.getElementById('add-agent-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'add-agent-modal';
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h4>Add New Agent</h4>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="new-agent-name">Agent Name</label>
                            <input type="text" id="new-agent-name" class="form-input" placeholder="Enter agent name...">
                        </div>
                        <div class="form-group">
                            <label for="new-agent-chain">Blockchain</label>
                            <select id="new-agent-chain" class="form-select">
                                <option value="ethereum">Ethereum</option>
                                <option value="solana">Solana</option>
                                <option value="hyperliquid">Hyperliquid</option>
                                <option value="arbitrum">Arbitrum</option>
                                <option value="sui">Sui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="new-agent-specialization">Specialization</label>
                            <select id="new-agent-specialization" class="form-select">
                                <option value="market_analysis">Market Analysis</option>
                                <option value="trade_execution">Trade Execution</option>
                                <option value="risk_management">Risk Management</option>
                                <option value="arbitrage">Arbitrage</option>
                                <option value="strategy_optimization">Strategy Optimization</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="new-agent-model">AI Model</label>
                            <select id="new-agent-model" class="form-select">
                                <option value="gpt-4">GPT-4</option>
                                <option value="claude-3">Claude 3</option>
                                <option value="local-llm">Local LLM</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="create-agent-btn" class="btn btn-primary">Create Agent</button>
                        <button class="btn btn-secondary close-modal">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            const closeButtons = modal.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            });
            
            // Close modal when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Create agent button
            const createButton = modal.querySelector('#create-agent-btn');
            createButton.addEventListener('click', () => {
                const name = document.getElementById('new-agent-name').value;
                const chain = document.getElementById('new-agent-chain').value;
                const specialization = document.getElementById('new-agent-specialization').value;
                const model = document.getElementById('new-agent-model').value;
                
                if (name && chain && specialization) {
                    this.createNewAgent(name, chain, specialization, model);
                    modal.style.display = 'none';
                }
            });
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Focus input
        setTimeout(() => {
            modal.querySelector('#new-agent-name').focus();
        }, 100);
    }
    
    /**
     * Create a new agent
     * @param {string} name - Agent name
     * @param {string} chain - Blockchain
     * @param {string} specialization - Agent specialization
     * @param {string} model - AI model
     */
    async createNewAgent(name, chain, specialization, model) {
        this.log(`> Creating new ${specialization} agent for ${chain}...`);
        
        try {
            const response = await fetch(`${this.mcpServers.elizaos.endpoint}/elizaos/agents/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    chain,
                    specialization,
                    model
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElizaOS API error: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result && result.status === 'success') {
                this.log(`> Agent created successfully: ${result.agent_id}`);
                
                // Add agent to UI
                this.addAgentToUI(result.agent_id, name, chain, specialization);
                
                // Update agent count
                const agentCountElement = document.querySelector('.agent-count');
                if (agentCountElement) {
                    const currentCount = parseInt(agentCountElement.textContent);
                    agentCountElement.textContent = (currentCount + 1).toString();
                }
            } else {
                this.log(`> Failed to create agent: ${result?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating agent:', error);
            this.log(`> Error: ${error.message}`);
        }
    }
    
    /**
     * Add a new agent to the UI
     * @param {string} agentId - Agent ID
     * @param {string} name - Agent name
     * @param {string} chain - Blockchain
     * @param {string} specialization - Agent specialization
     */
    addAgentToUI(agentId, name, chain, specialization) {
        const agentGrid = document.querySelector('.agent-grid');
        if (!agentGrid) return;
        
        // Create agent card
        const agentCard = document.createElement('div');
        agentCard.className = 'agent-card';
        agentCard.setAttribute('data-agent-id', agentId);
        
        agentCard.innerHTML = `
            <div class="agent-status active"></div>
            <div class="agent-name">${name}</div>
            <div class="agent-chain">${chain.charAt(0).toUpperCase() + chain.slice(1)}</div>
            <div class="agent-actions">
                <button class="btn-icon btn-message" title="Send message"><i class="fa-solid fa-message"></i></button>
                <button class="btn-icon btn-status" title="Get status"><i class="fa-solid fa-info-circle"></i></button>
            </div>
        `;
        
        // Add event listeners
        const statusButton = agentCard.querySelector('.btn-status');
        const messageButton = agentCard.querySelector('.btn-message');
        
        if (statusButton) {
            statusButton.addEventListener('click', () => {
                this.getAgentDetails(agentId);
            });
        }
        
        if (messageButton) {
            messageButton.addEventListener('click', () => {
                this.openAgentMessageModal(agentId);
            });
        }
        
        // Insert before the empty card
        const emptyCard = agentGrid.querySelector('.agent-card.empty');
        if (emptyCard) {
            agentGrid.insertBefore(agentCard, emptyCard);
        } else {
            agentGrid.appendChild(agentCard);
        }
    }
    
    /**
     * Toggle fullscreen mode for ElizaOS panel
     */
    toggleElizaOSFullscreen() {
        const panel = document.getElementById('elizaos-command-panel');
        if (!panel) return;
        
        panel.classList.toggle('fullscreen');
        
        if (panel.classList.contains('fullscreen')) {
            panel.style.position = 'fixed';
            panel.style.top = '0';
            panel.style.left = '0';
            panel.style.width = '100%';
            panel.style.height = '100%';
            panel.style.zIndex = '1000';
            panel.style.margin = '0';
            panel.style.padding = '20px';
            panel.style.boxSizing = 'border-box';
            panel.style.overflow = 'auto';
            
            const consoleElement = document.getElementById('elizaos-console');
            if (consoleElement) {
                consoleElement.style.height = 'calc(100vh - 300px)';
            }
        } else {
            panel.style.position = '';
            panel.style.top = '';
            panel.style.left = '';
            panel.style.width = '';
            panel.style.height = '';
            panel.style.zIndex = '';
            panel.style.margin = '';
            panel.style.padding = '';
            panel.style.boxSizing = '';
            panel.style.overflow = '';
            
            const consoleElement = document.getElementById('elizaos-console');
            if (consoleElement) {
                consoleElement.style.height = '300px';
            }
        }
        
        // Update button icon
        const button = panel.querySelector('.btn-icon[title="Toggle fullscreen"]');
        if (button) {
            const icon = button.querySelector('i');
            if (icon) {
                if (panel.classList.contains('fullscreen')) {
                    icon.className = 'fa-solid fa-compress';
                    button.setAttribute('title', 'Exit fullscreen');
                } else {
                    icon.className = 'fa-solid fa-expand';
                    button.setAttribute('title', 'Toggle fullscreen');
                }
            }
        }
    }
}

// Initialize the MCP integration when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const integration = new MCPIntegration();
    integration.initialize().catch(error => {
        console.error('Error initializing MCP integration:', error);
    });
    
    // Make available globally
    window.mcpIntegration = integration;
});
